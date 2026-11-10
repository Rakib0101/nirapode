"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { placeProductOrderAction } from "@/app/actions/products";

const INPUT =
  "w-full text-sm px-3.5 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";

export function OrderForm({
  productId,
  unitPrice,
  maxQty,
  defaultName,
  defaultPhone,
  isLoggedIn,
}: {
  productId: string;
  unitPrice: number;
  maxQty: number | null;
  defaultName: string;
  defaultPhone: string;
  isLoggedIn: boolean;
}) {
  const [state, action, pending] = useActionState(placeProductOrderAction, null);
  const [qty, setQty] = useState(1);

  if (!isLoggedIn) {
    return (
      <div className="bg-brand-50 border border-brand/20 rounded-2xl p-5 text-center">
        <p className="text-sm text-foreground font-medium">Log in to order this product</p>
        <p className="text-xs text-muted-foreground mt-1">
          Orders are confirmed by our team and paid from your Nirapode wallet.
        </p>
        <div className="flex gap-2 justify-center mt-4">
          <Link href="/login" className="bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors">
            Login
          </Link>
          <Link href="/register" className="border border-border text-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-muted transition-colors">
            Register
          </Link>
        </div>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <p className="font-semibold text-foreground">Order placed!</p>
        <p className="text-sm text-muted-foreground mt-1">{state.message}</p>
        <Link href="/wallet/checkout" className="inline-block mt-4 text-sm font-semibold text-brand hover:underline">
          View my invoices →
        </Link>
      </div>
    );
  }

  const total = Math.round(unitPrice * qty * 100) / 100;

  return (
    <form action={action} className="bg-white rounded-2xl border border-border p-5 space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <h2 className="font-semibold text-foreground">Place your order</h2>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Quantity *</label>
        <input
          name="quantity"
          type="number"
          min={1}
          max={maxQty ?? undefined}
          value={qty}
          onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
          required
          className={INPUT}
        />
        {maxQty !== null && <p className="text-[11px] text-muted-foreground mt-1">{maxQty} available</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Your Name *</label>
          <input name="fullName" required defaultValue={defaultName} className={INPUT} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Phone *</label>
          <input name="phone" required defaultValue={defaultPhone} placeholder="+65 8123 4567" className={INPUT} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Delivery Address</label>
        <input name="address" placeholder="Where should we deliver?" className={INPUT} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Note (optional)</label>
        <textarea name="note" rows={2} placeholder="Anything we should know?" className={INPUT} />
      </div>

      <div className="bg-muted rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-lg font-bold text-foreground">৳{total.toFixed(2)}</span>
      </div>

      {state?.error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brand text-white font-semibold py-3 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
      >
        {pending ? "Placing order…" : "Order Now"}
      </button>
      <p className="text-[11px] text-muted-foreground text-center">
        No payment is taken now. Our team confirms your order, then sends an invoice you pay from your wallet.
      </p>
    </form>
  );
}
