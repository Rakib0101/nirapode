"use server";

import { prisma } from "@/lib/prisma";
import {
  createSession,
  getSession,
  markPinVerified,
  markPinVerifiedAndUpdateSession,
  clearPinVerified,
  updateSessionClaims,
} from "@/lib/session";
import { getRememberedAccount, rememberAccount } from "@/lib/remembered-account";
import { findPinResetTarget, isPinMandatoryRole, type PinLoginUser } from "@/lib/pin-login";
import { generateOTP, sendOTPEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
} | null;

function isNextRedirect(err: unknown): boolean {
  return Boolean(
    err &&
    typeof err === "object" &&
    "digest" in err &&
    typeof (err as { digest?: string }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

// Safe redirect target — only ever an internal path, never an absolute URL
// (which `next` as a raw query param could otherwise be used for).
function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

// ─── Verify PIN (the app-lock gate) ────────────────────────────────────────────

export async function verifyPinAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let redirectUrl = "";
  try {
    const session = await getSession();
    if (!session) redirect("/login");

    const pin = formData.get("pin") as string;
    const next = safeNext(formData.get("next"));

    if (!/^\d{4}$/.test(pin ?? "")) return { error: "Enter your 4-digit PIN." };

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { pinHash: true },
    });

    if (!user?.pinHash) {
      // No PIN set (shouldn't normally reach this page) — nothing to verify.
      redirectUrl = next;
    } else if (!(await bcrypt.compare(pin, user.pinHash))) {
      return { error: "Incorrect PIN. Please try again." };
    } else {
      await markPinVerifiedAndUpdateSession(session.userId);
      redirectUrl = next;
    }
  } catch (err: unknown) {
    if (isNextRedirect(err)) throw err;
    console.error("Verify PIN error:", err);
    return { error: err instanceof Error ? err.message : "Failed to verify PIN. Please try again." };
  }

  redirect(redirectUrl);
}

// ─── Forgot PIN — email OTP scoped to the logged-in user's own account ────────

// Who the PIN reset is for. Normally the signed-in user — but PIN login means
// the session may be long gone by the time someone forgets their PIN, so fall
// back to the account this browser remembers. Without this, forgetting four
// digits would lock you out of the account for good.
async function resolvePinResetTarget(): Promise<PinLoginUser | null> {
  const session = await getSession();
  if (session) {
    return { id: session.userId, email: session.email, role: session.role, fullName: session.fullName ?? session.email };
  }
  const remembered = await getRememberedAccount();
  return findPinResetTarget(remembered?.email);
}

export async function requestPinResetOtpAction(
  _prev: ActionState
): Promise<ActionState> {
  try {
    const target = await resolvePinResetTarget();
    if (!target) redirect("/login");

    const otp = generateOTP();
    await prisma.otpToken.create({
      data: {
        userId: target.id,
        email: target.email,
        token: otp,
        type: "RESET_PIN",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    try {
      await sendOTPEmail(target.email, otp, "reset-pin");
    } catch (err) {
      console.error("[OTP] Failed to send PIN reset email:", err);
      return { error: "Failed to send the code. Please try again." };
    }

    return { success: true };
  } catch (err: unknown) {
    if (isNextRedirect(err)) throw err;
    console.error("Request PIN reset OTP error:", err);
    return { error: err instanceof Error ? err.message : "Failed to send the code. Please try again." };
  }
}

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

export async function confirmPinResetAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let redirectUrl = "";
  try {
    const session = await getSession();
    const target = await resolvePinResetTarget();
    if (!target) redirect("/login");

    const parse = confirmPinResetSchema.safeParse({
      otp: formData.get("otp"),
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

    const { otp, pin } = parse.data;

    const record = await prisma.otpToken.findFirst({
      where: { userId: target.id, email: target.email, token: otp, type: "RESET_PIN", usedAt: null },
    });
    if (!record) return { error: "Invalid or expired code." };
    if (record.expiresAt < new Date()) return { error: "Code expired. Request a new one." };

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

    if (session) {
      await markPinVerifiedAndUpdateSession(target.id);
    } else {
      // Signed-out reset: proving control of the account's email and setting a
      // new PIN is a login, so don't make them do it twice.
      await createSession(
        { userId: target.id, role: target.role, email: target.email, fullName: target.fullName, hasPin: true },
        true
      );
      await markPinVerified(target.id);
      await rememberAccount({ email: target.email, fullName: target.fullName });
    }
    redirectUrl = safeNext(formData.get("next"));
  } catch (err: unknown) {
    if (isNextRedirect(err)) throw err;
    console.error("Confirm PIN reset error:", err);
    return { error: err instanceof Error ? err.message : "Failed to reset PIN. Please try again." };
  }

  redirect(redirectUrl);
}

// Lets a user explicitly lock the app again (e.g. a "Lock now" button),
// without needing to fully log out.
export async function lockPinAction(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  await clearPinVerified();
  redirect("/verify-pin");
}

// Allows user to turn off 4-digit PIN lock mode
export async function disablePinAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await getSession();
    if (!session) redirect("/login");

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { pinHash: true, passwordHash: true },
    });

    if (!user?.pinHash) {
      return { success: true };
    }

    // The PIN is how members log in now (lib/pin-login.ts), so turning it off
    // would lock them out of their own account at the next sign-in. Staff are
    // exempt: PIN login refuses their roles anyway, so for them it stays the
    // optional app-lock it has always been.
    if (isPinMandatoryRole(session.role)) {
      return {
        error:
          "Your PIN is how you sign in, so it can't be turned off. Use “Change PIN” if you want a different one.",
      };
    }

    // Money transfers require confirming with a password OR a PIN (see
    // app/actions/wallet-transfer.ts). Google users have no password, so
    // removing their PIN used to leave them with no credential at all —
    // silently blocking Send Money until they turned the PIN back on.
    // Refuse instead of quietly breaking their wallet.
    if (!user.passwordHash) {
      return {
        error:
          "Your PIN is the only way to confirm wallet transfers, because your account has no password (you signed in with Google). Turning it off would block Send Money. Set a password first if you want to remove the PIN.",
      };
    }

    const pin = (formData?.get("pin") as string)?.trim();
    if (pin) {
      const match = await bcrypt.compare(pin, user.pinHash);
      if (!match) return { error: "Incorrect PIN. Cannot disable app lock." };
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { pinHash: null },
    });

    await updateSessionClaims({ hasPin: false });
    await clearPinVerified();
    revalidatePath("/profile");
    return { success: true };
  } catch (err: unknown) {
    if (isNextRedirect(err)) throw err;
    console.error("Disable PIN error:", err);
    return { error: "Failed to turn off PIN lock. Please try again." };
  }
}
