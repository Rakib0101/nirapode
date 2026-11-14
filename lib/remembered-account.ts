import { cookies } from "next/headers";

// Which account this browser belongs to. A 4-digit PIN can't say who you are —
// several of our users will pick the same four digits — so the device has to
// remember the account and the PIN just unlocks it. This is the browser half of
// that; the app keeps the same thing in secure storage.
//
// A cookie rather than localStorage so /login can render the right screen on
// the server, with no flash of the password form before JS decides. It holds
// nothing secret (an email and a display name) and nothing that grants access
// on its own — the session stays in the httpOnly session cookie as before.
//
// Deliberately outlives logout: signing out should drop you at your own PIN
// screen, the way bKash does, not back to a blank login form. Only "Use another
// account" clears it.
export const REMEMBERED_ACCOUNT_COOKIE = "sp_account";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type RememberedAccount = { email: string; fullName: string };

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  };
}

function encode(account: RememberedAccount): string {
  return Buffer.from(JSON.stringify(account), "utf8").toString("base64url");
}

export async function rememberAccount(account: RememberedAccount): Promise<void> {
  const jar = await cookies();
  jar.set(REMEMBERED_ACCOUNT_COOKIE, encode(account), cookieOptions());
}

export async function getRememberedAccount(): Promise<RememberedAccount | null> {
  const jar = await cookies();
  const raw = jar.get(REMEMBERED_ACCOUNT_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const { email, fullName } = parsed as Partial<RememberedAccount>;
    if (typeof email !== "string" || !email) return null;
    return { email, fullName: typeof fullName === "string" ? fullName : email };
  } catch {
    // Malformed or hand-edited cookie — fall back to the full login form.
    return null;
  }
}

export async function forgetAccount(): Promise<void> {
  const jar = await cookies();
  jar.delete(REMEMBERED_ACCOUNT_COOKIE);
}
