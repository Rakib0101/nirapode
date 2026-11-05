import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import bcrypt from "bcryptjs";

// Mirrors app/actions/pin.ts verifyPinAction's actual PIN check. Unlike
// the web, there's no server-side "verified this browser session" cookie to
// set afterward — the app itself remembers it's unlocked for the lifetime of
// the current app session and re-gates on every fresh app open.
export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const pin = body?.pin as string | undefined;
    if (!pin || !/^\d{4}$/.test(pin)) {
      return Response.json({ error: "Enter your 4-digit PIN." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { pinHash: true } });
    if (!user?.pinHash) return Response.json({ success: true });

    const match = await bcrypt.compare(pin, user.pinHash);
    if (!match) return Response.json({ error: "Incorrect PIN. Please try again." }, { status: 401 });

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile verify-pin error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to verify PIN. Please try again." },
      { status: 500 }
    );
  }
}
