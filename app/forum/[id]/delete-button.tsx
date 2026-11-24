"use client";

import { useState, useTransition } from "react";
import { deleteReplyAction, deleteTopicAction } from "@/app/actions/forum";

// Shown to the author and to community moderators. Asks first; the server
// action re-checks who may delete.
export function ForumDeleteButton({ kind, id }: { kind: "topic" | "reply"; id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    const what = kind === "topic" ? "this post and all its replies" : "this reply";
    if (!window.confirm(`Delete ${what}? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = kind === "topic" ? await deleteTopicAction(id) : await deleteReplyAction(id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg disabled:opacity-50 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </span>
  );
}
