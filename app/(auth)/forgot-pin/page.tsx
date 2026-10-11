"use client";

import { useActionState, useState, Suspense } from "react";
import { requestPinResetOtpAction, confirmPinResetAction } from "@/app/actions/pin";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ForgotPinForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [requestState, requestAction, requestPending] = useActionState(requestPinResetOtpAction, null);
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmPinResetAction, null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const sent = Boolean(requestState?.success);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-5">
        <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-1">Forgot Your PIN?</h1>

      {!sent ? (
        <>
          <p className="text-sm text-muted-foreground mb-7">
            We&apos;ll email a verification code to your account&apos;s email address so you can set a new PIN.
          </p>
          <form action={requestAction}>
            {requestState?.error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
                {requestState.error}
              </div>
            )}
            <button
              type="submit"
              disabled={requestPending}
              className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60"
            >
              {requestPending ? "Sending…" : "Send Code to My Email"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-7">
            Enter the code we emailed you, then choose a new 4-digit PIN.
          </p>
          <form action={confirmAction} className="space-y-5">
            <input type="hidden" name="next" value={next} />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Verification Code</label>
              <input
                name="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
              />
              {confirmState?.fieldErrors?.otp && (
                <p className="text-xs text-red-600 mt-1">{confirmState.fieldErrors.otp}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">New 4-Digit PIN</label>
              <input
                name="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                required
                className="w-full text-center tracking-[1em] text-2xl font-mono px-3.5 py-3 rounded-lg border border-border bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
              />
              {confirmState?.fieldErrors?.pin && (
                <p className="text-xs text-red-600 mt-1">{confirmState.fieldErrors.pin}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirm New PIN</label>
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
              {confirmState?.fieldErrors?.confirmPin && (
                <p className="text-xs text-red-600 mt-1">{confirmState.fieldErrors.confirmPin}</p>
              )}
            </div>

            {confirmState?.error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {confirmState.error}
              </div>
            )}

            <button
              type="submit"
              disabled={confirmPending || pin.length !== 4 || confirmPin.length !== 4}
              className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {confirmPending ? "Saving…" : "Set New PIN"}
            </button>
          </form>

          <form action={requestAction} className="mt-3">
            <button type="submit" disabled={requestPending} className="text-xs text-brand font-semibold hover:underline disabled:opacity-50">
              {requestPending ? "Sending…" : "Resend code"}
            </button>
          </form>
        </>
      )}

      <p className="text-center text-sm text-muted-foreground mt-5">
        <Link href="/verify-pin" className="text-brand font-medium hover:underline">
          ← Back
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPinPage() {
  return (
    <Suspense>
      <ForgotPinForm />
    </Suspense>
  );
}
