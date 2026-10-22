"use client";

import { useActionState } from "react";
import { saveModuleNotificationAction } from "@/app/actions/admin-settings";

type Props = {
  module: "SHARE4" | "SHARE6";
  label: string;
  email: string | null;
  phone: string | null;
};

export function ModuleNotificationForm({ module, label, email, phone }: Props) {
  const [state, action, pending] = useActionState(saveModuleNotificationAction, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="module" value={module} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">{label} Email</label>
          <input
            name="email"
            type="email"
            defaultValue={email ?? ""}
            placeholder="Leave blank to use the default above"
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">{label} WhatsApp</label>
          <input
            name="phone"
            type="tel"
            defaultValue={phone ?? ""}
            placeholder="Leave blank to use the default above"
            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">Saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="text-xs font-semibold px-4 py-2 rounded-lg border border-border hover:border-brand hover:text-brand transition-colors disabled:opacity-60"
      >
        {pending ? "Saving…" : `Save ${label} Override`}
      </button>
    </form>
  );
}
