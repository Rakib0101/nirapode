"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

// Notifications have been written to the database for a long time — every
// reminder delivery, purchase and wallet movement leaves one — but nothing on
// the website ever read them back. They were only visible in the mobile app's
// dashboard. This is the website's half.

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
};

const PAGE_SIZE = 20;

export async function getNotificationsAction(): Promise<{
  items: NotificationItem[];
  unread: number;
}> {
  const session = await getSession();
  if (!session) return { items: [], unread: 0 };

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: { id: true, title: true, message: true, type: true, isRead: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: session.userId, isRead: false } }),
  ]);

  return { items, unread };
}

export async function markNotificationsReadAction(
  ids?: string[]
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };

  try {
    await prisma.notification.updateMany({
      // Always scoped to the session's own user, so an id from somebody
      // else's account simply matches nothing.
      where: {
        userId: session.userId,
        isRead: false,
        ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      },
      data: { isRead: true },
    });
    revalidatePath("/notifications");
    return { success: true };
  } catch (err: unknown) {
    console.error("Mark notifications read error:", err);
    return { error: "Could not update notifications." };
  }
}
