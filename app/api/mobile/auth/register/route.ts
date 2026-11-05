import { prisma } from "@/lib/prisma";
import { generateOTP, sendOTPEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Mirrors app/actions/auth.ts registerAction, reimplemented for JSON
// (the server action is bound to FormData + redirect(), which don't fit a
// mobile API response) but reusing the same underlying primitives.

const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone must be at least 10 digits"),
    password: z.string().min(4, "Password / PIN must be at least 4 digits"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function placeholderName(email: string) {
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parse = registerSchema.safeParse(body);

    if (!parse.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parse.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      return Response.json({ fieldErrors }, { status: 400 });
    }

    const { email, phone, password } = parse.data;
    const fullName = placeholderName(email);

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return Response.json({ error: "Email is already registered." }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.pendingRegistration.upsert({
      where: { email },
      update: { fullName, phone, passwordHash, otp, expiresAt },
      create: { fullName, email, phone, passwordHash, otp, expiresAt },
    });

    try {
      await sendOTPEmail(email, otp, "verification");
    } catch (err) {
      console.error("[OTP] Failed to send verification email:", err);
      return Response.json({ error: "Failed to send OTP email. Please try again." }, { status: 502 });
    }

    return Response.json({ success: true, email });
  } catch (err: unknown) {
    console.error("Mobile register error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
