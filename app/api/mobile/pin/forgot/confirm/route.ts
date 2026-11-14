import { prisma } from "@/lib/prisma";
import { getMobileSession, issueMobileToken } from "@/lib/mobile-session";
import { findPinResetTarget } from "@/lib/pin-login";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Mirrors app/actions/pin.ts confirmPinResetAction. Like forgot/request, this
// also works signed-out from the remembered email — and in that case hands
// back a session, since proving control of the account's inbox and setting a
// new PIN is a login; making the user do it twice would be pointless.
const confirmPinResetSchema = z
  .object({
    otp: z.string().min(1, "Enter the code we emailed you"),
    pin: z
      .string()
      .regex(/^\d{4}$/, "PIN must be exactly 4 digits")
      .refine((v) => v !== "0000", "0000 is too easy to guess — choose a different PIN"),
    confirmPin: z.string(),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  });

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    const body = await req.json();

    const target = session
      ? { id: session.userId, email: session.email, fullName: session.fullName ?? session.email, role: session.role }
      : await findPinResetTarget(body?.email as string | undefined);
    if (!target) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const parse = confirmPinResetSchema.safeParse(body);
    if (!parse.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parse.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      return Response.json({ fieldErrors }, { status: 400 });
    }

    const { otp, pin } = parse.data;

    const record = await prisma.otpToken.findFirst({
      where: { userId: target.id, email: target.email, token: otp, type: "RESET_PIN", usedAt: null },
    });
    if (!record) return Response.json({ error: "Invalid or expired code." }, { status: 400 });
    if (record.expiresAt < new Date()) return Response.json({ error: "Code expired. Request a new one." }, { status: 400 });

    const pinHash = await bcrypt.hash(pin, 12);

    await prisma.$transaction([
      prisma.otpToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Clearing the lockout here is the whole point of the email flow: it's
      // the way back for someone who burned through their attempts.
      prisma.user.update({
        where: { id: target.id },
        data: { pinHash, pinFailedAttempts: 0, pinLockedUntil: null },
      }),
    ]);

    // Already signed in — the app keeps the token it has.
    if (session) return Response.json({ success: true });

    const token = await issueMobileToken({
      userId: target.id,
      role: target.role,
      email: target.email,
      fullName: target.fullName,
      hasPin: true,
    });
    return Response.json({
      success: true,
      token,
      user: {
        id: target.id,
        email: target.email,
        fullName: target.fullName,
        role: target.role,
        hasPin: true,
      },
    });
  } catch (err: unknown) {
    console.error("Mobile pin forgot/confirm error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to reset PIN. Please try again." },
      { status: 500 }
    );
  }
}
