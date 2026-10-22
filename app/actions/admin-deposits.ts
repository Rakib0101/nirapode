"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifyUser } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ActionState = { error?: string; success?: boolean } | null;

async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.role)) redirect("/dashboard");
  return session;
}

export async function processDepositAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();

  const requestId = formData.get("requestId") as string;
  const decision = formData.get("decision") as "APPROVED" | "REJECTED";
  const adminNote = (formData.get("adminNote") as string) || null;

  const request = await prisma.depositRequest.findUnique({
    where: { id: requestId, status: "PENDING" },
    include: { user: { select: { email: true, phone: true, wallet: true } } },
  });

  if (!request) return { error: "Request not found or already processed." };

  try {
    if (decision === "APPROVED") {
      await prisma.$transaction(async (tx) => {
        await tx.depositRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED", adminNote, processedById: session.userId, processedAt: new Date() },
        });

        let wallet = await tx.wallet.findUnique({ where: { userId: request.userId } });
        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId: request.userId, balance: 0 },
          });
        }

        const newBalance = Number(wallet.balance) + Number(request.amount);
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "DEPOSIT",
            amount: request.amount,
            description: `Deposit via ${request.paymentMethod} — TXN: ${request.txId}`,
            balanceBefore: wallet.balance,
            balanceAfter: newBalance,
          },
        });

        await tx.notification.create({
          data: {
            userId: request.userId,
            title: "Deposit approved",
            message: `৳${Number(request.amount).toFixed(2)} has been added to your wallet.`,
            type: "WALLET",
          },
        });
      });

      await notifyUser({
        to: request.user.email,
        phone: request.user.phone,
        subject: "Deposit approved",
        heading: "Deposit Approved",
        message: `Your deposit of ৳${Number(request.amount).toFixed(2)} has been added to your wallet.`,
        lines: [
          { label: "Payment Method", value: request.paymentMethod },
          { label: "Transaction ID", value: request.txId },
        ],
      });
    } else {
      await prisma.depositRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", adminNote, processedById: session.userId, processedAt: new Date() },
      });

      await prisma.notification.create({
        data: {
          userId: request.userId,
          title: "Deposit rejected",
          message: `Your deposit of ৳${Number(request.amount).toFixed(2)} was rejected.${adminNote ? ` Reason: ${adminNote}` : ""}`,
          type: "WALLET",
        },
      });

      await notifyUser({
        to: request.user.email,
        phone: request.user.phone,
        subject: "Deposit rejected",
        heading: "Deposit Rejected",
        message: `Your deposit of ৳${Number(request.amount).toFixed(2)} was rejected.${adminNote ? ` Reason: ${adminNote}` : ""}`,
      });
    }

    revalidatePath("/admin/deposits");
    revalidatePath("/dashboard");
    revalidatePath("/wallet");
    revalidatePath("/history");
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to process deposit:", err);
    return { error: err instanceof Error ? err.message : "Failed to process deposit." };
  }
}
