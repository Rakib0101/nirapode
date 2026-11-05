import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Mirrors app/actions/auth.ts resetPasswordAction.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email as string | undefined;
    const otp = body?.otp as string | undefined;
    const password = body?.password as string | undefined;
    const confirmPassword = body?.confirmPassword as string | undefined;

    if (!email || !otp || !password) return Response.json({ error: "Invalid request." }, { status: 400 });
    if (password !== confirmPassword) return Response.json({ error: "Passwords do not match." }, { status: 400 });
    if (password.length < 4) {
      return Response.json({ error: "Password / PIN must be at least 4 digits." }, { status: 400 });
    }

    const record = await prisma.otpToken.findFirst({
      where: { email, token: otp, type: "FORGOT_PASSWORD", usedAt: null },
    });

    if (!record) return Response.json({ error: "Invalid or expired OTP." }, { status: 400 });
    if (record.expiresAt < new Date()) return Response.json({ error: "OTP expired. Request a new one." }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.otpToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    ]);

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile reset-password error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
