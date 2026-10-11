"use server";

import { prisma } from "@/lib/prisma";
import { createSession, getSession, markPinVerifiedAndUpdateSession } from "@/lib/session";
import { generateOTP, sendOTPEmail } from "@/lib/email";
import { attachReferralIfNeeded } from "@/lib/commission";
import { REFERRAL_COOKIE_NAME } from "@/lib/referral-constants";
import { notifyAdmin } from "@/lib/notifications";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

function isNextRedirect(err: unknown): boolean {
  return Boolean(
    err &&
    typeof err === "object" &&
    "digest" in err &&
    typeof (err as { digest?: string }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

// Attaches the permanent referrer (if any, and if not already set) from the
// ?ref= link the user clicked, then clears the cookie — its job is done
// whether or not it actually attached anything.
async function attachReferralFromCookie(userId: string) {
  try {
    const jar = await cookies();
    const refCode = jar.get(REFERRAL_COOKIE_NAME)?.value;
    if (refCode) {
      await attachReferralIfNeeded(userId, refCode);
      jar.delete(REFERRAL_COOKIE_NAME);
    }
  } catch (err) {
    console.warn("Failed to read/delete referral cookie:", err);
  }
}

type ActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
} | null;

// ─── Register ────────────────────────────────────────────────────────────────

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

// Sign-up only collects email/phone/password — the account gets a placeholder
// name derived from the email until the user sets their real name in profile.
function placeholderName(email: string) {
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let targetEmail = "";
  try {
    const parse = registerSchema.safeParse({
      email: formData.get("email"),
      phone: formData.get("phone"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parse.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parse.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      return { fieldErrors };
    }

    const { email, phone, password } = parse.data;
    const fullName = placeholderName(email);

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return { error: "Email is already registered." };

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
      return { error: "Failed to send OTP email. Please try again." };
    }

    targetEmail = email;
  } catch (err: unknown) {
    if (isNextRedirect(err)) throw err;
    console.error("Register action error:", err);
    return { error: err instanceof Error ? err.message : "Registration failed. Please try again." };
  }

  redirect(`/verify-otp?email=${encodeURIComponent(targetEmail)}`);
}

// ─── Verify OTP ──────────────────────────────────────────────────────────────

export async function verifyOtpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let targetUrl = "";
  try {
    const email = formData.get("email") as string;
    const otp = formData.get("otp") as string;
    const isForgot = formData.get("type") === "FORGOT_PASSWORD";

    if (!email || !otp) return { error: "Invalid request." };

    if (isForgot) {
      const record = await prisma.otpToken.findFirst({
        where: { email, token: otp, type: "FORGOT_PASSWORD", usedAt: null },
      });
      if (!record) return { error: "Invalid OTP. Please check and try again." };
      if (record.expiresAt < new Date()) return { error: "OTP expired. Request a new one." };
      targetUrl = `/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`;
    } else {
      // Email verification — create the real user only now
      const pending = await prisma.pendingRegistration.findUnique({ where: { email } });

      if (!pending || pending.otp !== otp) return { error: "Invalid OTP. Please check and try again." };
      if (pending.expiresAt < new Date()) return { error: "OTP expired. Request a new one." };

      const conflict = await prisma.user.findUnique({ where: { email } });
      if (conflict) {
        await prisma.pendingRegistration.delete({ where: { email } });
        return { error: "This email is already registered. Please log in." };
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
        await attachReferralFromCookie(user.id);
      } catch (refErr) {
        console.warn("Failed to attach referral on verify:", refErr);
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
        console.warn("Failed to notify admin on verify:", notifyErr);
      }

      await createSession({
        userId: user.id,
        role: user.role,
        email: user.email,
        fullName: user.fullName,
        hasPin: false, // brand-new account, no PIN set yet
      });

      targetUrl = "/dashboard";
    }
  } catch (err: unknown) {
    if (isNextRedirect(err)) throw err;
    console.error("Verify OTP error:", err);
    return { error: err instanceof Error ? err.message : "Failed to verify OTP. Please try again." };
  }

  if (targetUrl) redirect(targetUrl);
  return null;
}

// ─── Resend OTP ───────────────────────────────────────────────────────────────

export async function resendOtpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const email = formData.get("email") as string;
    const isForgot = (formData.get("type") as string) === "FORGOT_PASSWORD";

    if (isForgot) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return { error: "No account found with this email." };

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
        return { error: "Failed to send OTP email. Please try again." };
      }
      return { success: true };
    }

    // Email verification resend
    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending) return { error: "No pending registration found. Please register again." };

    const otp = generateOTP();
    await prisma.pendingRegistration.update({
      where: { email },
      data: { otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });

    try {
      await sendOTPEmail(email, otp, "verification");
    } catch (err) {
      console.error("[OTP] Failed to resend verification email:", err);
      return { error: "Failed to send OTP email. Please try again." };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("Resend OTP error:", err);
    return { error: err instanceof Error ? err.message : "Failed to resend OTP. Please try again." };
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;
    const rememberMe = formData.get("rememberMe") === "on";

    if (!email || !password) return { error: "Please fill all fields." };

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        passwordHash: true,
        pinHash: true,
        isActive: true,
      },
    });

    if (!user) return { error: "Invalid email or password." };

    // Google-only account has no password
    if (!user.passwordHash) {
      return { error: "This account uses Google sign-in. Please use the Google button." };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return { error: "Invalid email or password." };
    }

    if (!user.isActive) return { error: "Your account has been deactivated. Contact support." };

    try {
      await attachReferralFromCookie(user.id);
    } catch (refErr) {
      console.warn("Failed to attach referral on login:", refErr);
    }

    await createSession(
      { userId: user.id, role: user.role, email: user.email, fullName: user.fullName, hasPin: Boolean(user.pinHash) },
      rememberMe
    );

    // Server Action redirects are soft client-side transitions and don't pass
    // back through the Proxy PIN gate for this one hop — send PIN-having
    // users straight to the gate instead of relying on the next navigation.
    if (user.pinHash) redirect("/verify-pin?next=%2Fdashboard");
  } catch (err: unknown) {
    if (isNextRedirect(err)) throw err;
    console.error("Login action error:", err);
    return { error: err instanceof Error ? err.message : "Failed to sign in. Please try again." };
  }

  redirect("/dashboard");
}

