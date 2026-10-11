"use client";

import { useActionState, useState } from "react";
import { saveShareAdminCutAction, saveShare4AdminCutAction } from "@/app/actions/admin-settings";

type Props = {
  percent: number;
  variant?: "share6" | "share4";
};

export function ShareAdminCutForm({ percent, variant = "share6" }: Props) {
  const [state, action, pending] = useActionState(
    variant === "share4" ? saveShare4AdminCutAction : saveShareAdminCutAction,
    null
  );
  const [value, setValue] = useState(String(percent));

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Platform Cut <span className="text-muted-foreground font-normal">(% of each share purchase)</span>
        </label>
        <div className="relative max-w-40">
          <input
            name="percent"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="15"
            className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-foreground font-semibold"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Shown alongside the agent&apos;s commission on Purchase Requests and each project&apos;s detail page, so admins can see both cuts of every share sale. This is a reporting figure only — no wallet is credited.
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-2.5 rounded-lg">
          Platform cut saved successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brand text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Platform Cut"}
      </button>
    </form>
  );
}
