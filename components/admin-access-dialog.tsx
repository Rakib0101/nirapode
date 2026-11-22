"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAdminPermissionsAction } from "@/app/actions/admin-users";
import { ADMIN_SECTIONS, ALL_ADMIN_SECTIONS } from "@/lib/admin-sections";

// Super admin only: pick which admin panel sections an Admin / Moderator can
// open and act on. The dashboard is always available.
export function AdminAccessDialog({
  user,
  onClose,
}: {
  user: { id: string; fullName: string; role: string; adminPermissions: string[] };
  onClose: () => void;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(() => new Set(user.adminPermissions));
  const [state, action, pending] = useActionState(setAdminPermissionsAction, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const allOn = checked.size === ALL_ADMIN_SECTIONS.length;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 pb-20 lg:pb-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => !pending && onClose()} />
      <div className="relative bg-white rounded-2xl border border-border shadow-xl w-full max-w-md max-h-[calc(100vh-6rem)] lg:max-h-[90vh] overflow-y-auto text-left">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-bold text-foreground">Admin access</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {user.fullName} · {user.role.replace("_", " ")}. Tick the sections they can open and work on.
          </p>
        </div>

        <form action={action} className="p-6 space-y-4">
          <input type="hidden" name="userId" value={user.id} />

          <button
            type="button"
            onClick={() => setChecked(allOn ? new Set() : new Set(ALL_ADMIN_SECTIONS))}
            className="text-xs font-semibold text-brand hover:underline"
          >
            {allOn ? "Clear all" : "Select all"}
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ADMIN_SECTIONS.map((s) => (
              <label
                key={s.key}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                  checked.has(s.key) ? "border-brand bg-brand-50 text-foreground" : "border-border text-muted-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  name="sections"
                  value={s.key}
                  checked={checked.has(s.key)}
                  onChange={() => toggle(s.key)}
                  className="accent-brand"
                />
                {s.label}
              </label>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            The dashboard is always visible. Changes apply on their next click — no need to log out.
          </p>

          {state?.error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 cursor-pointer"
            >
              {pending ? "Saving…" : "Save access"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
