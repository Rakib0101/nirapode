"use client";

import { useActionState, useRef, useState } from "react";
import { saveShare4AmountsAction } from "@/app/actions/admin-settings";

export function Share4AmountsForm({ amounts }: { amounts: number[] }) {
  const [state, action, pending] = useActionState(saveShare4AmountsAction, null);
  const [list, setList] = useState<number[]>(amounts);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addAmount() {
    const raw = input.trim();
    if (!raw) return;
    const n = parseFloat(raw);
    if (isNaN(n) || n <= 0) { setError("Enter a positive amount."); return; }
    if (list.includes(n)) { setError(`৳${n.toLocaleString()} is already in the list.`); return; }
    setList((prev) => [...prev, n].sort((a, b) => a - b));
    setInput("");
    setError("");
    inputRef.current?.focus();
  }

  function removeAmount(n: number) {
    setList((prev) => prev.filter((x) => x !== n));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addAmount(); }
  }

  function handleSubmit(formData: FormData) {
    formData.set("amounts", JSON.stringify(list));
    action(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        The exact BDT amounts a buyer can offer on the Share 4 form. Add or remove as many as you like — there&apos;s no fixed range.
      </p>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="number"
          min={1}
          step="0.01"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 120"
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        <button
          type="button"
          onClick={addAmount}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-dark transition-colors text-lg font-bold shrink-0"
        >
          +
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}

      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground border border-dashed border-border rounded-lg px-3 py-4 text-center">
          No amounts configured — add at least one.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {list.map((n) => (
            <span key={n} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-50 border border-brand/30 text-brand px-2.5 py-1.5 rounded-lg">
              ৳{n.toLocaleString()}
              <button type="button" onClick={() => removeAmount(n)} className="text-brand/60 hover:text-red-500 leading-none transition-colors">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-2.5 rounded-lg">
          Share 4 amounts saved successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || list.length === 0}
        className="w-full bg-brand text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Amounts"}
      </button>
    </form>
  );
}
