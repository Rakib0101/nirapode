import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // If NEXT_PUBLIC_BASE_URL is explicitly set (e.g. "https://nirapode.com"), prefer it to prevent proxy header mismatches
  let base = process.env.NEXT_PUBLIC_BASE_URL?.trim();

  // Strip trailing slashes if user typed "https://nirapode.com/"
  if (base) {
    base = base.replace(/\/+$/, "");
  }

  // Fallback to incoming request host headers
  if (!base) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    base = host ? `${proto}://${host}` : "http://localhost:3000";
  }

  const redirectUri = `${base}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
