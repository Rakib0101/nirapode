import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_NAME,
  PIN_COOKIE_NAME,
  INACTIVITY_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session-edge";

export type { SessionPayload } from "@/lib/session-edge";
export { PIN_COOKIE_NAME } from "@/lib/session-edge";

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export async function createSession(payload: SessionPayload, rememberMe = false) {
  const now = Math.floor(Date.now() / 1000);
  const absoluteMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30d or 1d — the hard ceiling
  const absExp = now + absoluteMaxAge;
  const slidingMaxAge = Math.min(INACTIVITY_SECONDS, absoluteMaxAge);

  const token = await signSessionToken({ ...payload, absExp }, slidingMaxAge);

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, cookieOptions(slidingMaxAge));
}

// Verifies the session cookie AND re-checks the user's current role/isActive in
// the database — a JWT claim alone could be stale for the session's whole
// lifetime, so a ban or role change made by an admin now takes effect on the
// user's very next request instead of waiting for the token to expire. Memoized
// per-request since several layouts/pages call this independently in one render.
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const claims = await verifySessionToken(token);
    if (!claims) return null;

    const user = await prisma.user.findUnique({
      where: { id: claims.userId },
      select: { role: true, isActive: true, email: true, fullName: true },
    });
    if (!user || !user.isActive) return null;

    return { userId: claims.userId, role: user.role, email: user.email, fullName: user.fullName };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && (err as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw err;
    }
    console.error("Session verification error:", err);
    return null;
  }
});

export async function deleteSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  jar.delete(PIN_COOKIE_NAME);
}

// Updates specific claims (currently just `hasPin`) on the existing session
// token in place, preserving its original absolute expiry — unlike calling
// createSession() again, which would reset the absolute session lifetime.
// Silently no-ops if there's no valid session (shouldn't happen in practice,
// since every caller already requires one).
export async function updateSessionClaims(patch: Partial<Pick<SessionPayload, "hasPin">>): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return;

  const claims = await verifySessionToken(token);
  if (!claims) return;

  const now = Math.floor(Date.now() / 1000);
  const remaining = claims.absExp - now;
  if (remaining <= 0) return;

  const slidingMaxAge = Math.min(INACTIVITY_SECONDS, remaining);
  const newToken = await signSessionToken({ ...claims, ...patch }, slidingMaxAge);
  jar.set(COOKIE_NAME, newToken, cookieOptions(slidingMaxAge));
}

// Marks the PIN app-lock as cleared for this browser session. True
// session-only cookie (no maxAge) — closing the browser clears it, so the
// gate re-prompts on the next fresh visit, per how this feature is meant to work.
export async function markPinVerified(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(PIN_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function clearPinVerified(): Promise<void> {
  const jar = await cookies();
  jar.delete(PIN_COOKIE_NAME);
}

// Convenience for setPinAction / confirmPinResetAction: flips the session's
// hasPin claim to true and immediately marks this browser as PIN-verified,
// so the user isn't asked to re-enter the PIN they just set/reset.
export async function markPinVerifiedAndUpdateSession(userId: string): Promise<void> {
  await updateSessionClaims({ hasPin: true });
  await markPinVerified(userId);
}
