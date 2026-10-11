import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getRemindersDataAction } from "@/app/actions/reminders";
import { RemindersView } from "./reminders-view";
import Link from "next/link";

export default async function RemindersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { reminders, walletBalance, slotPrice, user } = await getRemindersDataAction();

  // Create an array of 10 slots
  const slots = Array.from({ length: 10 }, (_, i) => {
    const slotIndex = i + 1;
    const existing = reminders.find((r) => r.slotIndex === slotIndex);
    return {
      id: existing?.id,
      slotIndex,
      isUnlocked: slotIndex === 1 ? true : (existing?.isUnlocked ?? false),
      note: existing?.note,
      remindAt: existing?.remindAt,
      timezone: existing?.timezone,
      channel: existing?.channel ?? "WHATSAPP",
      isActive: existing?.isActive ?? false,
      lastSentAt: existing?.lastSentAt,
    };
  });

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/dashboard" className="hover:text-brand transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Alarm & Reminders</span>
        </div>

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Alarm & Automated Reminders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Write notes and pick target dates for passport renewal, work permits, house rent, or remittance. Alerts will be delivered to your WhatsApp or Gmail.
          </p>
        </div>

        {/* 10 Slots Component */}
        <RemindersView
          slots={slots}
          walletBalance={walletBalance}
          slotPrice={slotPrice}
          userPhone={user?.phone ?? null}
          userEmail={user?.email ?? ""}
        />
      </div>
    </div>
  );
}
