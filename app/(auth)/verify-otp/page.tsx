"use client";

import { useActionState, useRef, useEffect, useState, Suspense } from "react";
import { verifyOtpAction, resendOtpAction } from "@/app/actions/auth";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const RESEND_COOLDOWN = 120; // seconds

function VerifyOtpForm() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const type = params.get("type") ?? "EMAIL_VERIFICATION";
  const isForgot = type === "FORGOT_PASSWORD";

  const [verifyState, verifyAction, verifyPending] = useActionState(verifyOtpAction, null);
  const [resendState, resendAction, resendPending] = useActionState(resendOtpAction, null);

  // Resend cooldown timer
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Reset cooldown each time a resend succeeds (adjusted during render, not in an effect)
  const [seenResendState, setSeenResendState] = useState(resendState);
  if (resendState !== seenResendState) {
    setSeenResendState(resendState);
    if (resendState?.success) setCooldown(RESEND_COOLDOWN);
  }

  const [otpValue, setOtpValue] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function readBoxes() {
    return inputs.current.map((el) => el?.value ?? "").join("");
  }

  function handleInput(index: number, e: React.FormEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const val = input.value.replace(/\D/g, "").slice(-1);
    input.value = val;
    setOtpValue(readBoxes());
    if (val && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (e.currentTarget.value) {
        e.currentTarget.value = "";
      } else if (index > 0) {
        const prev = inputs.current[index - 1];
        if (prev) { prev.value = ""; prev.focus(); }
      }
      setOtpValue(readBoxes());
      e.preventDefault();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    digits.split("").forEach((char, i) => {
      if (inputs.current[i]) inputs.current[i]!.value = char;
    });
    inputs.current[Math.min(digits.length, 5)]?.focus();
    setOtpValue(readBoxes());
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-5">
        <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-1">
        {isForgot ? "Reset Password" : "Verify Email"}
      </h1>
      <p className="text-sm text-muted-foreground mb-2">
        {isForgot ? "Enter the code sent to" : "We sent a 6-digit verification code to"}
      </p>
      <p className="text-sm font-semibold text-brand mb-7 break-all">{email}</p>

      <form action={verifyAction} className="space-y-6">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="otp" value={otpValue} />
        {isForgot && <input type="hidden" name="type" value="FORGOT_PASSWORD" />}

        {/* OTP boxes */}
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {Array.from({ length: 6 }).map((_, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              onInput={(e) => handleInput(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 border-border bg-white text-foreground focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors caret-transparent"
            />
          ))}
        </div>

        {verifyState?.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
            {verifyState.error}
          </div>
        )}

        <button
          type="submit"
          disabled={verifyPending}
          className="w-full bg-brand text-white rounded-lg py-3 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {verifyPending ? "Verifying…" : isForgot ? "Verify & Continue" : "Verify Email"}
        </button>
      </form>

      {/* Resend with cooldown */}
      <div className="mt-5 text-center">
        <p className="text-sm text-muted-foreground mb-2">Didn&apos;t receive the code?</p>
        {cooldown > 0 ? (
          <p className="text-sm text-muted-foreground">
            Resend in{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, "0")}
            </span>
          </p>
        ) : (
          <form action={resendAction}>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="type" value={type} />
            <button
              type="submit"
              disabled={resendPending}
              className="text-sm text-brand font-semibold hover:underline disabled:opacity-50"
            >
              {resendPending ? "Sending…" : "Resend"}
            </button>
          </form>
        )}
        {resendState?.success && (
          <p className="text-xs text-green-600 mt-1">A new code has been sent.</p>
        )}
        {resendState?.error && (
          <p className="text-xs text-red-600 mt-1">{resendState.error}</p>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-4">
        <Link href="/login" className="text-brand font-medium hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  );
}
