import { prisma } from "@/lib/prisma";
import { signSessionToken, verifySessionToken, type SessionPayload } from "@/lib/session-edge";

// Mobile clients can't hold an httpOnly cookie, so they get the same signed
// JWT as the web session, just delivered as a Bearer token in the JSON
// response body instead of a Set-Cookie header. There's no sliding-expiry/
// inactivity logic like the web cookie here — the app's own PIN-lock screen
// (shown on every app open when a PIN is set) is the "are you still you"
// check, so the token itself can just live for a long, fixed window.
const MOBILE_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function issueMobileToken(payload: SessionPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const absExp = now + MOBILE_TOKEN_MAX_AGE_SECONDS;
  return signSessionToken({ ...payload, absExp }, MOBILE_TOKEN_MAX_AGE_SECONDS);
}

function bearerTokenFrom(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

// Verifies the bearer token AND re-checks the user's current role/isActive in
// the database, same as the web's getSession() — a stale JWT claim shouldn't
// outlive an admin ban or role change for the token's whole 30-day life.
export async function getMobileSession(req: Request): Promise<SessionPayload | null> {
  const token = bearerTokenFrom(req);
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { role: true, isActive: true, email: true, fullName: true },
  });
  if (!user || !user.isActive) return null;

  return { userId: claims.userId, role: user.role, email: user.email, fullName: user.fullName };
}

export function unauthorizedJson() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
