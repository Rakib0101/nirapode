"use client";

import { useActionState, useState } from "react";
import { saveTwilioSettingsAction, testTwilioWhatsAppAction } from "@/app/actions/admin-settings";

type TwilioSettings = {
  accountSid: string;
  authToken: string;
  whatsappFrom: string;
  defaultContentSid: string;
};

export function TwilioSettingsForm({ settings }: { settings: TwilioSettings }) {
  const [state, action, pending] = useActionState(saveTwilioSettingsAction, null);
  const [testPhone, setTestPhone] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  async function handleSendTest() {
    if (!testPhone.trim()) {
      setTestResult({ success: false, message: "Enter a phone number to test (E.164, e.g. +8801XXXXXXXXX)." });
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await testTwilioWhatsAppAction(testPhone.trim());
      setTestResult({ success: res.success, message: res.message });
    } catch {
      setTestResult({ success: false, message: "Unexpected error while testing Twilio." });
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 leading-relaxed">
          <strong>📱 Twilio WhatsApp:</strong> takes priority over the generic WhatsApp API Gateway above when
          configured. Get these values from your{" "}
          <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
            Twilio Console
          </a>
          . On a Trial account, messages can only reach phone numbers that have first joined your WhatsApp Sandbox
          (send &quot;join &lt;your-code&gt;&quot; to your Twilio WhatsApp number) — upgrade to a paid Twilio account
          and register a real WhatsApp sender to remove that restriction.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Account SID</label>
            <input
              name="accountSid"
              type="text"
              defaultValue={settings.accountSid}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Auth Token</label>
            <input
              name="authToken"
              type="password"
              defaultValue={settings.authToken}
              placeholder="Enter your Twilio Auth Token"
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">WhatsApp From Number</label>
            <input
              name="whatsappFrom"
              type="text"
              defaultValue={settings.whatsappFrom}
              placeholder="whatsapp:+14155238886"
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Default Content Template SID <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              name="defaultContentSid"
              type="text"
              defaultValue={settings.defaultContentSid}
              placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-mono text-xs"
            />
          </div>
        </div>

        {state?.error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{state.error}</p>
        )}

        {state?.success && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3.5 py-2.5 font-medium">
            Twilio settings updated successfully!
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="bg-brand text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
        >
          {pending ? "Saving…" : "Save Twilio Settings"}
        </button>
      </form>

      <div className="border-t border-border pt-5">
        <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-3">
          <div>
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>🧪</span> Send a Test WhatsApp Message
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Verify your Twilio credentials actually deliver — the recipient must already be opted in (sandbox-joined
              or a real registered number).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+8801XXXXXXXXX"
              className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testLoading}
              className="bg-foreground text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shrink-0 shadow-2xs"
            >
              {testLoading ? "Sending Test…" : "Send Test Message"}
            </button>
          </div>

          {testResult && (
            <div
              className={`rounded-xl px-3.5 py-2.5 text-xs border ${
                testResult.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <p className="font-semibold mb-0.5">{testResult.success ? "✅ Success!" : "❌ Error:"}</p>
              <p className="whitespace-pre-wrap">{testResult.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
