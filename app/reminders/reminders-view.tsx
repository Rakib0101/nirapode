"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { unlockSlotAction, saveReminderAction, triggerTestReminderAction } from "@/app/actions/reminders";
import { REMINDER_COUNTRIES, DEFAULT_REMINDER_TIMEZONE, utcToZonedInputs } from "@/lib/timezones";

const noopSubscribe = () => () => {};

type ReminderSlot = {
  id?: string;
  slotIndex: number;
  isUnlocked: boolean;
  note?: string | null;
  remindAt?: string | Date | null;
  timezone?: string | null;
  channel?: string;
  isActive?: boolean;
  lastSentAt?: string | Date | null;
};

export function RemindersView({
  slots,
  walletBalance,
  slotPrice,
  userPhone,
  userEmail,
}: {
  slots: ReminderSlot[];
  walletBalance: number;
  slotPrice: number;
  userPhone: string | null;
  userEmail: string;
}) {
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ slotIndex: number; text: string; error?: boolean } | null>(null);
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);

  async function handleUnlock(slotIndex: number) {
    if (walletBalance < slotPrice) {
      alert(`Your wallet balance (৳${walletBalance.toFixed(2)}) is less than the slot unlock price (৳${slotPrice.toFixed(2)}). Please deposit funds first.`);
      return;
    }

    if (!confirm(`Unlock Slot #${slotIndex} for ৳${slotPrice} from your platform wallet balance?`)) {
      return;
    }

    setLoadingSlot(slotIndex);
    setMsg(null);
    const res = await unlockSlotAction(slotIndex);
    setLoadingSlot(null);
    if ("error" in res && res.error) {
      setMsg({ slotIndex, text: res.error, error: true });
    } else if ("message" in res) {
      setMsg({ slotIndex, text: res.message ?? "Unlocked!", error: false });
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>, slotIndex: number) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoadingSlot(slotIndex);
    setMsg(null);
    const res = await saveReminderAction(fd);
    setLoadingSlot(null);
    if ("error" in res && res.error) {
      setMsg({ slotIndex, text: res.error, error: true });
    } else if ("message" in res) {
      setMsg({ slotIndex, text: res.message ?? "Saved!", error: false });
    }
  }

  async function handleTest(slotIndex: number, note: string) {
    setLoadingSlot(slotIndex);
    setMsg(null);

    const res = await triggerTestReminderAction(slotIndex);
    setLoadingSlot(null);

    if ("error" in res && res.error) {
      setMsg({ slotIndex, text: res.error, error: true });
    } else {
      if ("waApiSuccess" in res && res.waApiSuccess) {
        setMsg({ slotIndex, text: "✅ Automated Alert sent directly to your WhatsApp & Email!", error: false });
      } else {
        // Fallback: If automated WhatsApp Gateway is not yet configured by admin, open the user's direct chat
        const rawNote = `🔔 Singapore Probashi Reminder (Slot #${slotIndex}):\n\n${note}`;
        if (userPhone) {
          const digits = userPhone.replace(/[^\d]/g, "");
          window.open(`https://wa.me/${digits}?text=${encodeURIComponent(rawNote)}`, "_blank");
        } else {
          window.open(`https://wa.me/?text=${encodeURIComponent(rawNote)}`, "_blank");
        }
        setMsg({ slotIndex, text: "Email sent & WhatsApp chat opened!", error: false });
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Wallet info bar */}
      <div className="bg-white rounded-2xl border border-border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand text-lg">
            ⏰
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">Automated Reminder Alarm System</p>
            <p className="text-xs text-muted-foreground">
              Slot #1 is FREE. Slots 2–10 can be unlocked for ৳{slotPrice} each.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-muted-foreground block">Platform Wallet</span>
            <span className="text-sm font-bold text-brand">৳{walletBalance.toFixed(2)}</span>
          </div>
          <Link
            href="/dashboard/deposit"
            className="px-3.5 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-2xs"
          >
            + Deposit
          </Link>
        </div>
      </div>

      {/* Grid of 10 slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {slots.map((s) => {
          const isSlotFree = s.slotIndex === 1;
          const isUnlocked = isSlotFree || s.isUnlocked;
          const defaultTimezone = s.timezone || DEFAULT_REMINDER_TIMEZONE;
          const local = isClient && s.remindAt ? utcToZonedInputs(new Date(s.remindAt), defaultTimezone) : null;
          const defaultDate = local?.date ?? "";
          const defaultTime = local?.time ?? "09:00";
          const wasSent = Boolean(s.lastSentAt && !s.isActive && s.note);

          return (
            <div
              key={s.slotIndex}
              className={`rounded-2xl border transition-all ${
                isUnlocked
                  ? "bg-white border-border shadow-xs"
                  : "bg-muted/40 border-dashed border-border"
              }`}
            >
              {/* Card Header */}
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand-50 text-brand font-bold text-xs flex items-center justify-center">
                    {s.slotIndex}
                  </span>
                  <span className="font-semibold text-sm text-foreground">
                    Reminder Slot #{s.slotIndex}
                  </span>
                  {isSlotFree && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      FREE
                    </span>
                  )}
                </div>

                {!isUnlocked && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    🔒 Locked
                  </span>
                )}
                {isUnlocked && s.isActive && s.remindAt && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    ⏰ Scheduled
                  </span>
                )}
                {isUnlocked && wasSent && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    ✓ Sent
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5">
                {isUnlocked ? (
                  <form key={isClient ? "client" : "server"} onSubmit={(e) => handleSave(e, s.slotIndex)} className="space-y-4">
                    <input type="hidden" name="slotIndex" value={s.slotIndex} />

                    {/* Note input */}
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Reminder Note / Task
                      </label>
                      <textarea
                        name="note"
                        rows={2}
                        defaultValue={s.note ?? ""}
                        required
                        placeholder="e.g. Work permit renewal, send remittance home, passport expiry"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
                      />
                    </div>

                    {/* Date + Time selection + Country + Channel */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Remind On Date
                        </label>
                        <input
                          type="date"
                          name="remindAt"
                          defaultValue={defaultDate}
                          required
                          className="w-full text-xs px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Alarm Time
                        </label>
                        <input
                          type="time"
                          name="remindTime"
                          defaultValue={defaultTime}
                          required
                          className="w-full text-xs px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Country
                        </label>
                        <select
                          name="timezone"
                          defaultValue={defaultTimezone}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-foreground bg-white"
                        >
                          {REMINDER_COUNTRIES.map((c) => (
                            <option key={c.timezone} value={c.timezone}>{c.country}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Notification Via
                        </label>
                        <select
                          name="channel"
                          defaultValue={s.channel ?? "WHATSAPP"}
                          className="w-full text-xs px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-foreground bg-white"
                        >
                          <option value="WHATSAPP">WhatsApp</option>
                          <option value="GMAIL">Gmail / Email</option>
                          <option value="BOTH">WhatsApp & Gmail</option>
                        </select>
                      </div>
                    </div>

                    {msg && msg.slotIndex === s.slotIndex && (
                      <p className={`text-xs font-medium ${msg.error ? "text-red-600" : "text-green-600"}`}>
                        {msg.text}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={loadingSlot === s.slotIndex}
                        className="flex-1 bg-brand text-white text-xs font-semibold py-2 px-4 rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {loadingSlot === s.slotIndex ? "Saving…" : "Save Reminder"}
                      </button>

                      {s.note && (
                        <button
                          type="button"
                          onClick={() => handleTest(s.slotIndex, s.note!)}
                          disabled={loadingSlot === s.slotIndex}
                          className="px-3 py-2 text-xs font-semibold text-brand bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors cursor-pointer"
                          title="Test send to WhatsApp / Email"
                        >
                          🔔 Send Alert Now
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl mx-auto text-muted-foreground">
                      🔒
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">Slot #{s.slotIndex} is Locked</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Unlock this slot for a one-time fee of ৳{slotPrice} from your wallet.
                      </p>
                    </div>

                    {msg && msg.slotIndex === s.slotIndex && (
                      <p className={`text-xs font-medium ${msg.error ? "text-red-600" : "text-green-600"}`}>
                        {msg.text}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleUnlock(s.slotIndex)}
                      disabled={loadingSlot === s.slotIndex}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-dark transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      {loadingSlot === s.slotIndex ? "Unlocking…" : `Unlock Slot for ৳${slotPrice}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
