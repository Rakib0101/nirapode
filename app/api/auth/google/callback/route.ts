import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { rememberAccount } from "@/lib/remembered-account";
import { resetPinLockout } from "@/lib/pin-login";
import { POST_LOGIN_PATH } from "@/lib/auth-redirects";
import { issueMobileToken } from "@/lib/mobile-session";
import { attachReferralIfNeeded } from "@/lib/commission";
import { REFERRAL_COOKIE_NAME } from "@/lib/referral-constants";
import { notifyAdmin } from "@/lib/notifications";

// See isSafeMobileRedirect in ../route.ts — re-checked here too since this is
// the boundary that actually hands out a Bearer token. Only an app-scheme or
// Expo-Go dev-client URI is allowed, never http(s), so this can't be abused
// as an open redirect to exfiltrate a freshly-issued token to a public server.
function isSafeMobileRedirect(uri: string | null): uri is string {
  if (!uri) return false;
  return /^nirapodemobileapp:\/\//.test(uri) || /^exp:\/\//.test(uri);
}

// Google delivers this callback TWICE on the mobile flow — confirmed in
// production logs, consistently 0.6-0.9s apart. An authorization code is
// single-use, so the first delivery redeems it and the second comes back
// `invalid_grant`, which turned into a generic "google_failed" that landed in
// the app *after* the good result and overwrote it.
//
// Remembering the outcome per code makes the second delivery replay the first
// answer instead of destroying it. Scoped to the mobile flow on purpose: the
// website's success path also sets session cookies, and replaying a bare URL
// would hand back a redirect with no session attached.
const recentMobileResults = new Map<string, { url: string; at: number }>();
const EXCHANGE_MEMORY_MS = 2 * 60 * 1000;

function rememberMobileResult(code: string, url: string): void {
  const now = Date.now();
  for (const [key, value] of recentMobileResults) {
    if (now - value.at > EXCHANGE_MEMORY_MS) recentMobileResults.delete(key);
  }
  recentMobileResults.set(code, { url, at: now });
}

function recallMobileResult(code: string): string | null {
  const hit = recentMobileResults.get(code);
  if (!hit) return null;
  if (Date.now() - hit.at > EXCHANGE_MEMORY_MS) {
    recentMobileResults.delete(code);
    return null;
  }
  return hit.url;
}

export async function GET(req: NextRequest) {
  let base = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (base) {
    base = base.replace(/\/+$/, "");
  }
  if (!base) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    base = host ? `${proto}://${host}` : "http://localhost:3000";
  }

  // Google echoes back whatever we sent as `state` untouched — that's how the
  // mobile app's deep-link redirect round-trips through a flow it has no
  // other way to carry state through (no cookies).
  const code = req.nextUrl.searchParams.get("code");
  const rawMobileRedirect = req.nextUrl.searchParams.get("state");
  const mobileRedirect = isSafeMobileRedirect(rawMobileRedirect) ? rawMobileRedirect : null;

  function fail(error: string): NextResponse {
    if (mobileRedirect) {
      const url = `${mobileRedirect}?error=${encodeURIComponent(error)}`;
      if (code) rememberMobileResult(code, url);
      return NextResponse.redirect(url);
    }
    return NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  }

  if (!code) return fail("google_cancelled");

  // Second delivery of a code we already handled: replay, don't re-exchange.
  if (mobileRedirect) {
    const replayed = recallMobileResult(code);
    if (replayed) return NextResponse.redirect(replayed);
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${base}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    // Previously discarded, which left "google_failed" with no way to tell a
    // replayed code from a misconfigured client.
    console.error(
      "[google] token exchange failed:",
      JSON.stringify({
        error: tokens.error,
        description: tokens.error_description,
        redirectUri: `${base}/api/auth/google/callback`,
        isMobile: Boolean(mobileRedirect),
      })
    );
    return fail("google_failed");
  }

  // Get Google user info
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileRes.json();
  const { id: googleId, email, name, picture } = profile;

  if (!email) return fail("google_no_email");

  // Find by googleId first, then fall back to email (link accounts)
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  let isNewUser = false;

  if (!user) {
    // New user via Google — create immediately (no OTP needed)
    isNewUser = true;
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName: name ?? email.split("@")[0],
          email,
          googleId,
          profilePhoto: picture ?? null,
          isVerified: true,
        },
      });
      await tx.wallet.create({ data: { userId: created.id } });
      return created;
    });
  } else if (!user.googleId) {
    // Existing email account — link Google to it
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId, ...(picture && !user.profilePhoto ? { profilePhoto: picture } : {}) },
    });
  }

  if (!user.isActive) return fail("banned");

  const refCode = req.cookies.get(REFERRAL_COOKIE_NAME)?.value;
  if (refCode) await attachReferralIfNeeded(user.id, refCode);

  if (isNewUser) {
    await notifyAdmin({
      subject: `New user signup — ${user.fullName}`,
      heading: "New User Signup",
      lines: [
        { label: "Name", value: user.fullName },
        { label: "Email", value: user.email },
        { label: "Via", value: "Google" },
      ],
      actionPath: "/admin/users",
    });
  }

  if (mobileRedirect) {
    await resetPinLockout(user.id);
    const token = await issueMobileToken({ userId: user.id, role: user.role, email: user.email, fullName: user.fullName });
    const mobileUser = { id: user.id, email: user.email, fullName: user.fullName, role: user.role, hasPin: Boolean(user.pinHash) };
    const url = `${mobileRedirect}?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(mobileUser))}`;
    // The whole point: the duplicate delivery replays this instead of failing.
    rememberMobileResult(code, url);
    return NextResponse.redirect(url);
  }

  await createSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    hasPin: Boolean(user.pinHash),
  });
  // This browser is now "their" device, so day-to-day sign-in here becomes the
  // PIN screen. Google proves identity, so it also releases a PIN lockout.
  await rememberAccount({ email: user.email, fullName: user.fullName });
  await resetPinLockout(user.id);

  // Check if admin has enabled/disabled prompting Google users to set a PIN
  let shouldPromptPin = !user.pinHash;
  if (shouldPromptPin) {
    try {
      const pinSetting = await prisma.siteSetting.findUnique({
        where: { key: "google_pin_prompt_enabled" },
      });
      if (pinSetting?.value === "false") {
        shouldPromptPin = false;
      }
    } catch {
      // Keep default behavior if setting lookup fails
    }
  }

  const targetPath = shouldPromptPin ? "/set-pin" : POST_LOGIN_PATH;
  const response = NextResponse.redirect(new URL(targetPath, req.url));
  if (refCode) response.cookies.delete(REFERRAL_COOKIE_NAME);
  return response;
}
