"use client";

import { useActionState, useState, useTransition, useEffect } from "react";
import { createDuaAction, updateDuaAction, deleteDuaAction } from "@/app/actions/islamic";

const CATEGORIES = ["Prayer", "Jumma", "Morning", "Evening", "Food", "Sleep", "Travel", "Protection", "Quran", "General"];

const INPUT = "w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white";

export type Dua = {
  id: string;
  title: string;
  arabic: string;
  transliteration: string | null;
  translation: string;
  category: string;
  source: string | null;
};

function DuaFormFields({ dua }: { dua?: Dua }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Title *</label>
          <input name="title" required placeholder="e.g. Dua before eating" defaultValue={dua?.title} className={INPUT} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Category *</label>
          <select name="category" required defaultValue={dua?.category ?? ""} className={INPUT}>
            <option value="">Select category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Arabic Text *</label>
        <textarea
          name="arabic"
          required
          rows={3}
          dir="rtl"
          placeholder="اكتب الدعاء هنا..."
          defaultValue={dua?.arabic}
          className={`${INPUT} font-arabic text-right leading-loose resize-none`}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Transliteration</label>
        <input name="transliteration" placeholder="e.g. Bismillahi wa 'ala barakati-llah..." defaultValue={dua?.transliteration ?? ""} className={INPUT} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Translation (English) *</label>
        <textarea name="translation" required rows={2} placeholder="English meaning..." defaultValue={dua?.translation} className={`${INPUT} resize-none`} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Source (Hadith reference)</label>
        <input name="source" placeholder="e.g. Bukhari, Muslim, Tirmidhi..." defaultValue={dua?.source ?? ""} className={INPUT} />
      </div>
    </>
  );
}

export function DuaForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createDuaAction, null);

  // Close the modal once per successful submit (adjusting state during render,
  // not in an effect — see react.dev "You Might Not Need an Effect").
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.success) setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
      >
        + Add Dua
      </button>

      {open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pb-20 lg:pb-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[calc(100vh-6rem)] lg:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-bold text-foreground">Add New Dua</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <form action={action} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <DuaFormFields />

              {state?.error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{state.error}</p>
              )}

              {/* Footer inside form so submit is inside form */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-60 transition-colors"
                >
                  {pending ? "Saving…" : "Save Dua"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function EditDuaForm({ dua }: { dua: Dua }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateDuaAction, null);

  // Close the modal once per successful submit (adjusting state during render,
  // not in an effect — see react.dev "You Might Not Need an Effect").
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.success) setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-brand hover:underline"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pb-20 lg:pb-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[calc(100vh-6rem)] lg:max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-bold text-foreground">Edit Dua</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <form action={action} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <input type="hidden" name="duaId" value={dua.id} />
              <DuaFormFields dua={dua} />

              {state?.error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{state.error}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-5 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-60 transition-colors"
                >
                  {pending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function DuaDeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Delete this dua?")) startTransition(() => deleteDuaAction(id));
      }}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? "…" : "Delete"}
    </button>
  );
}
