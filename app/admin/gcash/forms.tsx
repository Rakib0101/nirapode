"use client";

import { useActionState, useRef, useState } from "react";
import { processGcashTransferAction, saveGcashSettingsAction } from "@/app/actions/gcash-transfer";
import { uploadImageFile } from "@/lib/upload-client";
import type { GcashSettings } from "@/lib/gcash-transfer";

const input =
  "w-full px-3 py-2 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";

export function GcashSettingsForm({ settings }: { settings: GcashSettings }) {
  const [state, action, pending] = useActionState(saveGcashSettingsAction, null);

  return (
    <form action={action} className="bg-white rounded-xl border border-border p-5 space-y-4">
      <h2 className="font-semibold text-foreground">Rate & where users pay</h2>
      <div className="grid sm:grid-cols-[200px_1fr] gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">1 SGD = ? Pesos</label>
          <input
            name="rate"
            type="number"
            step="0.0001"
            min="0"
            required
            defaultValue={settings.rate ?? ""}
            placeholder="49.50"
            className={input}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Accounts users pay SGD to (bank account or PayNow number, one per line)
          </label>
          <textarea
            name="receiveAccounts"
            rows={3}
            required
            defaultValue={settings.receiveAccounts}
            placeholder={"PayNow: 8xxx xxxx (Name)\nDBS 123-45678-9 (Name)"}
            className={input + " font-mono"}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Payment instructions shown to users</label>
        <textarea
          name="instructions"
          rows={3}
          defaultValue={settings.instructions}
          placeholder="e.g. Put your phone number in the PayNow reference. Pesos are sent within 2 hours (9am–9pm)."
          className={input}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
        {state?.success && <span className="text-xs text-green-600">{state.message}</span>}
      </div>
    </form>
  );
}

export function ProcessGcashForm({ id, pesos }: { id: string; pesos: string }) {
  const [state, action, pending] = useActionState(processGcashTransferAction, null);
  const [decision, setDecision] = useState<"COMPLETED" | "REJECTED">("COMPLETED");
  const [proofRef, setProofRef] = useState<string | null>(null);
  const [proofName, setProofName] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (state?.success) return <p className="text-sm text-green-600 font-semibold">Done ✓</p>;

  const uploading = proofName === "Uploading…";

  return (
    <form action={action} className="space-y-2 rounded-lg bg-muted/60 p-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value={decision} />
      <div className="flex gap-1.5">
        {(["COMPLETED", "REJECTED"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDecision(d)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-colors ${
              decision === d
                ? d === "COMPLETED"
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
                : "bg-white border border-border text-muted-foreground"
            }`}
          >
            {d === "COMPLETED" ? "Sent ✓" : "Reject"}
          </button>
        ))}
      </div>

      {decision === "COMPLETED" ? (
        <>
          <p className="text-[11px] text-muted-foreground">Send ₱{pesos} by GCash first, then upload the screenshot.</p>
          <input type="hidden" name="sentProofUrl" value={proofRef ?? ""} />
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
            className={`w-full text-xs px-3 py-2 rounded-lg border-2 border-dashed truncate ${
              proofRef ? "border-green-500 bg-green-50 text-green-700" : "border-border bg-white text-muted-foreground"
            }`}
          >
            {proofName ?? "Upload GCash send screenshot"}
          </button>
          {proofError && <p className="text-[11px] text-red-600">{proofError}</p>}
          <input name="adminNote" placeholder="Note to user (optional)" className={input + " text-xs"} />
        </>
      ) : (
        <input name="adminNote" required placeholder="Reason (shown to the user)" className={input + " text-xs"} />
      )}

      {state?.error && <p className="text-[11px] text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || uploading || (decision === "COMPLETED" && !proofRef)}
        className={`w-full text-xs py-2 rounded-lg font-semibold text-white disabled:opacity-50 ${
          decision === "COMPLETED" ? "bg-green-600" : "bg-red-600"
        }`}
      >
        {pending ? "…" : decision === "COMPLETED" ? "Mark as sent" : "Reject request"}
      </button>
    </form>
  );
}
