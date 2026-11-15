import { getSession } from "@/lib/session";
import { registerWebPushSubscription, unregisterWebPushSubscription } from "@/lib/push";

// The browser half of push registration. The page asks the service worker for
// a PushSubscription and posts it here; the endpoint it contains is the push
// service's own URL for this browser, which is what we send to later.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    } | null;

    const endpoint = body?.endpoint?.trim();
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return Response.json({ error: "Incomplete subscription." }, { status: 400 });
    }
    // Push services are always https; anything else is a caller trying to
    // point us at an arbitrary host.
    if (!endpoint.startsWith("https://")) {
      return Response.json({ error: "Invalid subscription endpoint." }, { status: 400 });
    }

    await registerWebPushSubscription(
      session.userId,
      { endpoint, p256dh, auth },
      req.headers.get("user-agent")
    );
    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Web push subscribe error:", err);
    return Response.json({ error: "Could not enable notifications." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
    const endpoint = body?.endpoint?.trim();
    if (!endpoint) return Response.json({ error: "No endpoint given." }, { status: 400 });

    // Not session-gated on purpose: a subscription is only useful to the
    // browser holding it, and turning notifications off should work even
    // after the session has gone.
    await unregisterWebPushSubscription(endpoint);
    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Web push unsubscribe error:", err);
    return Response.json({ error: "Could not disable notifications." }, { status: 500 });
  }
}
