"use client";

import { useActionState } from "react";
import { saveSmtpSettingsAction } from "@/app/actions/admin-settings";

type SmtpSettings = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

export function SmtpSettingsForm({ settings }: { settings: SmtpSettings }) {
  const [state, action, pending] = useActionState(saveSmtpSettingsAction, null);

  return (
    <form action={action} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-800 leading-relaxed">
        <strong>💡 Gmail SMTP Setup:</strong> If using Gmail, set Host to <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">smtp.gmail.com</code>, Port to <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">587</code>, enter your Gmail address, and use a <strong>16-character Google App Password</strong> (from Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords).
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            SMTP Host <span className="text-red-500">*</span>
          </label>
          <input
            name="host"
            type="text"
            required
            defaultValue={settings.host}
            placeholder="e.g. smtp.gmail.com"
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            SMTP Port <span className="text-red-500">*</span>
          </label>
          <input
            name="port"
            type="number"
            required
            defaultValue={settings.port}
            placeholder="587"
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            SMTP User / Email <span className="text-red-500">*</span>
          </label>
          <input
            name="user"
            type="text"
            required
            defaultValue={settings.user}
            placeholder="your-email@gmail.com"
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            SMTP Password / App Password <span className="text-red-500">*</span>
          </label>
          <input
            name="pass"
            type="password"
            defaultValue={settings.pass}
            placeholder="16-character App Password"
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-foreground mb-1">
            Sender Email / Name (From)
          </label>
          <input
            name="from"
            type="text"
            defaultValue={settings.from}
            placeholder="Nirapode <your-email@gmail.com>"
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          id="smtp_secure"
          name="secure"
          type="checkbox"
          defaultChecked={settings.secure}
          className="rounded border-border text-brand focus:ring-brand/30 h-4 w-4"
        />
        <label htmlFor="smtp_secure" className="text-xs text-foreground font-medium">
          Use SSL (Port 465). Leave unchecked for TLS/STARTTLS (Port 587).
        </label>
      </div>

      {state?.error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {state.error}
        </p>
      )}

      {state?.success && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          SMTP email credentials updated successfully!
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
      >
        {pending ? "Saving…" : "Save SMTP Email Settings"}
      </button>
    </form>
  );
}
