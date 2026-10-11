"use client";

import { useActionState, useState, Suspense } from "react";
import { verifyPinAction } from "@/app/actions/pin";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyPinForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [state, action, pending] = useActionState(verifyPinAction, null);
  const [pin, setPin] = useState("");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-5">
        <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-1">Enter Your PIN</h1>
      <p className="text-sm text-muted-foreground mb-7">
        Enter your 4-digit PIN to continue.
      </p>

      <form action={action} className="space-y-5">
        <input type="hidden" name="next" value={next} />
        <div>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="••••"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            required
            className="w-full text-center tracking-[1em] text-2xl font-mono px-3.5 py-3 rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
          />
        </div>

        {state?.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || pin.length !== 4}
          className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Verifying…" : "Unlock"}
        </button>
      </form>

      <div className="flex items-center justify-between mt-5 text-xs">
        <Link href="/forgot-pin" className="text-brand font-medium hover:underline">
          Forgot PIN?
        </Link>
        <form action="/api/logout" method="POST">
          <button type="submit" className="text-muted-foreground hover:text-foreground transition-colors">
            Logout instead
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyPinPage() {
  return (
    <Suspense>
      <VerifyPinForm />
    </Suspense>
  );
}
