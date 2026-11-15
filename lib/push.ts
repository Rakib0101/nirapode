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
};

export function isExpoPushToken(value: string): boolean {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(value);
}

// Never throws. A reminder's email must not fail because a phone was wiped.
export async function sendPushToUser(
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
