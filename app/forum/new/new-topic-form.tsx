"use client";

import { useActionState } from "react";
import { createTopicAction } from "@/app/actions/forum";
import { ImageUploadField } from "@/components/image-upload-field";

const CATEGORIES = ["General", "Jobs & Career", "Transport & Housing", "Remittance & Finance", "Legal & Visa"];

export function NewTopicForm() {
  const [state, action, pending] = useActionState(createTopicAction, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Discussion Title</label>
        <input
          name="title"
          type="text"
          required
          minLength={5}
          placeholder="e.g. Best remittance rate to Bangladesh this week?"
          className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Category</label>
        <select
          name="category"
          required
          className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand bg-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Content / Question</label>
        <textarea
          name="content"
          required
          rows={5}
          minLength={10}
          placeholder="Write details about your question or topic..."
          className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">Photo (optional)</label>
        <ImageUploadField />
      </div>

      {state?.error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brand text-white rounded-xl py-2.5 text-xs font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
      >
        {pending ? "Publishing…" : "Post Discussion"}
      </button>
    </form>
  );
}
