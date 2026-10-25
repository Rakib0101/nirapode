"use client";

import { useActionState, useState } from "react";
import { requestWithdrawalAction } from "@/app/actions/withdrawals";
import Link from "next/link";

const METHODS = [
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "ROCKET", label: "Rocket" },
  { value: "GCASH", label: "GCash (₱ Pesos)" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "PAYNOW", label: "PayNow" },
];

export function WithdrawForm({
  balance,
  defaultAmount,
  bdtToPhpRate,
}: {
  balance: number;
  defaultAmount?: string;
  bdtToPhpRate?: number | null;
}) {
  const [state, action, pending] = useActionState(requestWithdrawalAction, null);
  const [amountVal, setAmountVal] = useState(defaultAmount || "");
  const [method, setMethod] = useState<string>("BKASH");

  if (state?.success) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-semibold text-foreground mb-2">Withdrawal request submitted!</p>
        <p className="text-sm text-muted-foreground mb-5">We&apos;ll verify your request and send the funds within a few business days.</p>
        <Link href="/dashboard" className="inline-block bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const numAmount = parseFloat(amountVal) || 0;
  const phpEstimated = bdtToPhpRate && numAmount > 0 ? numAmount * bdtToPhpRate : null;

  return (
    <form action={action} className="space-y-5">
      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Amount to Withdraw (৳ BDT)</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">৳</span>
          <input
            name="amount"
            type="number"
            required
            min={10}
            max={balance}
            step={0.01}
            value={amountVal}
            onChange={(e) => setAmountVal(e.target.value)}
            placeholder="Minimum ৳10"
            className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm font-semibold"
          />
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Payout Method</label>
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map((m) => (
            <label key={m.value} className="cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value={m.value}
                checked={method === m.value}
                onChange={() => setMethod(m.value)}
                className="sr-only peer"
                required
              />
              <div className="border border-border rounded-lg px-3 py-2 text-sm font-medium text-center transition-colors peer-checked:bg-brand-50 peer-checked:border-brand peer-checked:text-brand hover:border-brand/40 text-muted-foreground">
                {m.label}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* GCash Pesos Payout Box (Taka to Pesos) */}
      {method === "GCASH" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span>🇵🇭 GCash Payout (Philippines Pesos)</span>
            {bdtToPhpRate && <span>Rate: 1 BDT = {bdtToPhpRate.toFixed(4)} PHP</span>}
          </div>
          {phpEstimated !== null ? (
            <div>
              <p className="text-xs text-emerald-700">You will receive approx:</p>
              <p className="text-2xl font-bold font-mono text-emerald-900">
                ₱{phpEstimated.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PHP
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">
                Deducted from your Taka balance: <strong>৳{numAmount.toFixed(2)} BDT</strong>
              </p>
            </div>
          ) : (
            <p className="text-xs text-emerald-700">
              Enter your BDT amount above to view estimated Pesos payout.
            </p>
          )}
        </div>
      )}

      {/* Account number */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {method === "GCASH" ? "GCash Mobile Number (Philippines)" : "Account / Mobile Number"}
        </label>
        <input
          name="accountNumber"
          type="text"
          required
          placeholder={method === "GCASH" ? "e.g. 0917-123-4567 or +63 917 123 4567" : "e.g. 01700-000000"}
          className="w-full px-3.5 py-2.5 rounded-lg border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
        />
      </div>

      {/* Account name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Account Holder Name</label>
        <input
          name="accountName"
          type="text"
          required
          placeholder="Name as registered on the account"
          className="w-full px-3.5 py-2.5 rounded-lg border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
        />
      </div>

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || balance < 10}
        className="w-full bg-brand text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
      >
        {pending ? "Submitting…" : "Submit Withdrawal Request"}
      </button>
    </form>
  );
}
