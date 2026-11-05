import { prisma } from "@/lib/prisma";
import { attachReferralIfNeeded } from "@/lib/commission";
import { notifyAdmin } from "@/lib/notifications";
import { issueMobileToken } from "@/lib/mobile-session";

// Mirrors app/actions/auth.ts verifyOtpAction. The web version attaches the
// referral code from a cookie set when the user visited /register?ref=CODE;
// mobile has no equivalent cookie, so the app passes the same code straight
// through in the request body if it captured one from a deep link.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email as string | undefined;
    const otp = body?.otp as string | undefined;
    const isForgot = body?.type === "FORGOT_PASSWORD";
    const referralCode = body?.referralCode as string | undefined;

    if (!email || !otp) return Response.json({ error: "Invalid request." }, { status: 400 });

    if (isForgot) {
      const record = await prisma.otpToken.findFirst({
        where: { email, token: otp, type: "FORGOT_PASSWORD", usedAt: null },
      });
      if (!record) return Response.json({ error: "Invalid OTP. Please check and try again." }, { status: 400 });
      if (record.expiresAt < new Date()) return Response.json({ error: "OTP expired. Request a new one." }, { status: 400 });

      return Response.json({ success: true });
    }

    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending || pending.otp !== otp) {
      return Response.json({ error: "Invalid OTP. Please check and try again." }, { status: 400 });
    }
    if (pending.expiresAt < new Date()) {
      return Response.json({ error: "OTP expired. Request a new one." }, { status: 400 });
    }

    const conflict = await prisma.user.findUnique({ where: { email } });
    if (conflict) {
      await prisma.pendingRegistration.delete({ where: { email } });
      return Response.json({ error: "This email is already registered. Please log in." }, { status: 409 });
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName: pending.fullName,
          email: pending.email,
          phone: pending.phone,
          passwordHash: pending.passwordHash,
          isVerified: true,
        },
      });
      await tx.wallet.create({ data: { userId: created.id } });
      await tx.pendingRegistration.delete({ where: { email } });
      return created;
    });

    try {
      await attachReferralIfNeeded(user.id, referralCode);
    } catch (refErr) {
      console.warn("Failed to attach referral on mobile verify:", refErr);
    }

    try {
      await notifyAdmin({
        subject: `New user signup — ${user.fullName}`,
        heading: "New User Signup",
        lines: [
          { label: "Name", value: user.fullName },
          { label: "Email", value: user.email },
          { label: "Phone", value: user.phone ?? "—" },
        ],
        actionPath: "/admin/users",
      });
    } catch (notifyErr) {
      console.warn("Failed to notify admin on mobile verify:", notifyErr);
    }

    const token = await issueMobileToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      hasPin: false,
    });

    return Response.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, hasPin: false },
    });
  } catch (err: unknown) {
    console.error("Mobile verify-otp error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to verify OTP. Please try again." },
      { status: 500 }
    );
  }
}
