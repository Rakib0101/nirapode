"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { sendMoneyAction } from "@/app/actions/wallet-transfer";
import { computeTransferFee, type TransferFeeSetting } from "@/lib/wallet-tx";

const INPUT =
  "w-full px-3.5 py-2.5 rounded-lg border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm";

export function SendMoneyForm({
  balance,
  feeSetting,
  hasSecurityAuth,
  hasPin,
  hasPassword,
}: {
  balance: number;
  feeSetting: TransferFeeSetting;
  hasSecurityAuth: boolean;
  hasPin: boolean;
  hasPassword: boolean;
}) {
  const [state, action, pending] = useActionState(sendMoneyAction, null);
  const [amount, setAmount] = useState("");

  const amountNum = Number(amount) || 0;
  const fee = amountNum > 0 ? computeTransferFee(feeSetting, amountNum) : 0;
  const total = amountNum + fee;

  if (state?.success) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-semibold text-foreground mb-2">Money sent!</p>
        <p className="text-sm text-muted-foreground mb-5">{state.message}</p>
        <Link href="/wallet" className="inline-block bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors">
          Back to Wallet
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Recipient Email or Phone</label>
        <input name="recipient" type="text" required placeholder="e.g. name@gmail.com or 01700-000000" className={INPUT} />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Amount (৳)</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">৳</span>
          <input
            name="amount"
            type="number"
            required
            min={1}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Minimum ৳1"
            className={`${INPUT} pl-8`}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Note <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input name="note" type="text" maxLength={200} placeholder="What's it for?" className={INPUT} />
      </div>

      {amountNum > 0 && (
        <div className="bg-muted rounded-xl px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recipient gets</span>
            <span className="font-medium text-foreground">৳{amountNum.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Transfer fee{feeSetting.mode === "PERCENTAGE" ? ` (${feeSetting.value}%)` : ""}
            </span>
            <span className="font-medium text-foreground">{fee > 0 ? `৳${fee.toFixed(2)}` : "Free"}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1">
            <span className="font-semibold text-foreground">You pay</span>
            <span className={`font-bold ${total > balance ? "text-red-600" : "text-foreground"}`}>৳{total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Confirmation Auth */}
      {hasSecurityAuth ? (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {hasPin && hasPassword
              ? "Confirm with your 4-Digit PIN or Password"
              : hasPin
              ? "Confirm with your 4-Digit Security PIN"
              : "Confirm with your Account Password"}
          </label>
          <input
            name="password"
            type="password"
            required
            placeholder={hasPin ? "Enter your 4-digit PIN" : "Enter your password"}
            autoComplete="current-password"
            className={INPUT}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-amber-900">Security PIN / Password Required</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                You signed in with Google and haven&apos;t set a security PIN or password yet. To protect your wallet funds from unauthorized transfers, please set a 4-digit PIN first.
              </p>
            </div>
          </div>
          <Link
            href="/set-pin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-3.5 py-2 rounded-lg transition-colors shadow-2xs"
          >
            🔒 Set 4-Digit PIN Now (Takes 10 seconds) →
          </Link>
        </div>
      )}

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center justify-between gap-3">
            <span>{state.error}</span>
            {state.error.includes("PIN") && (
              <Link href="/set-pin" className="text-xs font-semibold text-brand underline shrink-0">
                Set PIN →
              </Link>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || total > balance || !hasSecurityAuth}
        className="w-full bg-brand text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
      >
        {pending ? "Sending…" : !hasSecurityAuth ? "Please Set Security PIN to Send Money" : "Send Money"}
      </button>
    </form>
  );
}
