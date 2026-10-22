"use client";

import { useActionState, useState } from "react";
import { createShareBuyRequestAction } from "@/app/actions/shares";

export function BuyRequestForm({ defaultName, rate, amounts }: { defaultName: string; rate: number; amounts: number[] }) {
  const [state, action, pending] = useActionState(createShareBuyRequestAction, null);
  const [price, setPrice] = useState(String(amounts[0] ?? 100));
  const [shareNumber, setShareNumber] = useState("");

  if (state?.success) {
    return (
      <div className="px-7 py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-bold text-foreground text-lg mb-1">Buy Request Submitted!</p>
        <p className="text-sm text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="p-7 space-y-5">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Your Name</label>
        <input
          type="text"
          name="name"
          defaultValue={defaultName}
          required
          minLength={2}
          className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
        />
      </div>

      {/* Share number */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Share Number (4 digits)</label>
        <input
          type="text"
          inputMode="numeric"
          name="shareNumber"
          placeholder="e.g. 0007"
          maxLength={4}
          value={shareNumber}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
            if (digits === "0000") return; // not a valid share number — reject the completion, keep typing
            setShareNumber(digits);
          }}
          required
          className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
        />
        {shareNumber.length > 0 && shareNumber.length < 4 && (
          <p className="text-xs text-muted-foreground mt-1">Enter all 4 digits.</p>
        )}
      </div>

      {/* Size */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Share Size</label>
        <select
          name="size"
          defaultValue="SMALL"
          className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
        >
          <option value="SMALL">Small</option>
          <option value="BIG">Big</option>
        </select>
      </div>

      {/* Offer amount — fixed list, SGD shown at the admin-set share rate */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Select Offer Amount (BDT ৳) <span className="text-muted-foreground font-normal">(1 SGD = ৳{rate.toFixed(2)} BDT)</span>
        </label>

        <div className="space-y-2.5">
          <select
            name="priceBdt"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm font-medium cursor-pointer"
          >
            {amounts.map((amount) => (
              <option key={amount} value={amount}>
                ৳{amount.toLocaleString()} BDT (≈ ${(amount / rate).toFixed(2)} SGD)
              </option>
            ))}
          </select>

          <div className="p-3 bg-muted rounded-xl flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total from platform wallet:</span>
            <span className="font-bold text-foreground text-sm">
              ৳{Number(price).toLocaleString()} BDT <span className="text-muted-foreground font-normal text-xs">(≈ ${(Number(price) / rate).toFixed(2)} SGD)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Preferred date */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Preferred Date</label>
        <input
          type="date"
          name="preferredDate"
          required
          className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
        />
      </div>

      {state?.error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || shareNumber.length !== 4}
        className="w-full bg-brand text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit Buy Request"}
      </button>
    </form>
  );
}
