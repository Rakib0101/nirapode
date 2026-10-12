"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { requestSharePurchaseAction } from "@/app/actions/shares";

type AvailableShare = { shareNumber: number; priceSgd: number };

type Props = {
  projectId: string;
  availableShares: AvailableShare[];
  hasPending: boolean;
  isLoggedIn: boolean;
};

export function PurchaseForm({ projectId, availableShares, hasPending, isLoggedIn }: Props) {
  const [state, action, pending] = useActionState(requestSharePurchaseAction, null);
  const [selected, setSelected] = useState<number[]>([]);

  const priceByNumber = new Map(availableShares.map((s) => [s.shareNumber, s.priceSgd]));
  const qty = selected.length;
  const total = selected.reduce((sum, n) => sum + (priceByNumber.get(n) ?? 0), 0);
  const prices = availableShares.map((s) => s.priceSgd);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  function toggle(n: number) {
    setSelected((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b)));
  }

  if (hasPending) {
    return (
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-semibold text-foreground text-sm">Purchase request pending</p>
          <p className="text-xs text-muted-foreground mt-1">Wait for admin approval before submitting another.</p>
        </div>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-semibold text-green-700 text-sm">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden sticky top-24">
      <div className="px-6 py-5 border-b border-border">
        <h3 className="font-bold text-foreground text-lg">Buy Shares</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {minPrice === maxPrice
            ? `৳${minPrice.toFixed(2)} per share`
            : `৳${minPrice.toFixed(2)} – ৳${maxPrice.toFixed(2)} per share`}
        </p>
      </div>

      <form action={action} className="p-6 space-y-5">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="shareNumbers" value={JSON.stringify(selected)} />
        <input type="hidden" name="paymentMethod" value="WALLET" />

        {/* Share number picker */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground">
              Select Share Numbers
            </label>
            <span className="text-xs text-muted-foreground">{availableShares.length} available</span>
          </div>

          {availableShares.length === 0 ? (
            <p className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-4 text-center">
              No share numbers available right now.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto p-1 border border-border rounded-lg">
              {availableShares.map(({ shareNumber: n, priceSgd }) => {
                const isSelected = selected.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggle(n)}
                    className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-md transition-colors ${
                      isSelected
                        ? "bg-brand text-white"
                        : "bg-muted text-muted-foreground hover:bg-brand-50 hover:text-brand"
                    }`}
                  >
                    <span className="text-xs font-mono font-medium">#{String(n).padStart(6, "0")}</span>
                    <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-muted-foreground/80"}`}>৳{priceSgd.toFixed(0)}</span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {qty} share{qty !== 1 ? "s" : ""} selected
          </p>
        </div>

        {/* Total */}
        <div className="bg-brand-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-brand font-medium">Total Amount</span>
          <span className="text-xl font-bold text-brand">৳{total.toFixed(2)}</span>
        </div>

        {/* Payment method — wallet only */}
        <div className="flex items-center gap-2.5 bg-muted rounded-xl px-4 py-3">
          <svg className="w-4.5 h-4.5 text-brand shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">Paid from Platform Wallet</p>
            <p className="text-xs text-muted-foreground">Deposit funds first if your balance is too low.</p>
          </div>
        </div>

        {/* Error */}
        {state?.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {isLoggedIn ? (
          <button
            type="submit"
            disabled={pending || qty === 0}
            className="w-full bg-brand text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending
              ? "Submitting…"
              : qty === 0
              ? "Select share numbers to continue"
              : `Buy ${qty} Share${qty > 1 ? "s" : ""} · ৳${total.toFixed(2)}`}
          </button>
        ) : qty === 0 ? (
          <Link
            href="/login"
            className="block w-full text-center bg-brand text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            Login to Invest
          </Link>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center bg-brand text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            Login to Buy {qty} Share{qty > 1 ? "s" : ""} · ৳{total.toFixed(2)}
          </Link>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Your request will be reviewed by an admin before shares are transferred.
        </p>
      </form>
    </div>
  );
}
