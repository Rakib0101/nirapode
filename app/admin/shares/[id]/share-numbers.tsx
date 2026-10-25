"use client";

import { useActionState, useTransition, useRef, useState } from "react";
import { createShareNumbersAction, deleteShareNumberAction, deleteAllUnassignedAction, updateShareCertificatePriceAction } from "@/app/actions/share-certificates";

type Cert = {
  id: string;
  shareNumber: number;
  code?: string | null;
  priceSgd: number | null;
  ownerId: string | null;
  issuedAt: Date | null;
  owner: { fullName: string; email: string } | null;
};

type PendingNumber = { number: number; priceSgd: number | null; code?: string | null };

export function ShareNumbersManager({
  projectId,
  projectSharePriceSgd,
  certificates,
}: {
  projectId: string;
  projectSharePriceSgd: number;
  certificates: Cert[];
}) {
  // Pending list (client-side, not yet saved)
  const [pending, setPending] = useState<PendingNumber[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [codeVal, setCodeVal] = useState("");
  const [priceVal, setPriceVal] = useState("");
  const [inputError, setInputError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, action, saving] = useActionState(createShareNumbersAction, null);
  const [deleting, startDelete] = useTransition();

  // Inline price editing for an existing available share number
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState("");
  const [editPending, startEdit] = useTransition();

  const available = certificates.filter((c) => !c.ownerId);
  const assigned = certificates.filter((c) => c.ownerId);

  const existingNumbers = new Set(certificates.map((c) => c.shareNumber));

  function addNumber() {
    const raw = inputVal.trim();
    if (!raw) return;
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 1) { setInputError("Must be a positive integer."); return; }
    if (pending.some((p) => p.number === n)) { setInputError(`#${String(n).padStart(6, "0")} already in list.`); return; }
    if (existingNumbers.has(n)) { setInputError(`#${String(n).padStart(6, "0")} already exists in this project.`); return; }
    const priceRaw = priceVal.trim();
    const priceSgd = priceRaw ? parseFloat(priceRaw) : null;
    if (priceSgd !== null && (isNaN(priceSgd) || priceSgd <= 0)) { setInputError("Enter a valid price or leave it blank."); return; }
    const code = codeVal.trim() || null;
    setPending((prev) => [...prev, { number: n, priceSgd, code }].sort((a, b) => a.number - b.number));
    setInputVal("");
    setCodeVal("");
    setPriceVal("");
    setInputError("");
    inputRef.current?.focus();
  }

  function removeFromPending(n: number) {
    setPending((prev) => prev.filter((x) => x.number !== n));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addNumber(); }
  }

  function handleSave(formData: FormData) {
    formData.set("numbers", JSON.stringify(pending));
    action(formData);
    setPending([]);
  }

  function startEditPrice(cert: Cert) {
    setEditingId(cert.id);
    setEditPriceVal(cert.priceSgd != null ? String(Number(cert.priceSgd)) : "");
  }

  function saveEditPrice(certId: string) {
    const raw = editPriceVal.trim();
    const priceSgd = raw ? parseFloat(raw) : null;
    if (priceSgd !== null && (isNaN(priceSgd) || priceSgd <= 0)) return;
    startEdit(async () => {
      await updateShareCertificatePriceAction(certId, projectId, priceSgd);
      setEditingId(null);
    });
  }

  function handleDeleteAll() {
    if (!confirm(`Delete all ${available.length} unassigned share numbers? This cannot be undone.`)) return;
    startDelete(async () => { await deleteAllUnassignedAction(projectId); });
  }

  function handleDelete(certId: string) {
    startDelete(async () => { await deleteShareNumberAction(certId, projectId); });
  }

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Share Numbers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {certificates.length} total ·{" "}
            <span className="text-green-600 font-medium">{available.length} available</span> ·{" "}
            <span className="text-brand font-medium">{assigned.length} assigned</span>
          </p>
        </div>
        {available.length > 0 && (
          <button type="button" onClick={handleDeleteAll} disabled={deleting}
            className="text-xs text-red-500 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            Delete All Unassigned
          </button>
        )}
      </div>

      {/* Add one-by-one input */}
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <p className="text-xs font-semibold text-foreground mb-1">Add Share Numbers</p>
        <p className="text-[11px] text-muted-foreground mb-3">
          Type a unique number (and optionally its own price) and press Enter or + to add it. Each number is the identity of one individual share. Leave price blank to use the project&apos;s default (৳{projectSharePriceSgd.toFixed(2)}).
        </p>

        {/* Input row */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2 mb-3">
          <input
            ref={inputRef}
            type="number"
            min={1}
            value={inputVal}
            onChange={(e) => { setInputVal(e.target.value); setInputError(""); }}
            onKeyDown={handleKeyDown}
            placeholder="Share # (e.g. 101)"
            className="w-full sm:w-32 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
          <input
            type="text"
            value={codeVal}
            onChange={(e) => { setCodeVal(e.target.value); setInputError(""); }}
            onKeyDown={handleKeyDown}
            placeholder="Word / Plot Code (e.g. PLOT-01, LAND-05)"
            className="flex-1 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand uppercase font-mono"
          />
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={priceVal}
            onChange={(e) => { setPriceVal(e.target.value); setInputError(""); }}
            onKeyDown={handleKeyDown}
            placeholder={`৳${projectSharePriceSgd.toFixed(2)} (default)`}
            className="w-full sm:w-36 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
          <button
            type="button"
            onClick={addNumber}
            className="h-10 px-4.5 flex items-center justify-center gap-1.5 rounded-lg bg-brand text-white hover:bg-brand-dark active:scale-95 transition-all text-sm font-semibold shrink-0 cursor-pointer shadow-xs"
            title="Add number to list"
          >
            <span className="text-lg leading-none font-bold">+</span>
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {inputError && (
          <p className="text-xs text-red-500 mb-2">{inputError}</p>
        )}

        {/* Pending chips */}
        {pending.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] text-muted-foreground mb-2">{pending.length} number{pending.length !== 1 ? "s" : ""} ready to save:</p>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {pending.map((p) => (
                <span key={p.number} className="inline-flex items-center gap-1 text-xs font-mono bg-brand-50 border border-brand/30 text-brand px-2.5 py-1 rounded-lg">
                  {p.code ? (
                    <span><strong>{p.code}</strong> <span className="text-brand/70">(#{String(p.number).padStart(6, "0")})</span></span>
                  ) : (
                    <span>#{String(p.number).padStart(6, "0")}</span>
                  )}
                  <span className="text-brand/80 font-bold ml-1">৳{(p.priceSgd ?? projectSharePriceSgd).toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => removeFromPending(p.number)}
                    className="text-brand/60 hover:text-red-500 ml-1 leading-none transition-colors cursor-pointer"
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Save button */}
        {pending.length > 0 && (
          <form action={handleSave}>
            <input type="hidden" name="projectId" value={projectId} />
            <button type="submit" disabled={saving}
              className="bg-brand text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-brand-dark disabled:opacity-60 transition-colors cursor-pointer">
              {saving ? "Saving…" : `Save ${pending.length} Share Number${pending.length !== 1 ? "s" : ""}`}
            </button>
          </form>
        )}

        {state?.error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mt-2">
            {state.created} share number{(state.created ?? 0) !== 1 ? "s" : ""} saved successfully.
          </p>
        )}
      </div>

      {/* Existing numbers list */}
      {certificates.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          No share numbers yet. Add them above.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Share / Code</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Price</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Holder</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Issued</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {certificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-2.5">
                    {cert.code ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs bg-brand-50 text-brand px-2 py-0.5 rounded border border-brand/20">
                          {cert.code}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          #{String(cert.shareNumber).padStart(6, "0")}
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono font-semibold text-foreground text-base">
                        #{String(cert.shareNumber).padStart(6, "0")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {editingId === cert.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          autoFocus
                          value={editPriceVal}
                          onChange={(e) => setEditPriceVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEditPrice(cert.id); if (e.key === "Escape") setEditingId(null); }}
                          placeholder={`৳${projectSharePriceSgd.toFixed(2)}`}
                          className="w-24 px-2 py-1 rounded-md border border-border text-xs focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                        <button type="button" disabled={editPending} onClick={() => saveEditPrice(cert.id)} className="text-xs text-brand font-semibold hover:text-brand-dark disabled:opacity-50">Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">
                          ৳{(cert.priceSgd != null ? Number(cert.priceSgd) : projectSharePriceSgd).toFixed(2)}
                        </span>
                        {cert.priceSgd == null && <span className="text-[10px] text-muted-foreground">(default)</span>}
                        {!cert.ownerId && (
                          <button type="button" onClick={() => startEditPrice(cert)} className="text-[11px] text-brand hover:text-brand-dark">Edit</button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {cert.ownerId ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700">Assigned</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Available</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {cert.owner ? (
                      <div>
                        <p className="text-sm font-medium text-foreground">{cert.owner.fullName}</p>
                        <p className="text-xs text-muted-foreground">{cert.owner.email}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {cert.issuedAt
                      ? cert.issuedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!cert.ownerId && (
                      <button type="button" onClick={() => handleDelete(cert.id)} disabled={deleting}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
