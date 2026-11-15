"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { pinLoginAction, useAnotherAccountAction } from "@/app/actions/auth";
import { POST_LOGIN_PATH } from "@/lib/auth-redirects";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

function BackspaceIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 5H8l-6 7 6 7h13a1 1 0 001-1V6a1 1 0 00-1-1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-4 6M11 9l4 6" />
    </svg>
  );
}

// The everyday web login. The browser remembers who this account is, so the
// only thing asked for is 4 digits. Mirrors the app's (auth)/verify-pin screen.
export function PinLoginForm({ account }: { account: { email: string; fullName: string } }) {
  const [state, action, pending] = useActionState(pinLoginAction, null);
  const [pin, setPin] = useState("");

  // A real browser navigation rather than a router push. The action used to
  // redirect(), which made Next fetch the whole home page as an RSC payload
  // before painting anything — on a phone that reads as a hang on a blank
  // screen. This way the browser streams the new page in as it arrives.
  useEffect(() => {
    if (state?.success) window.location.assign(POST_LOGIN_PATH);
  }, [state]);

  function press(key: string) {
    if (pending || state?.success) return;
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;

    const next = pin + key;
    setPin(next);

    // Submit on the 4th digit — no button to reach for. Dispatched straight
    // from here rather than via a hidden form, so the dots empty as the check
    // starts and a rejected PIN leaves a clean slate.
    if (next.length === 4) {
      const data = new FormData();
      data.set("pin", next);
      action(data);
      setPin("");
    }
  }

  const initial = (account.fullName || account.email).trim().charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
      <h1 className="text-xl font-bold text-foreground text-center mb-5">Login to Nirapode</h1>

      {/* Which account this PIN unlocks */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
          <span className="text-brand font-extrabold text-sm">{initial}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{account.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{account.email}</p>
        </div>
      </div>

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center mb-4">
          {state.error}
        </div>
      )}

      <div>
        <p className="text-xs text-muted-foreground text-center mb-4">
          {state?.success ? "Signing you in…" : pending ? "Checking your PIN…" : "Enter your 4-digit PIN"}
        </p>

        {/* Masked dots */}
        <div className="flex justify-center gap-4 mb-7">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-4 h-4 rounded-full border-[1.5px] transition-colors ${
                i < pin.length ? "bg-brand border-brand" : "border-border"
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((k, i) =>
            k === "" ? (
              <span key={`blank-${i}`} />
            ) : (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                disabled={pending || Boolean(state?.success)}
                aria-label={k === "del" ? "Delete" : k}
                className="h-14 rounded-2xl bg-brand-50 text-brand text-2xl font-bold flex items-center justify-center hover:bg-brand-100 active:bg-brand-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {k === "del" ? <BackspaceIcon /> : k}
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 text-xs">
        <Link href="/forgot-pin" className="text-brand font-semibold hover:underline">
          Forgot PIN?
        </Link>
        {/* The only way back to the email/password form — plain logout keeps
            the account remembered on purpose. */}
        <form action={useAnotherAccountAction}>
          <button type="submit" className="text-muted-foreground hover:text-foreground transition-colors">
            Use another account
          </button>
        </form>
      </div>
    </div>
  );
}
