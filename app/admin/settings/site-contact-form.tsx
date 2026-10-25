"use client";

import { useActionState } from "react";
import { saveSiteContactSettingsAction } from "@/app/actions/admin-settings";
import type { SiteContactSettings } from "@/lib/site-contact-types";

export function SiteContactForm({ settings }: { settings: SiteContactSettings }) {
  const [state, action, pending] = useActionState(saveSiteContactSettingsAction, null);

  return (
    <form action={action} className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 leading-relaxed">
        <strong>🌐 Public Contact & Social Links:</strong> These contact details appear across the website footer, Contact Support page, Taxi & Air Ticket urgent contact buttons, and Privacy policy.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            WhatsApp Support Number <span className="text-red-500">*</span>
          </label>
          <input
            name="whatsappNumber"
            type="text"
            required
            defaultValue={settings.whatsappNumber}
            placeholder="e.g. +65 8123 4567 or +880 1712 345678"
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-mono font-medium"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Include country code (+65 for Singapore, +880 for Bangladesh). Used for all 1-click WhatsApp buttons.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Support Email Address <span className="text-red-500">*</span>
          </label>
          <input
            name="supportEmail"
            type="email"
            required
            defaultValue={settings.supportEmail}
            placeholder="support@nirapode.com"
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Displayed on Contact Support page and Privacy policy.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Hotline / Phone Number
          </label>
          <input
            name="supportPhone"
            type="text"
            defaultValue={settings.supportPhone}
            placeholder="+65 8123 4567"
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Facebook Page / Group URL
          </label>
          <input
            name="facebookUrl"
            type="url"
            defaultValue={settings.facebookUrl}
            placeholder="https://facebook.com/groups/nirapode"
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-foreground mb-1">
            Default WhatsApp Pre-filled Message
          </label>
          <input
            name="whatsappMessage"
            type="text"
            defaultValue={settings.whatsappMessage}
            placeholder="Hello Nirapode Support, I would like to inquire about..."
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Office Address
          </label>
          <input
            name="officeAddress"
            type="text"
            defaultValue={settings.officeAddress}
            placeholder="Mustafa Centre Area, Little India, Singapore"
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Business / Office Hours
          </label>
          <input
            name="officeHours"
            type="text"
            defaultValue={settings.officeHours}
            placeholder="Mon–Sat: 10am – 8pm SGT (Sunday: Closed)"
            className="w-full text-sm px-3.5 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {state.error}
        </p>
      )}

      {state?.success && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          Site contact and WhatsApp settings updated successfully!
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
      >
        {pending ? "Saving…" : "Save Contact & Social Settings"}
      </button>
    </form>
  );
}
