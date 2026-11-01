import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Determine origin dynamically from incoming request headers (supports custom domains e.g. nirapode.com)
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  const dynamicBase = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000");

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: `${dynamicBase}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
