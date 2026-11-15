import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { isExpoPushToken, registerPushToken, unregisterPushToken } from "@/lib/push";

// The app calls this once it has permission and a token from Expo, and again
// whenever that token changes. Upserting on the token means re-registering is
// free and switching accounts on one phone moves the token to the new user
// rather than leaving the old one receiving somebody else's reminders.
export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json().catch(() => null);
    const token = (body as { token?: string } | null)?.token?.trim();
    const platform = (body as { platform?: string } | null)?.platform;

    if (!token || !isExpoPushToken(token)) {
      return Response.json({ error: "Invalid push token." }, { status: 400 });
    }

    await registerPushToken(session.userId, token, platform);
    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Push register error:", err);
    return Response.json({ error: "Failed to register for notifications." }, { status: 500 });
  }
}

// Called on logout, so a shared phone stops buzzing for an account that has
// signed out of it.
export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const token = (body as { token?: string } | null)?.token?.trim();
    if (!token) return Response.json({ error: "No token given." }, { status: 400 });

    // Deliberately not session-gated: logout may already have discarded the
    // session, and a token is only useful to the device that holds it.
    await unregisterPushToken(token);
    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Push unregister error:", err);
    return Response.json({ error: "Failed to unregister." }, { status: 500 });
  }
}
