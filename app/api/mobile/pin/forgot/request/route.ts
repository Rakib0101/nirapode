import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { generateOTP, sendOTPEmail } from "@/lib/email";

// Mirrors app/actions/pin.ts requestPinResetOtpAction — emails a reset code
// to the logged-in user's own registered address.
export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const otp = generateOTP();
    await prisma.otpToken.create({
      data: {
        userId: session.userId,
        email: session.email,
        token: otp,
        type: "RESET_PIN",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    try {
      await sendOTPEmail(session.email, otp, "reset-pin");
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
