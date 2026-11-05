import { prisma } from "@/lib/prisma";
import { generateOTP, sendOTPEmail } from "@/lib/email";

// Mirrors app/actions/auth.ts forgotPasswordAction. Always returns success
// regardless of whether the email exists, so the response can't be used to
// enumerate registered accounts.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email as string | undefined)?.trim().toLowerCase();
    if (!email) return Response.json({ error: "Please enter your email." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    if (user) {
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
        console.error("[OTP] Failed to send password reset email:", err);
      }
    }

    return Response.json({ success: true, email });
  } catch (err: unknown) {
    console.error("Mobile forgot-password error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to process request." },
      { status: 500 }
    );
  }
}
