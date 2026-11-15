// web-push v4 is ESM with named exports only — there is no default export.
import { setVapidDetails, sendNotification } from "web-push";
import { prisma } from "@/lib/prisma";

// Push notifications to the mobile app, through Expo's push service.
//
// Expo sits in front of APNs and FCM, so there are no Apple certificates or
// Firebase keys to manage here — the app hands us an opaque ExponentPushToken
// and we POST to Expo. No credentials needed for this endpoint.
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Expo's documented cap per request.
const BATCH_SIZE = 100;

type ExpoTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

export type PushMessage = {
  title: string;
  body: string;
  // Delivered to the app so a tap can open the right screen.
  data?: Record<string, unknown>;
  // Where a browser notification should go when clicked. Phones use
  // data.url instead, since the app routes on its own scheme.
  url?: string;
  // Replaces an earlier browser notification with the same tag instead of
  // stacking duplicates.
  tag?: string;
};

export function isExpoPushToken(value: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(value);
}

// Never throws. A reminder's email must not fail because a phone was wiped.
async function sendExpoPush(
  userId: string,
  message: PushMessage
): Promise<{ sent: number; removed: number }> {
  let sent = 0;
  let removed = 0;

  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
    if (tokens.length === 0) return { sent: 0, removed: 0 };

    const dead: string[] = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(
          batch.map((t) => ({
            to: t.token,
            title: message.title,
            body: message.body,
            data: message.data ?? {},
            sound: "default",
            priority: "high",
            // Android needs a channel for anything to make a sound; the app
            // creates one with this id at startup.
            channelId: "reminders",
          }))
        ),
      });

      if (!res.ok) {
        console.error("[push] Expo returned", res.status, await res.text().catch(() => ""));
        continue;
      }

      const body = (await res.json()) as { data?: ExpoTicket[] };
      body.data?.forEach((ticket, index) => {
        if (ticket.status === "ok") {
          sent += 1;
          return;
        }
        console.error("[push] ticket error:", ticket.message, ticket.details?.error);
        // The device uninstalled the app or the token was replaced. Keeping it
        // means retrying a dead address forever.
        if (ticket.details?.error === "DeviceNotRegistered") dead.push(batch[index].token);
      });
    }

    if (dead.length > 0) {
      const res = await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
      removed = res.count;
    }
  } catch (err) {
    console.error("[push] send failed:", err);
  }

  return { sent, removed };
}

// Replaces any previous owner of this token: phones get handed on, and the
// token follows the device, not the account.
export async function registerPushToken(
  userId: string,
  token: string,
  platform?: string | null
): Promise<void> {
  await prisma.pushToken.upsert({
    where: { token },
    create: { userId, token, platform: platform ?? null },
    update: { userId, platform: platform ?? null, lastUsedAt: new Date() },
  });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await prisma.pushToken.deleteMany({ where: { token } });
}


// ── Browser push (Web Push / VAPID) ──────────────────────────────────────────
// Phones get Expo; browsers speak Web Push directly. Same reminder, two
// transports, one call — see sendPushToUser at the bottom.

function vapidConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

let vapidReady = false;
function configureVapid(): boolean {
  if (vapidReady) return true;
  if (!vapidConfigured()) return false;
  setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
  vapidReady = true;
  return true;
}

async function sendWebPush(
  userId: string,
  message: PushMessage
): Promise<{ sent: number; removed: number }> {
  let sent = 0;
  let removed = 0;

  try {
    if (!configureVapid()) {
      console.warn("[push] VAPID keys not configured — skipping browser push");
      return { sent: 0, removed: 0 };
    }

    const subs = await prisma.webPushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length === 0) return { sent: 0, removed: 0 };

    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      url: message.url ?? "/reminders",
      tag: message.tag,
    });

    const dead: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 60 * 60 }
          );
          sent += 1;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          // 404/410: the browser dropped the subscription (permission revoked,
          // profile cleared). Keeping it means retrying a dead address forever.
          if (status === 404 || status === 410) {
            dead.push(sub.endpoint);
          } else {
            console.error("[push] web push failed:", status, (err as Error).message);
          }
        }
      })
    );

    if (dead.length > 0) {
      const res = await prisma.webPushSubscription.deleteMany({ where: { endpoint: { in: dead } } });
      removed = res.count;
    }
  } catch (err) {
    console.error("[push] web push send failed:", err);
  }

  return { sent, removed };
}

export async function registerWebPushSubscription(
  userId: string,
  sub: { endpoint: string; p256dh: string; auth: string },
  userAgent?: string | null
): Promise<void> {
  await prisma.webPushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, ...sub, userAgent: userAgent ?? null },
    update: { userId, p256dh: sub.p256dh, auth: sub.auth, lastUsedAt: new Date() },
  });
}

export async function unregisterWebPushSubscription(endpoint: string): Promise<void> {
  await prisma.webPushSubscription.deleteMany({ where: { endpoint } });
}

// One call, both transports. A user signed in on a phone and at a desk gets
// the reminder in both places — which is what "App notification" means now.
export async function sendPushToUser(
  userId: string,
  message: PushMessage
): Promise<{ sent: number; removed: number }> {
  const [expo, web] = await Promise.all([sendExpoPush(userId, message), sendWebPush(userId, message)]);
  return { sent: expo.sent + web.sent, removed: expo.removed + web.removed };
}
