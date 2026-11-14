import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// PIN login: the account's email comes from the device (a cookie on web, secure
// storage in the app) and the user only types 4 digits. That makes the PIN a
// real login credential rather than the second factor it used to be, with one
// consequence worth being blunt about: nothing stops someone from POSTing
// {email, pin} straight at the endpoint and ignoring the device entirely. The
// stored email is UI convenience, not security — the lockout below is the
// security. 10 total guesses out of 10,000 combinations caps an attacker's odds
// at 0.1%.
const SOFT_LOCK_AFTER_ATTEMPTS = 5;
const SOFT_LOCK_MINUTES = 15;
const HARD_LOCK_AFTER_ATTEMPTS = 10;

// Staff approve deposits, withdrawals and share transfers. Four digits is not
// an acceptable credential for that, so they sign in at /admin-login with a
// password and keep the PIN purely as the app-lock it always was.
const PIN_LOGIN_BLOCKED_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MODERATOR"]);

export type PinLoginUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export type PinLoginResult =
  | { ok: true; user: PinLoginUser }
  | { ok: false; error: string; status: number };

// Same wording for "no such account", "account has no PIN" and "wrong PIN", so
// the endpoint can't be used to find out which emails are registered.
const GENERIC_FAILURE = "That PIN doesn't match this account.";

const RESET_REQUIRED =
  "PIN login is locked after too many wrong attempts. Use “Forgot PIN” to set a new one by email.";

export function isPinLoginBlockedRole(role: string): boolean {
  return PIN_LOGIN_BLOCKED_ROLES.has(role);
}

// Members log in with the PIN, so they can't be without one — it's their only
// everyday credential. Staff can: for them it was only ever an app-lock.
export function isPinMandatoryRole(role: string): boolean {
  return !PIN_LOGIN_BLOCKED_ROLES.has(role);
}

// Clears the brute-force counters. Called after any successful full login
// (password or Google) and after a PIN reset, so someone who locked themselves
// out has two ways back rather than only the email flow.
export async function resetPinLockout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { pinFailedAttempts: 0, pinLockedUntil: null },
  });
}

export async function verifyPinLogin(emailRaw: string | undefined, pin: string | undefined): Promise<PinLoginResult> {
  const email = emailRaw?.trim().toLowerCase();
  if (!email || !pin || !/^\d{4}$/.test(pin)) {
    return { ok: false, error: "Enter your 4-digit PIN.", status: 400 };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      pinHash: true,
      isActive: true,
      pinFailedAttempts: true,
      pinLockedUntil: true,
    },
  });

  if (!user?.pinHash) return { ok: false, error: GENERIC_FAILURE, status: 401 };
  if (!user.isActive) {
    return { ok: false, error: "Your account has been deactivated. Contact support.", status: 403 };
  }
  if (isPinLoginBlockedRole(user.role)) {
    return {
      ok: false,
      error: "Staff accounts sign in with a password. Use the admin login page.",
      status: 403,
    };
  }

  // Checked before the hash compare so a locked-out account can't be probed.
  if (user.pinFailedAttempts >= HARD_LOCK_AFTER_ATTEMPTS) {
    return { ok: false, error: RESET_REQUIRED, status: 429 };
  }
  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    const minutes = Math.max(1, Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60_000));
    return {
      ok: false,
      error: `Too many wrong attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      status: 429,
    };
  }

  if (!(await bcrypt.compare(pin, user.pinHash))) {
    const attempts = user.pinFailedAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinFailedAttempts: attempts,
        // Re-armed on every multiple of 5, so attempts 6-10 each cost another
        // wait rather than running free once the first window expires.
        pinLockedUntil:
          attempts % SOFT_LOCK_AFTER_ATTEMPTS === 0
            ? new Date(Date.now() + SOFT_LOCK_MINUTES * 60_000)
            : user.pinLockedUntil,
      },
    });

    if (attempts >= HARD_LOCK_AFTER_ATTEMPTS) return { ok: false, error: RESET_REQUIRED, status: 429 };
    if (attempts % SOFT_LOCK_AFTER_ATTEMPTS === 0) {
      return {
        ok: false,
        error: `Too many wrong attempts. Try again in ${SOFT_LOCK_MINUTES} minutes.`,
        status: 429,
      };
    }
    const left = SOFT_LOCK_AFTER_ATTEMPTS - (attempts % SOFT_LOCK_AFTER_ATTEMPTS);
    return {
      ok: false,
      error: `${GENERIC_FAILURE} ${left} ${left === 1 ? "try" : "tries"} left before a temporary lock.`,
      status: 401,
    };
  }

  if (user.pinFailedAttempts !== 0 || user.pinLockedUntil) await resetPinLockout(user.id);

  return { ok: true, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } };
}

// Who a signed-out "Forgot PIN" request applies to. PIN login means the session
// can be long gone by the time someone forgets their PIN, so the reset flow has
// to work from the remembered email alone — otherwise forgetting four digits
// locks you out of the account permanently.
export async function findPinResetTarget(emailRaw: string | undefined): Promise<PinLoginUser | null> {
  const email = emailRaw?.trim().toLowerCase();
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true, role: true, pinHash: true, isActive: true },
  });
  // Same eligibility as PIN login itself — staff reset their PIN from inside a
  // password session, not from a signed-out form.
  if (!user?.pinHash || !user.isActive || isPinLoginBlockedRole(user.role)) return null;

  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
}
