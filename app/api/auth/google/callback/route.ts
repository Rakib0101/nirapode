import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
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
  const rawMobileRedirect = req.nextUrl.searchParams.get("state");
  const mobileRedirect = isSafeMobileRedirect(rawMobileRedirect) ? rawMobileRedirect : null;

  function fail(error: string): NextResponse {
    if (mobileRedirect) return NextResponse.redirect(`${mobileRedirect}?error=${encodeURIComponent(error)}`);
    return NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return fail("google_cancelled");

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
  if (!tokens.access_token) return fail("google_failed");

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
    const token = await issueMobileToken({ userId: user.id, role: user.role, email: user.email, fullName: user.fullName });
    const mobileUser = { id: user.id, email: user.email, fullName: user.fullName, role: user.role, hasPin: Boolean(user.pinHash) };
    const url = `${mobileRedirect}?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(mobileUser))}`;
    return NextResponse.redirect(url);
  }

  await createSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    hasPin: Boolean(user.pinHash),
  });

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

  const targetPath = shouldPromptPin ? "/set-pin" : "/dashboard";
  const response = NextResponse.redirect(new URL(targetPath, req.url));
  if (refCode) response.cookies.delete(REFERRAL_COOKIE_NAME);
  return response;
}
