"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  getNotificationsAction,
  getRecentTransactionsAction,
  markNotificationsReadAction,
  type NotificationItem,
  type RecentTransactionItem,
} from "@/app/actions/notifications";
import { CREDIT_TX_TYPES, WALLET_TX_LABELS } from "@/lib/wallet-tx";

type Tab = "notifications" | "transactions";

// The bell. Loads on open rather than on every page render — the count comes
// from the server with the navbar, and the lists are only fetched when someone
// actually looks at them. Two tabs: notifications, and the latest wallet
// transactions (both used to be lists at the bottom of the dashboard).
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("notifications");
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [transactions, setTransactions] = useState<RecentTransactionItem[] | null>(null);
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

    const [res, txs] = await Promise.all([getNotificationsAction(), getRecentTransactionsAction()]);
    setItems(res.items);
    setTransactions(txs);
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

  const tabClass = (t: Tab) =>
    `flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${
      tab === t ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  const dateTime = (d: Date) =>
    new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

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
        <div
          className={
            // On a phone this can't be a panel hanging off the bell: 20rem of
            // dropdown anchored to an icon near the right edge runs straight
            // off the left of the screen. Pinned to both edges instead, so its
            // width is whatever the viewport allows. From `sm` up there's room
            // for the normal anchored dropdown.
            "fixed left-2 right-2 top-16 max-h-[70vh] overflow-y-auto bg-white dark:bg-card rounded-xl shadow-lg border border-border z-50 " +
            "sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80"
          }
        >
          <div className="sticky top-0 bg-white dark:bg-card border-b border-border">
            <div className="flex">
              <button type="button" className={tabClass("notifications")} onClick={() => setTab("notifications")}>
                Notifications
              </button>
              <button type="button" className={tabClass("transactions")} onClick={() => setTab("transactions")}>
                Transactions
              </button>
            </div>
          </div>

          {tab === "notifications" ? (
            items === null ? (
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
                    <p className="text-[10px] text-muted-foreground mt-1">{dateTime(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )
          ) : transactions === null ? (
            <p className="px-4 py-6 text-xs text-muted-foreground text-center">Loading…</p>
          ) : transactions.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground text-center">No wallet transactions yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((tx) => {
                const credit = CREDIT_TX_TYPES.has(tx.type);
                return (
                  <li key={tx.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{WALLET_TX_LABELS[tx.type] ?? tx.type}</p>
                      {tx.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{tx.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">{dateTime(tx.createdAt)}</p>
                    </div>
                    <p className={`text-xs font-bold shrink-0 ${credit ? "text-green-600" : "text-red-600"}`}>
                      {credit ? "+" : "-"}৳{tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="sticky bottom-0 bg-white dark:bg-card border-t border-border px-4 py-2 text-right">
            <Link
              href={tab === "notifications" ? "/notifications" : "/history"}
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              See all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
