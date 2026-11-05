import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Mirrors app/actions/pin.ts confirmPinResetAction.
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
    if (!session) return unauthorizedJson();

    const body = await req.json();
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
      where: { userId: session.userId, email: session.email, token: otp, type: "RESET_PIN", usedAt: null },
    });
    if (!record) return Response.json({ error: "Invalid or expired code." }, { status: 400 });
    if (record.expiresAt < new Date()) return Response.json({ error: "Code expired. Request a new one." }, { status: 400 });

    const pinHash = await bcrypt.hash(pin, 12);

    await prisma.$transaction([
      prisma.otpToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: session.userId }, data: { pinHash } }),
    ]);

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile pin forgot/confirm error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to reset PIN. Please try again." },
      { status: 500 }
    );
  }
}
