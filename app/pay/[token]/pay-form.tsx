"use client";

import { uploadImageFile } from "@/lib/upload-client";

import { useActionState, useRef, useState } from "react";
import { submitCheckoutPaymentAction } from "@/app/actions/checkout";

type PaymentAccount = {
  id: string;
  method: string;
  label: string;
  accountNumber: string;
  accountName: string | null;
};

export function PayForm({ token, accounts }: { token: string; accounts: PaymentAccount[] }) {
  const boundAction = submitCheckoutPaymentAction.bind(null, token);
  const [state, action, pending] = useActionState(boundAction, null);

  const [proofMode, setProofMode] = useState<"txid" | "screenshot">("txid");
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  function copyNumber(num: string) {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2000);
  }

  if (state?.success) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-semibold text-foreground mb-2">Payment proof submitted</p>
        <p className="text-sm text-muted-foreground">We&apos;ll confirm your payment shortly.</p>
      </div>
    );
  }

  const methodOptions = accounts.filter(
    (a, i) => accounts.findIndex((b) => b.method === a.method) === i
  );

  return (
    <form action={action} className="space-y-5">
      {accounts.length === 0 ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          No payment accounts are configured yet. Please contact support.
        </div>
      ) : (
        <div className="bg-muted rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-foreground">Payment Accounts</p>
            <span className="text-[10px] text-muted-foreground">Click Copy to copy number</span>
          </div>
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
              <span className="font-medium text-foreground">
                {a.label}
                {a.accountName && <span className="text-muted-foreground"> ({a.accountName})</span>}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-medium text-foreground bg-white border border-border px-2 py-0.5 rounded">
                  {a.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyNumber(a.accountNumber)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  title="Copy number"
                >
                  {copiedNumber === a.accountNumber ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Payment method</label>
        <div className="grid grid-cols-2 gap-2">
          {methodOptions.map((m) => (
            <label key={m.method} className="cursor-pointer">
              <input type="radio" name="paymentMethod" value={m.method} className="sr-only peer" required />
              <div className="border border-border rounded-lg px-3 py-2 text-sm font-medium text-center transition-colors peer-checked:bg-brand-50 peer-checked:border-brand peer-checked:text-brand hover:border-brand/40 text-muted-foreground">
                {m.label}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">
            Transaction ID <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setProofMode("txid")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                proofMode === "txid" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Type ID
            </button>
            <button
              type="button"
              onClick={() => setProofMode("screenshot")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                proofMode === "screenshot" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Screenshot
            </button>
          </div>
        </div>

        {proofMode === "txid" ? (
          <input
            name="txId"
            type="text"
            placeholder="e.g. 9N7A2K3P1Q"
            className="w-full px-3.5 py-2.5 rounded-lg border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm font-mono"
          />
        ) : (
          <div>
            <input type="hidden" name="screenshotUrl" value={screenshotBase64 ?? ""} />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                setScreenshotError(null);
                const file = e.target.files?.[0];
                if (!file) return;
                // Uploaded here, not at submit: the form then carries a short
                // storage ref instead of megabytes of base64, and an oversized
                // file is rejected while the user is still looking at the picker.
                setScreenshotName("Uploading…");
                uploadImageFile(file, "payment")
                  .then((ref) => {
                    setScreenshotBase64(ref);
                    setScreenshotName(file.name);
                  })
                  .catch((err: unknown) => {
                    setScreenshotBase64(null);
                    setScreenshotName(null);
                    setScreenshotError(err instanceof Error ? err.message : "Upload failed.");
                  });
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed transition-colors ${
                screenshotName
                  ? "border-brand bg-brand-50 text-brand"
                  : "border-border text-muted-foreground hover:border-brand/40"
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 9.75h.008v.008H3V9.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 6h16.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75V6.75A.75.75 0 013.75 6z" />
              </svg>
              <span className="text-sm truncate">
                {screenshotName ?? "Tap to upload payment screenshot"}
              </span>
            </button>
            {screenshotError && <p className="text-xs text-red-600 mt-1">{screenshotError}</p>}
          </div>
        )}
      </div>

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || accounts.length === 0}
        className="w-full bg-brand text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit Payment Proof"}
      </button>
    </form>
  );
}
