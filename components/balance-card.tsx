"use client";

import { useState } from "react";
import Link from "next/link";

// Balance with a show/hide eye toggle, matching the reference. Client-side
// because of the toggle; the amount itself is passed in from the server.
// Shared by the signed-in home and /dashboard so both show an identical card.
export function BalanceCard({ balance, note }: { balance: number; note?: string }) {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="bg-gradient-to-r from-brand to-brand-dark px-5 sm:px-7 py-6">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">Available Balance</p>
        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          aria-label={hidden ? "Show balance" : "Hide balance"}
          className="text-white/75 hover:text-white transition-colors cursor-pointer"
        >
          {hidden ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-1.5">
        <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
          {hidden ? "৳ ••••••" : `৳ ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
        <Link
          href="/dashboard/deposit"
          className="shrink-0 text-sm font-bold text-brand bg-white px-5 py-2.5 rounded-full hover:bg-white/90 active:scale-95 transition-all shadow-xs"
        >
          + Add Money
        </Link>
      </div>

      {note && <p className="text-xs text-white/85 mt-3">{note}</p>}
    </div>
  );
}
