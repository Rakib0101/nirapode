"use client";

import { useState, useTransition } from "react";
import { deleteShareRecordAction, type DeletableShareRecord } from "@/app/actions/admin-shares";

// Removes one share record. The counterpart to the bulk "Delete Demo Share
// Data" button, which empties every share table at once — fine for a reset,
// useless when a single test row needs to go.
export function DeleteShareRecordButton({
  kind,
  id,
  what,
}: {
  kind: DeletableShareRecord;
  id: string;
  // Named in the confirmation, so an admin can see what they're about to lose.
  what: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`Delete ${what}? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteShareRecordAction(kind, id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        title={`Delete ${what}`}
        aria-label={`Delete ${what}`}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </>
  );
}