// ─── Forgot Password ─────────────────────────────────────────────────────────

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let emailToRedirect = "";
  try {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    if (!email) return { error: "Please enter your email." };

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

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
    emailToRedirect = email;
  } catch (err: unknown) {
    if (isNextRedirect(err)) throw err;
    console.error("Forgot password error:", err);
    return { error: err instanceof Error ? err.message : "Failed to process request." };
  }

  redirect(`/verify-otp?email=${encodeURIComponent(emailToRedirect)}&type=FORGOT_PASSWORD`);
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const email = formData.get("email") as string;
    const otp = formData.get("otp") as string;
    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;

    if (password !== confirm) return { error: "Passwords do not match." };
    if (password.length < 4) return { error: "Password / PIN must be at least 4 digits." };

    const record = await prisma.otpToken.findFirst({
      where: { email, token: otp, type: "FORGOT_PASSWORD", usedAt: null },
    });

    if (!record) return { error: "Invalid or expired OTP." };
    if (record.expiresAt < new Date()) return { error: "OTP expired. Request a new one." };

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.otpToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    ]);
  } catch (err: unknown) {
    if (isNextRedirect(err)) throw err;
    console.error("Reset password error:", err);
    return { error: err instanceof Error ? err.message : "Failed to reset password. Please try again." };
  }

  redirect("/login?reset=1");
}

// ─── Set 4-Digit Security PIN (Google login onboarding / profile) ─────────────

const setPinSchema = z
  .object({
    pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    confirmPin: z.string(),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  });

export async function setPinAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let redirectUrl = "";
  try {
    const session = await getSession();
    if (!session) redirect("/login");

    const parse = setPinSchema.safeParse({
      pin: formData.get("pin"),
      confirmPin: formData.get("confirmPin"),
    });

    if (!parse.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parse.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      return { fieldErrors };
    }

    const { pin } = parse.data;
    const pinHash = await bcrypt.hash(pin, 12);

    await prisma.user.update({
      where: { id: session.userId },
      data: { pinHash },
    });
    await markPinVerifiedAndUpdateSession(session.userId);

    redirectUrl = "/dashboard?pin_set=1";
  } catch (err: unknown) {
    if (isNextRedirect(err)) throw err;
    console.error("Set PIN error:", err);
    return { error: err instanceof Error ? err.message : "Failed to set PIN. Please try again." };
  }

  if (redirectUrl) redirect(redirectUrl);
  return null;
}

