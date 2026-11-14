import { attachReferralIfNeeded } from "@/lib/commission";
import { issueMobileToken } from "@/lib/mobile-session";
import { verifyPinLogin } from "@/lib/pin-login";

// Mirrors pinLoginAction in app/actions/auth.ts. The app supplies the email it
// has kept in secure storage since the last full sign-in; the user supplies 4
// digits. All the brute-force handling lives in lib/pin-login.ts, shared with
// the web so the two can't drift apart.
//
// Deliberately unauthenticated — the whole point is that it works after the
// 30-day bearer token has expired or been cleared.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body?.email as string | undefined;
    const pin = body?.pin as string | undefined;
    const referralCode = body?.referralCode as string | undefined;

    const result = await verifyPinLogin(email, pin);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    try {
      await attachReferralIfNeeded(result.user.id, referralCode);
    } catch (refErr) {
      console.warn("Failed to attach referral on mobile PIN login:", refErr);
    }

    // hasPin is necessarily true — verifyPinLogin just matched against it.
    const token = await issueMobileToken({
      userId: result.user.id,
      role: result.user.role,
      email: result.user.email,
      fullName: result.user.fullName,
      hasPin: true,
    });

    return Response.json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
        hasPin: true,
      },
    });
  } catch (err: unknown) {
    console.error("Mobile PIN login error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to sign in. Please try again." },
      { status: 500 }
    );
  }
}
