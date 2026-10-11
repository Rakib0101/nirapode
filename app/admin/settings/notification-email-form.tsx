"use client";

import { useActionState, useState } from "react";
import { saveAdminNotificationEmailAction } from "@/app/actions/admin-settings";

type Props = {
  email: string | null;
  phone: string | null;
};

export function NotificationEmailForm({ email, phone }: Props) {
  const [state, action, pending] = useActionState(saveAdminNotificationEmailAction, null);
  const [emailValue, setEmailValue] = useState(email ?? "");
  const [phoneValue, setPhoneValue] = useState(phone ?? "");

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Notification Email
        </label>
        <input
          name="email"
          type="email"
          value={emailValue}
          onChange={(e) => setEmailValue(e.target.value)}
          placeholder="admin@yourcompany.com"
          className="w-full px-3.5 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-foreground font-semibold"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Notification WhatsApp Number <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          name="phone"
          type="tel"
          value={phoneValue}
          onChange={(e) => setPhoneValue(e.target.value)}
          placeholder="+65 9000 0000"
          className="w-full px-3.5 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-foreground font-semibold"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Every new purchase request, buy request, taxi/air-ticket/service request, application, deposit, withdrawal, checkout and new user signup will notify here. The WhatsApp number only works once the Automated WhatsApp API Gateway below is configured and enabled. Leave either blank to disable that channel.
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-2.5 rounded-lg">
          Notification settings saved successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brand text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Notification Settings"}
      </button>
    </form>
  );
}
