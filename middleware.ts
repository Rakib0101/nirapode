import { NextRequest, NextResponse } from "next/server";
import { refreshSessionToken, verifySessionToken, COOKIE_NAME, PIN_COOKIE_NAME } from "@/lib/session-edge";
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE } from "@/lib/referral-constants";

// Pages the PIN app-lock must never block, even for a logged-in user with a
// PIN set — the gate page itself, its recovery flow, and the pages used
// before a session exists at all (included defensively; those render
// without a session anyway, so the gate wouldn't fire for them regardless).
const PIN_GATE_EXEMPT = new Set([
  "/verify-pin",
  "/forgot-pin",
  "/login",
  "/register",
  "/verify-otp",
  "/forgot-password",
  "/reset-password",
]);

// The mobile app authenticates with a Bearer token, not cookies, so there's
// no CSRF/credential exposure from a wide-open origin here — unlike the rest
// of this file, this is deliberately NOT scoped to a specific origin, since
// the Expo dev client's origin changes per machine/port and the native app
// sends no Origin header at all. Handled once here instead of in every route
// handler under app/api/mobile/**.
function mobileApiCorsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export default async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/mobile/")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: mobileApiCorsHeaders() });
    }
    const corsResponse = NextResponse.next();
    for (const [key, value] of Object.entries(mobileApiCorsHeaders())) {
      corsResponse.headers.set(key, value);
    }
    return corsResponse;
  }

  const response = NextResponse.next();

  // Capture an agent's referral link (?ref=CODE) on any page. First click
  // wins for the life of the cookie — a later ?ref= visit before signup
  // never overwrites an already-captured code. Actually attaching the
  // referral to the account happens at signup/login, see app/actions/auth.ts.
  const refParam = request.nextUrl.searchParams.get("ref");
  if (refParam && !request.cookies.get(REFERRAL_COOKIE_NAME)?.value) {
    response.cookies.set(REFERRAL_COOKIE_NAME, refParam, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      path: "/",
    });
  }

  // Slide the session's inactivity window forward on every active request —
  // this is what actually logs someone out after a few idle minutes: if they
  // stop making requests, the cookie is never refreshed and simply expires.
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    const refreshed = await refreshSessionToken(token);
    if (refreshed) {
      response.cookies.set(COOKIE_NAME, refreshed.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: refreshed.maxAge,
        path: "/",
      });
    }

    // PIN app-lock: a logged-in user whose account has a PIN set must
    // re-enter it once per fresh browser session before seeing any page.
    // The "verified" cookie is itself a true session cookie (no maxAge), so
    // closing the browser naturally clears it and the gate re-fires next visit.
    if (!PIN_GATE_EXEMPT.has(request.nextUrl.pathname)) {
      const claims = await verifySessionToken(token);
      if (claims?.hasPin) {
        const pinOk = request.cookies.get(PIN_COOKIE_NAME)?.value === claims.userId;
        if (!pinOk) {
          const url = request.nextUrl.clone();
          url.pathname = "/verify-pin";
          url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // All paths except: API routes, Next.js internals, static files
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // ...except /api/mobile/** specifically, which needs the CORS handling above
    "/api/mobile/:path*",
  ],
};
