import { prisma } from "@/lib/prisma";
import { getMobileSession } from "@/lib/mobile-session";
import { findPinResetTarget } from "@/lib/pin-login";
import { generateOTP, sendOTPEmail } from "@/lib/email";

// Mirrors app/actions/pin.ts requestPinResetOtpAction — emails a reset code to
// the account's own registered address.
//
// Works signed-out, from the email the app kept in secure storage: with PIN
// login the stored session may be long gone by the time someone forgets their
// PIN, and without this that would lock them out of the account for good.
export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    const target = session
      ? { id: session.userId, email: session.email }
      : await findPinResetTarget(((await req.json().catch(() => null)) as { email?: string } | null)?.email);
    if (!target) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const otp = generateOTP();
    await prisma.otpToken.create({
      data: {
        userId: target.id,
        email: target.email,
        token: otp,
        type: "RESET_PIN",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    try {
      await sendOTPEmail(target.email, otp, "reset-pin");
    } catch (err) {
      console.error("[OTP] Failed to send PIN reset email:", err);
      return Response.json({ error: "Failed to send the code. Please try again." }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile pin forgot/request error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to send the code. Please try again." },
      { status: 500 }
    );
  }
}
