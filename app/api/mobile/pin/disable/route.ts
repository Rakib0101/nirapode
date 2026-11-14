import { prisma } from "@/lib/prisma";
import { getMobileSession, issueMobileToken, unauthorizedJson } from "@/lib/mobile-session";
import bcrypt from "bcryptjs";

// Mirrors app/actions/pin.ts disablePinAction. hasPin flips to false, so we
// hand back a freshly-signed token carrying that claim, same reasoning as
// the set-pin endpoint.
export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { pinHash: true, passwordHash: true },
    });
    if (!user?.pinHash) {
      const token = await issueMobileToken({ ...session, hasPin: false });
      return Response.json({ success: true, token });
    }

    // Same guard as the web action: transfers are confirmed with a password
    // OR a PIN, so removing the PIN from a Google account (which has no
    // password) would silently block Send Money.
    if (!user.passwordHash) {
      return Response.json(
        {
          error:
            "Your PIN is the only way to confirm wallet transfers, because your account has no password (you signed in with Google). Turning it off would block Send Money.",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const pin = (body?.pin as string | undefined)?.trim();
    if (pin) {
      const match = await bcrypt.compare(pin, user.pinHash);
      if (!match) return Response.json({ error: "Incorrect PIN. Cannot disable app lock." }, { status: 401 });
    }

    await prisma.user.update({ where: { id: session.userId }, data: { pinHash: null } });

    const token = await issueMobileToken({ ...session, hasPin: false });
    return Response.json({ success: true, token });
  } catch (err: unknown) {
    console.error("Mobile disable-pin error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to turn off PIN lock. Please try again." },
      { status: 500 }
    );
  }
}
