"use client";

import { useActionState, useRef, useState } from "react";
import { createGcashTransferAction } from "@/app/actions/gcash-transfer";
import { uploadImageFile } from "@/lib/upload-client";
import { GCASH_PAYMENT_METHODS, formatMoney, pesosFor } from "@/lib/gcash-transfer-shared";

const input =
  "w-full px-3.5 py-2.5 rounded-lg border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";

export function GcashTransferForm({ rate }: { rate: number }) {
  const [state, action, pending] = useActionState(createGcashTransferAction, null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>(GCASH_PAYMENT_METHODS[0].value);
  const [proofRef, setProofRef] = useState<string | null>(null);
  const [proofName, setProofName] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // React resets the uncontrolled inputs after a successful action; the
  // controlled ones are cleared here (adjusted during render).
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.success) {
      setAmount("");
      setProofRef(null);
      setProofName(null);
    }
  }

  const sgd = parseFloat(amount);
  const pesos = Number.isFinite(sgd) && sgd > 0 ? pesosFor(sgd, rate) : null;

  return (
    <form action={action} className="space-y-4">
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{state.message}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Amount you paid (SGD)</label>
        <input
          name="amountSgd"
          type="number"
          inputMode="decimal"
          min="1"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 100"
          className={input}
        />
        <p className="text-sm mt-2 rounded-lg bg-brand-50 text-brand px-3 py-2 font-semibold">
          {pesos !== null ? <>You&apos;ll receive ₱{formatMoney(pesos)}</> : <>Rate: S$1 = ₱{formatMoney(rate)}</>}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">How did you pay?</label>
        <input type="hidden" name="paymentMethod" value={method} />
        <div className="grid grid-cols-2 gap-2">
          {GCASH_PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                method === m.value ? "border-brand bg-brand-50 text-brand" : "border-border text-muted-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {method === "PAYNOW" ? "PayNow phone number you paid from" : "Bank account you paid from"}
        </label>
        <input name="payerAccount" required placeholder={method === "PAYNOW" ? "+65 …" : "Account number"} className={input} />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Payment screenshot</label>
        <input type="hidden" name="paymentProofUrl" value={proofRef ?? ""} />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            setProofError(null);
            const file = e.target.files?.[0];
            if (!file) return;
            setProofName("Uploading…");
            uploadImageFile(file, "transfer")
              .then((ref) => {
                setProofRef(ref);
                setProofName(file.name);
              })
              .catch((err: unknown) => {
                setProofRef(null);
                setProofName(null);
                setProofError(err instanceof Error ? err.message : "Upload failed.");
              });
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed text-sm transition-colors ${
            proofRef ? "border-brand bg-brand-50 text-brand" : "border-border text-muted-foreground hover:border-brand/40"
          }`}
        >
          <span aria-hidden>🧾</span>
          <span className="truncate">{proofName ?? "Tap to upload proof of payment"}</span>
        </button>
        {proofError && <p className="text-xs text-red-600 mt-1">{proofError}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">GCash number to receive</label>
          <input name="recipientGcashNumber" required inputMode="tel" placeholder="09XX XXX XXXX" className={input} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">GCash account name</label>
          <input name="recipientName" required placeholder="As shown in GCash" className={input} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Note <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input name="note" maxLength={300} className={input} />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || proofName === "Uploading…"}
        className="w-full bg-brand text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
