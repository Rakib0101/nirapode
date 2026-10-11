import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { attachReferralIfNeeded } from "@/lib/commission";
import { REFERRAL_COOKIE_NAME } from "@/lib/referral-constants";
import { notifyAdmin } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=google_cancelled", req.url));
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
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }

  // Get Google user info
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileRes.json();
  const { id: googleId, email, name, picture } = profile;

  if (!email) {
    return NextResponse.redirect(new URL("/login?error=google_no_email", req.url));
  }

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

  if (!user.isActive) {
    return NextResponse.redirect(new URL("/login?error=banned", req.url));
  }

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

  await createSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    hasPin: Boolean(user.pinHash),
  });

  // Prompt Google users who don't have a 4-digit PIN set to create one
  const targetPath = user.pinHash ? "/dashboard" : "/set-pin";
  const response = NextResponse.redirect(new URL(targetPath, req.url));
  if (refCode) response.cookies.delete(REFERRAL_COOKIE_NAME);
  return response;
}
