import { SignJWT, jwtVerify } from "jose";

// Edge-runtime-safe session token helpers — no `prisma`/`next/headers` imports
// here. middleware.ts runs on the Edge runtime and can only ever import from
// this file, never from lib/session.ts (which touches the database via a
// Node-only `pg` TCP driver that Edge can't run).

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-secret-change-in-production-32chars!!"
);

export const COOKIE_NAME = "sp_session";

// True browser-session cookie (no maxAge) marking that the PIN app-lock has
// been cleared for this browser session. Its value is the userId it was
// verified for, so switching accounts (or a stale cookie from someone else)
// never silently counts as verified. See lib/session.ts / middleware.ts.
export const PIN_COOKIE_NAME = "sp_pin_ok";

// How long a session may sit idle before it's dead, regardless of "remember me".
// Refreshed on every request (see middleware.ts) as long as the user is active —
// this is what actually enforces "logged out after a few minutes of inactivity".
export const INACTIVITY_SECONDS = 10 * 60; // 10 minutes

export type SessionPayload = {
  userId: string;
  role: string;
  email: string;
  fullName: string;
  // Whether this account has a 4-digit app-lock PIN set (User.pinHash).
  // Drives the /verify-pin gate in middleware.ts — absent/false on older
  // tokens issued before this field existed, which is treated as "no PIN".
  hasPin?: boolean;
};

export type TokenClaims = SessionPayload & { absExp: number };

export async function signSessionToken(claims: TokenClaims, maxAge: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(now + maxAge)
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as TokenClaims;
  } catch {
    return null;
  }
}

// Re-signs a still-valid token with a fresh sliding expiry, capped at the
// original absolute session lifetime. Pure JWT operation (no DB access) so it's
// safe to call from middleware. Returns null if the token is missing/invalid/
// expired/past its absolute cap — callers should just leave the cookie alone in
// that case (it'll stop working on its own).
export async function refreshSessionToken(token: string): Promise<{ token: string; maxAge: number } | null> {
  const claims = await verifySessionToken(token);
  if (!claims?.absExp) return null;

  const now = Math.floor(Date.now() / 1000);
  if (now >= claims.absExp) return null;

  const maxAge = Math.min(INACTIVITY_SECONDS, claims.absExp - now);
  const newToken = await signSessionToken(claims, maxAge);
  return { token: newToken, maxAge };
}
