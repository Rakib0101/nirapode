"use client";

import { useActionState, useState } from "react";
import { setPinAction } from "@/app/actions/auth";
import Link from "next/link";

export default function SetPinPage() {
  const [state, action, pending] = useActionState(setPinAction, null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-5">
        <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-1">Set 4-Digit Security PIN</h1>
      <p className="text-sm text-muted-foreground mb-7">
        Set a small 4-digit PIN for your account so you can quickly sign in or confirm actions anytime.
      </p>

      <form action={action} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            4-Digit PIN
          </label>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
              if (digits === "0000") return; // too easy to guess — reject the completion, keep typing
              setPin(digits);
            }}
            required
            className="w-full text-center tracking-[1em] text-2xl font-mono px-3.5 py-3 rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
          />
          {state?.fieldErrors?.pin && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.pin}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Confirm 4-Digit PIN
          </label>
          <input
            name="confirmPin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="••••"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            required
            className="w-full text-center tracking-[1em] text-2xl font-mono px-3.5 py-3 rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
          />
          {state?.fieldErrors?.confirmPin && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.confirmPin}</p>
          )}
        </div>

        {state?.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || pin.length !== 4 || confirmPin.length !== 4}
          className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending ? "Saving PIN…" : "Save 4-Digit PIN"}
        </button>

        <div className="text-center pt-2">
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
          >
            Skip for now & go to dashboard →
          </Link>
        </div>
      </form>
    </div>
  );
}
