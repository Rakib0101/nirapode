import { prisma } from "@/lib/prisma";
import { attachReferralIfNeeded } from "@/lib/commission";
import { issueMobileToken } from "@/lib/mobile-session";
import bcrypt from "bcryptjs";

// Mirrors app/actions/auth.ts loginAction. No "remember me" distinction here
// — the mobile token is always the fixed 30-day one (see lib/mobile-session.ts).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email as string | undefined)?.trim().toLowerCase();
    const password = body?.password as string | undefined;
    const referralCode = body?.referralCode as string | undefined;

    if (!email || !password) return Response.json({ error: "Please fill all fields." }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        passwordHash: true,
        pinHash: true,
        isActive: true,
      },
    });

    if (!user) return Response.json({ error: "Invalid email or password." }, { status: 401 });

    if (!user.passwordHash) {
      return Response.json(
        { error: "This account uses Google sign-in. Please use the Google button." },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return Response.json({ error: "Invalid email or password." }, { status: 401 });

    if (!user.isActive) {
      return Response.json({ error: "Your account has been deactivated. Contact support." }, { status: 403 });
    }

    try {
      await attachReferralIfNeeded(user.id, referralCode);
    } catch (refErr) {
      console.warn("Failed to attach referral on mobile login:", refErr);
    }

    const hasPin = Boolean(user.pinHash);
    const token = await issueMobileToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      hasPin,
    });

    return Response.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, hasPin },
    });
  } catch (err: unknown) {
    console.error("Mobile login error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to sign in. Please try again." },
      { status: 500 }
    );
  }
}
