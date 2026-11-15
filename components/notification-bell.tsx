"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  getNotificationsAction,
  markNotificationsReadAction,
  type NotificationItem,
} from "@/app/actions/notifications";

// The bell. Loads on open rather than on every page render — the count comes
// from the server with the navbar, and the list is only fetched when someone
// actually looks at it.
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;

    const res = await getNotificationsAction();
    setItems(res.items);
    setUnread(res.unread);

    // Opening the panel is reading them. Clearing the badge immediately keeps
    // the button honest; the write goes out behind it.
    if (res.unread > 0) {
      setUnread(0);
      startTransition(async () => {
        await markNotificationsReadAction();
      });
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        className="relative w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-brand hover:bg-brand-50 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto bg-white dark:bg-card rounded-xl shadow-lg border border-border z-50">
          <div className="sticky top-0 bg-white dark:bg-card px-4 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Notifications</span>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              See all
            </Link>
          </div>

          {items === null ? (
            <p className="px-4 py-6 text-xs text-muted-foreground text-center">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground text-center">
              Nothing yet. Reminders and account updates show up here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id} className={`px-4 py-3 ${n.isRead ? "" : "bg-brand-50/50"}`}>
                  <p className="text-xs font-semibold text-foreground">{n.title}</p>
                  {n.message && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
