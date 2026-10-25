"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { disablePinAction, lockPinAction } from "@/app/actions/pin";

export function PinLockToggle({ hasPin }: { hasPin: boolean }) {
  const [state, action, pending] = useActionState(disablePinAction, null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [pinVal, setPinVal] = useState("");

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔒</span>
          <h2 className="font-semibold text-foreground text-sm">4-Digit App Lock PIN</h2>
        </div>
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
            hasPin ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
          }`}
        >
          {hasPin ? "MODE: ON" : "MODE: OFF"}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        {hasPin
          ? "App lock is active. Your account is protected by a 4-digit PIN every fresh session."
          : "App lock is currently OFF. Turn it ON to require a 4-digit PIN whenever you open the app."}
      </p>

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 mb-3">
          {state.error}
        </div>
      )}

      {hasPin ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/set-pin"
            className="text-xs font-semibold bg-muted text-foreground px-3.5 py-2 rounded-lg hover:bg-border transition-colors"
          >
            Change PIN
          </Link>

          <button
            type="button"
            onClick={() => setConfirmModal(true)}
            className="text-xs font-semibold bg-red-50 text-red-600 border border-red-200 px-3.5 py-2 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
          >
            Turn OFF App Lock
          </button>

          <form action={lockPinAction}>
            <button
              type="submit"
              className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-3.5 py-2 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
            >
              Lock App Now
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/set-pin"
          className="inline-flex items-center gap-2 text-xs font-semibold bg-brand text-white px-4 py-2.5 rounded-lg hover:bg-brand-dark transition-colors shadow-xs"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Turn ON App Lock (Set PIN)
        </Link>
      )}

      {/* Confirmation Modal to Turn Off PIN */}
      {confirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmModal(false)} />
          <div className="relative bg-white rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">Turn OFF 4-Digit Lock</h3>
              <button
                type="button"
                onClick={() => setConfirmModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to disable the 4-digit PIN lock? You will no longer be asked for a PIN when opening the app.
            </p>

            <form
              action={action}
              onSubmit={() => setConfirmModal(false)}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  Enter your current PIN to confirm (optional)
                </label>
                <input
                  name="pin"
                  type="password"
                  maxLength={4}
                  value={pinVal}
                  onChange={(e) => setPinVal(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="w-full text-center tracking-widest text-base font-mono px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(false)}
                  className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {pending ? "Disabling…" : "Confirm Turn OFF"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
