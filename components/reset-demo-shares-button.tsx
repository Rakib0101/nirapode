"use client";

import { useState } from "react";
import { resetDemoSharesAction } from "@/app/actions/admin-shares";

export function ResetDemoSharesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  async function handleReset() {
    if (!confirm("Are you sure you want to delete ALL demo share user data? This will clear all purchase requests, ownerships, trades, listings, buy requests, and generated certificates.")) {
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await resetDemoSharesAction();
      setResult(res);
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "Reset failed";
      setResult({ error: err });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleReset}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        title="Clear every share record at once. To remove a single row, use the Delete button on that row instead."
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        {loading ? "Deleting Demo Data…" : "Delete Demo Share Data"}
      </button>
      {result?.message && (
        <span className="text-xs text-green-700 font-medium">{result.message}</span>
      )}
      {result?.error && (
        <span className="text-xs text-red-600 font-medium">{result.error}</span>
      )}
    </div>
  );
}
