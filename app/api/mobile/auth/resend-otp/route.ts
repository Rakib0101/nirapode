import { prisma } from "@/lib/prisma";
import { generateOTP, sendOTPEmail } from "@/lib/email";

// Mirrors app/actions/auth.ts resendOtpAction.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email as string | undefined;
    const isForgot = body?.type === "FORGOT_PASSWORD";

    if (!email) return Response.json({ error: "Invalid request." }, { status: 400 });

    if (isForgot) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return Response.json({ error: "No account found with this email." }, { status: 404 });

      const otp = generateOTP();
      await prisma.otpToken.create({
        data: {
          userId: user.id,
          email,
          token: otp,
          type: "FORGOT_PASSWORD",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      try {
        await sendOTPEmail(email, otp, "reset");
      } catch (err) {
        console.error("[OTP] Failed to resend reset email:", err);
        return Response.json({ error: "Failed to send OTP email. Please try again." }, { status: 502 });
      }
      return Response.json({ success: true });
    }

    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending) return Response.json({ error: "No pending registration found. Please register again." }, { status: 404 });

    const otp = generateOTP();
    await prisma.pendingRegistration.update({
      where: { email },
      data: { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });

    try {
      await sendOTPEmail(email, otp, "verification");
    } catch (err) {
      console.error("[OTP] Failed to resend verification email:", err);
      return Response.json({ error: "Failed to send OTP email. Please try again." }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile resend-otp error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to resend OTP. Please try again." },
      { status: 500 }
    );
  }
}
