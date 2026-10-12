"use client";

import { useActionState, useState } from "react";
import { requestShareTradeAction } from "@/app/actions/shares";
import Link from "next/link";
import type { SessionPayload } from "@/lib/session";

type Listing = {
  id: string;
  quantity: number;
  listedShareNumbers: number[];
  remaining: number;
  askingPrice: unknown;
  status: string;
  createdAt: Date;
  seller: { fullName: string };
  project: { name: string; sharePriceSgd: unknown };
};

function TradeForm({ listing }: { listing: Listing }) {
  const [state, action, pending] = useActionState(requestShareTradeAction, null);
  const [qty, setQty] = useState(1);

  if (state?.success) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
        {state.message}
      </div>
    );
  }

  const askingPrice = Number(listing.askingPrice);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="listingId" value={listing.id} />

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Quantity (max {listing.remaining})</label>
        <input
          type="number"
          name="quantity"
          min={1}
          max={listing.remaining}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          required
          className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        <p className="text-xs text-muted-foreground mt-0.5">
          Total: <span className="font-bold text-foreground">৳{(qty * askingPrice).toFixed(2)}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
        <svg className="w-4 h-4 text-brand shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Paid from your Platform Wallet balance
      </div>

      {state?.error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brand text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Buy Shares"}
      </button>
    </form>
  );
}

function ListingCard({ listing, session }: { listing: Listing; session: SessionPayload | null }) {
  const [expanded, setExpanded] = useState(false);
  const askingPrice = Number(listing.askingPrice);
  const marketPrice = Number(listing.project.sharePriceSgd);
  const diff = askingPrice - marketPrice;
  const pct = ((diff / marketPrice) * 100).toFixed(1);

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-brand bg-brand-50 px-2 py-0.5 rounded">Resell</span>
              <span className="text-xs text-muted-foreground">
                by {listing.seller.fullName.split(" ")[0]}
              </span>
            </div>
            <h3 className="font-semibold text-foreground">{listing.project.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {listing.remaining} share{listing.remaining !== 1 ? "s" : ""} available
            </p>
            {listing.listedShareNumbers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Share #{listing.listedShareNumbers.length > 1 ? "s" : ""}:</span>
                {listing.listedShareNumbers.map((n) => (
                  <span
                    key={n}
                    className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-brand-50 text-brand border border-brand/20"
                  >
                    #{String(n).padStart(6, "0")}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-foreground">৳{askingPrice.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">per share</p>
            <p className={`text-[11px] font-semibold mt-0.5 ${diff > 0 ? "text-red-500" : diff < 0 ? "text-green-600" : "text-muted-foreground"}`}>
              {diff > 0
                ? `+${pct}% vs market`
                : diff < 0
                ? `${pct}% vs market`
                : "At market price"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-muted-foreground">
            Total Value: <span className="font-semibold text-foreground">৳{(listing.remaining * askingPrice).toFixed(2)}</span>
          </div>
          {session ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {expanded ? "Cancel" : "Buy →"}
            </button>
          ) : (
            <Link href="/login" className="text-sm font-semibold text-brand hover:underline">
              Login to Buy →
            </Link>
          )}
        </div>

        {expanded && session && (
          <div className="mt-5 pt-5 border-t border-border">
            <TradeForm listing={listing} />
          </div>
        )}
      </div>
    </div>
  );
}

export function SecondaryMarket({
  listings,
  session,
}: {
  listings: Listing[];
  session: SessionPayload | null;
}) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📉</div>
        <h3 className="font-bold text-foreground text-lg mb-2">No Resell Listings</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          No community members are selling shares right now. Check back later, or invest in the primary market.
        </p>
        <Link href="/shares" className="inline-block mt-5 bg-brand text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-brand-dark transition-colors">
          Browse Primary Market
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800">
        <strong>Secondary Market</strong> — Shares listed for resale by existing investors. Prices may differ from the primary market. All trades are processed by admin.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} session={session} />
        ))}
      </div>
    </div>
  );
}
