"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireAdminSection } from "@/lib/admin-permissions";
import { createGcashTransfer, saveGcashSettings } from "@/lib/gcash-transfer";
import { formatMoney } from "@/lib/gcash-transfer-shared";
import { isValidImageRef } from "@/lib/storage";
import { notifyUser } from "@/lib/notifications";

type State = { error?: string; success?: boolean; message?: string } | null;

function revalidateAll() {
  revalidatePath("/services/gcash");
  revalidatePath("/admin/gcash");
}

// ── User: submit a request ───────────────────────────────────────────────────

export async function createGcashTransferAction(_prev: State, formData: FormData): Promise<State> {
  const session = await getSession();
  if (!session) redirect("/login");

  const res = await createGcashTransfer(session, {
    amountSgd: formData.get("amountSgd") as string,
    paymentMethod: formData.get("paymentMethod") as string,
    payerAccount: formData.get("payerAccount") as string,
    paymentProofUrl: (formData.get("paymentProofUrl") as string) || "",
    recipientName: formData.get("recipientName") as string,
    recipientGcashNumber: formData.get("recipientGcashNumber") as string,
    note: (formData.get("note") as string) || undefined,
  });
  if ("error" in res) return { error: res.error };

  revalidateAll();
  return {
    success: true,
    message: `Request sent. We'll check your payment and send ₱${formatMoney(res.amountPhp)} to your GCash.`,
  };
}

// ── Admin: complete (with proof of the GCash send) or reject (with reason) ──

export async function processGcashTransferAction(_prev: State, formData: FormData): Promise<State> {
  const session = await requireAdminSection("gcash");

  const id = formData.get("id") as string;
  const decision = formData.get("decision") as string;
  const adminNote = ((formData.get("adminNote") as string) ?? "").trim();
  const sentProofUrl = ((formData.get("sentProofUrl") as string) ?? "").trim();

  if (decision !== "COMPLETED" && decision !== "REJECTED") return { error: "Choose Complete or Reject." };
  if (decision === "COMPLETED" && (!sentProofUrl || !isValidImageRef(sentProofUrl))) {
    return { error: "Upload the screenshot of the GCash send first." };
  }
  if (decision === "REJECTED" && adminNote.length < 3) {
    return { error: "Give the user a reason for rejecting." };
  }

  const request = await prisma.gcashTransfer.findUnique({
    where: { id },
    include: { user: { select: { email: true, phone: true } } },
  });
  if (!request || request.status !== "PENDING") return { error: "Request not found or already processed." };

  const pesos = `₱${formatMoney(Number(request.amountPhp))}`;
  const completed = decision === "COMPLETED";

  // Guarded on status so two admins clicking at once can't both process it.
  const updated = await prisma.gcashTransfer.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: decision,
      adminNote: adminNote || null,
      sentProofUrl: completed ? sentProofUrl : null,
      processedById: session.userId,
      processedAt: new Date(),
    },
  });
  if (updated.count === 0) return { error: "Request was already processed." };

  await prisma.notification.create({
    data: {
      userId: request.userId,
      title: completed ? "GCash transfer sent" : "GCash transfer rejected",
      message: completed
        ? `${pesos} was sent to GCash ${request.recipientGcashNumber}. The proof is on your request.`
        : `Your request for ${pesos} was rejected: ${adminNote}`,
      type: "WALLET",
    },
  });

  await notifyUser({
    to: request.user.email,
    phone: request.user.phone,
    subject: completed ? "Your GCash transfer was sent" : "Your GCash transfer was rejected",
    heading: completed ? "GCash Transfer Sent" : "GCash Transfer Rejected",
    message: completed
      ? `We sent ${pesos} to your GCash. You can see the proof on the Send to GCash page.`
      : `We couldn't complete your request. Reason: ${adminNote}`,
    lines: [
      { label: "You paid", value: `S$${formatMoney(Number(request.amountSgd))}` },
      { label: "Pesos", value: pesos },
      { label: "GCash", value: `${request.recipientGcashNumber} — ${request.recipientName}` },
    ],
  });

  revalidateAll();
  return { success: true };
}

// ── Admin: rate, receiving accounts, instructions ───────────────────────────

export async function saveGcashSettingsAction(_prev: State, formData: FormData): Promise<State> {
  await requireAdminSection("gcash");
  const rate = parseFloat((formData.get("rate") as string) ?? "");
  if (!Number.isFinite(rate) || rate <= 0 || rate > 10000) return { error: "Enter a valid rate, e.g. 49.50." };
  const receiveAccounts = ((formData.get("receiveAccounts") as string) ?? "").trim();
  if (!receiveAccounts) return { error: "Add at least one account or phone number users should pay to." };
  const instructions = ((formData.get("instructions") as string) ?? "").trim();

  await saveGcashSettings({ rate, receiveAccounts, instructions });
  revalidateAll();
  return { success: true, message: "Saved." };
}
