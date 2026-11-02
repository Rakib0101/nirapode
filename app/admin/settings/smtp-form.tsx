"use client";

import { useActionState, useState } from "react";
import { saveSmtpSettingsAction, testSmtpEmailAction } from "@/app/actions/admin-settings";

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
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  async function handleSendTest() {
    if (!testEmail || !testEmail.includes("@")) {
      setTestResult({ success: false, message: "Please enter a valid email address to test." });
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await testSmtpEmailAction(testEmail);
      setTestResult(res);
    } catch {
      setTestResult({ success: false, message: "Unexpected error while testing SMTP." });
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-800 leading-relaxed">
          <strong>💡 Gmail SMTP Setup:</strong> If using Gmail, set Host to <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">smtp.gmail.com</code>, Port to <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">587</code>, enter your Gmail address, and use a <strong>16-character Google App Password</strong> (from Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords). <em>Note: Your regular Gmail login password will be rejected by Google!</em>
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
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-mono"
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
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
            {state.error}
          </p>
        )}

        {state?.success && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3.5 py-2.5 font-medium">
            SMTP email credentials updated successfully!
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="bg-brand text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
        >
          {pending ? "Saving…" : "Save SMTP Email Settings"}
        </button>
      </form>

      {/* Instant Test Email Diagnostics Box */}
      <div className="border-t border-border pt-5">
        <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>🧪</span> Send a Test Email
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Quickly verify that your SMTP server connects, authenticates, and delivers successfully.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter recipient email (e.g. sathirmon81@gmail.com)"
              className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testLoading}
              className="bg-foreground text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shrink-0 shadow-2xs"
            >
              {testLoading ? "Sending Test…" : "Send Test Email"}
            </button>
          </div>

          {testResult && (
            <div
              className={`rounded-xl px-3.5 py-2.5 text-xs border ${
                testResult.success
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <p className="font-semibold mb-0.5">{testResult.success ? "✅ Success!" : "❌ SMTP Error:"}</p>
              <p className="whitespace-pre-wrap">{testResult.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
