"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { z } from "zod";
import { creditCommission } from "@/lib/commission";
import { notifyAdmin } from "@/lib/notifications";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(session.role)) redirect("/dashboard");
  return session;
}

// ─── Admin: find a customer to bill ────────────────────────────────────────────

export async function searchUsers(query: string) {
  await requireAdmin();
  if (!query || query.trim().length < 2) return [];
  return prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, email: true, phone: true },
    take: 10,
  });
}

// ─── Admin: requests belonging to a customer that can be added to a checkout ──

export async function getCheckoutableRequests(userId: string) {
  await requireAdmin();

  const [taxiRequests, airTicketRequests, serviceRequests] = await Promise.all([
    prisma.taxiRequest.findMany({
      where: { userId, checkoutItem: null, status: { in: ["ASSIGNED", "CONFIRMED"] } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.airTicketRequest.findMany({
      where: { userId, checkoutItem: null, status: { in: ["ASSIGNED", "CONFIRMED"] } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.serviceRequest.findMany({
      where: { userId, checkoutItem: null, status: { not: "REJECTED" } },
      orderBy: { createdAt: "desc" },
      include: { service: { select: { name: true, price: true } } },
    }),
  ]);

  return { taxiRequests, airTicketRequests, serviceRequests };
}

// ─── Admin: assemble a new checkout ────────────────────────────────────────────

const customItemSchema = z.object({
  itemType: z.literal("CUSTOM"),
  description: z.string().min(2, "Enter a description"),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().min(0.01, "Enter a price"),
});

const serviceItemSchema = z.object({
  itemType: z.literal("SERVICE"),
  serviceRequestId: z.string(),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().min(0.01, "Enter a price"),
});

const linkedItemSchema = z.object({
  itemType: z.enum(["TAXI", "AIR_TICKET"]),
  requestId: z.string(),
});

export type CheckoutItemInput =
  | z.infer<typeof customItemSchema>
  | z.infer<typeof serviceItemSchema>
  | z.infer<typeof linkedItemSchema>;

export async function createCheckoutAction(
  userId: string,
  items: CheckoutItemInput[],
  discountAmount: number
): Promise<{ error?: string; checkoutId?: string }> {
  const session = await requireAdmin();

  if (items.length === 0) return { error: "Add at least one item to the checkout." };

  type BuiltItem = {
    itemType: "TAXI" | "AIR_TICKET" | "SERVICE" | "CUSTOM";
    taxiRequestId?: string;
    airTicketRequestId?: string;
    serviceRequestId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  };

  const built: BuiltItem[] = [];

  for (const rawItem of items) {
    const validated =
      rawItem.itemType === "CUSTOM"
        ? customItemSchema.safeParse(rawItem)
        : rawItem.itemType === "SERVICE"
          ? serviceItemSchema.safeParse(rawItem)
          : linkedItemSchema.safeParse(rawItem);
    if (!validated.success) return { error: validated.error.issues[0].message };
    const item = validated.data;

    switch (item.itemType) {
      case "TAXI": {
        const req = await prisma.taxiRequest.findUnique({
          where: { id: item.requestId },
          include: { checkoutItem: true },
        });
        if (!req) return { error: "Taxi request not found." };
        if (req.checkoutItem) return { error: "That taxi request is already in a checkout." };
        if (req.price == null) return { error: "Set a price on the taxi request before adding it to a checkout." };
        built.push({
          itemType: "TAXI",
          taxiRequestId: req.id,
          description: `Taxi: ${req.pickupLocation} → ${req.destination}`,
          quantity: 1,
          unitPrice: Number(req.price),
          lineTotal: Number(req.price),
        });
        break;
      }
      case "AIR_TICKET": {
        const req = await prisma.airTicketRequest.findUnique({
          where: { id: item.requestId },
          include: { checkoutItem: true },
        });
        if (!req) return { error: "Air ticket request not found." };
        if (req.checkoutItem) return { error: "That air ticket request is already in a checkout." };
        if (req.price == null) return { error: "Set a price on the air ticket request before adding it to a checkout." };
        built.push({
          itemType: "AIR_TICKET",
          airTicketRequestId: req.id,
          description: `Flight: ${req.origin} → ${req.destination}`,
          quantity: 1,
          unitPrice: Number(req.price),
          lineTotal: Number(req.price),
        });
        break;
      }
      case "SERVICE": {
        const req = await prisma.serviceRequest.findUnique({
          where: { id: item.serviceRequestId },
          include: { service: { select: { name: true } }, checkoutItem: true },
        });
        if (!req) return { error: "Service request not found." };
        if (req.checkoutItem) return { error: "That service request is already in a checkout." };
        const quantity = item.quantity || 1;
        built.push({
          itemType: "SERVICE",
          serviceRequestId: req.id,
          description: `${req.service.name} — ${req.fullName}`,
          quantity,
          unitPrice: item.unitPrice,
          lineTotal: quantity * item.unitPrice,
        });
        break;
      }
      case "CUSTOM": {
        const quantity = item.quantity || 1;
        built.push({
          itemType: "CUSTOM",
          description: item.description,
          quantity,
          unitPrice: item.unitPrice,
          lineTotal: quantity * item.unitPrice,
        });
        break;
      }
    }
  }

  const subtotal = built.reduce((sum, i) => sum + i.lineTotal, 0);
  const clampedDiscount = Math.min(Math.max(discountAmount || 0, 0), subtotal);
  const totalAmount = subtotal - clampedDiscount;

  const checkout = await prisma.checkout.create({
    data: {
      token: randomBytes(24).toString("base64url"),
      userId,
      createdById: session.userId,
      subtotal,
      discountAmount: clampedDiscount,
      totalAmount,
      status: "DRAFT",
      items: { create: built },
    },
  });

  revalidatePath("/admin/checkouts");
  return { checkoutId: checkout.id };
}

// ─── Admin: generate the public payment link ──────────────────────────────────

export async function generatePaymentLinkAction(checkoutId: string): Promise<{ error?: string; token?: string }> {
  await requireAdmin();

  const checkout = await prisma.checkout.findUnique({ where: { id: checkoutId } });
  if (!checkout) return { error: "Checkout not found." };
  if (checkout.status !== "DRAFT") return { error: "Only draft checkouts can generate a new link." };

  const updated = await prisma.checkout.update({
    where: { id: checkoutId },
    data: {
      status: "AWAITING_PAYMENT",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.notification.create({
    data: {
      userId: checkout.userId,
      title: "Booking payment link ready",
      message: `Your booking checkout for ৳${Number(checkout.totalAmount).toFixed(2)} is ready. Click to pay or view details.`,
      type: "SYSTEM",
      metadata: { link: `/pay/${updated.token}` },
    },
  });

  revalidatePath("/admin/checkouts");
  revalidatePath(`/admin/checkouts/${checkoutId}`);
  revalidatePath("/checkout");
  revalidatePath("/dashboard");
  return { token: updated.token };
}

// ─── Admin: delete a draft checkout ────────────────────────────────────────────
// Only DRAFT checkouts can be deleted — once a link has been generated
// (AWAITING_PAYMENT) or payment is involved, it must be handled through the
// normal approve/reject flow instead, never deleted outright. Deleting a
// DRAFT cascades its CheckoutItem rows (onDelete: Cascade), which frees the
// linked taxi/air-ticket/service requests to be added to a new checkout.
export async function deleteCheckoutAction(checkoutId: string): Promise<{ error?: string }> {
  await requireAdmin();

  const checkout = await prisma.checkout.findUnique({ where: { id: checkoutId }, select: { status: true } });
  if (!checkout) return { error: "Checkout not found." };
  if (checkout.status !== "DRAFT") {
    return { error: "Only draft checkouts can be deleted — this one already has a payment link or proof." };
  }

  await prisma.checkout.delete({ where: { id: checkoutId } });

  revalidatePath("/admin/checkouts");
  return {};
}

// ─── Public: customer submits payment proof ────────────────────────────────────

const proofSchema = z.object({
  paymentMethod: z.enum(["BANK_TRANSFER", "BKASH", "NAGAD", "ROCKET", "GCASH", "PAYNOW"]),
  txId: z.string().optional(),
  screenshotUrl: z.string().optional(),
});

type ProofState = { error?: string; success?: boolean } | null;

export async function submitCheckoutPaymentAction(
  token: string,
  _prev: ProofState,
  formData: FormData
): Promise<ProofState> {
  const parse = proofSchema.safeParse({
    paymentMethod: formData.get("paymentMethod"),
    txId: formData.get("txId") || undefined,
    screenshotUrl: formData.get("screenshotUrl") || undefined,
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { paymentMethod, txId, screenshotUrl } = parse.data;
  if (!txId && !screenshotUrl) {
    return { error: "Please provide a transaction ID or upload a payment screenshot." };
  }

  const checkout = await prisma.checkout.findUnique({
    where: { token },
    include: { user: { select: { fullName: true, email: true } } },
  });
  if (!checkout) return { error: "Checkout not found." };
  if (checkout.status !== "AWAITING_PAYMENT" && checkout.status !== "REJECTED") {
    return { error: "This checkout is not awaiting payment." };
  }
  if (checkout.expiresAt && checkout.expiresAt < new Date()) {
    return { error: "This payment link has expired. Please contact us for a new one." };
  }

  await prisma.checkout.update({
    where: { token },
    data: {
      paymentMethod,
      txId: txId ?? null,
      screenshotUrl: screenshotUrl ?? null,
      status: "PROOF_SUBMITTED",
      adminNote: null,
    },
  });

  await notifyAdmin({
    subject: `Payment submitted for checkout — ৳${Number(checkout.totalAmount).toFixed(2)}`,
    heading: "Checkout Payment Submitted",
    lines: [
      { label: "Customer", value: `${checkout.user.fullName} (${checkout.user.email})` },
      { label: "Amount", value: `৳${Number(checkout.totalAmount).toFixed(2)}` },
      { label: "Payment Method", value: paymentMethod },
      ...(txId ? [{ label: "Transaction ID", value: txId }] : []),
    ],
    actionPath: "/admin/checkouts",
  });

  return { success: true };
}

// ─── Shared: mark a checkout PAID and settle its linked bookings/commission ────
// Used both by admin approving a submitted proof and by an instant wallet
// payment, which needs no manual review since the balance check is authoritative.

async function settleCheckoutPaid(tx: TxClient, checkoutId: string, processedById: string | null) {
  const checkout = await tx.checkout.update({
    where: { id: checkoutId },
    data: { status: "PAID", processedById, processedAt: new Date() },
    include: {
      items: {
        include: {
          taxiRequest: { select: { referredById: true } },
          airTicketRequest: { select: { referredById: true } },
          serviceRequest: { select: { referredById: true } },
        },
      },
    },
  });

  for (const item of checkout.items) {
    if (item.taxiRequestId) {
      await tx.taxiRequest.update({ where: { id: item.taxiRequestId }, data: { status: "CONFIRMED" } });
    }
    if (item.airTicketRequestId) {
      await tx.airTicketRequest.update({ where: { id: item.airTicketRequestId }, data: { status: "CONFIRMED" } });
    }
    if (item.serviceRequestId) {
      await tx.serviceRequest.update({ where: { id: item.serviceRequestId }, data: { status: "IN_PROGRESS" } });
    }

    const referredById =
      item.taxiRequest?.referredById ??
      item.airTicketRequest?.referredById ??
      item.serviceRequest?.referredById ??
      null;
    const commissionModule = item.taxiRequestId ? "TAXI" : item.airTicketRequestId ? "AIR_TICKET" : item.serviceRequestId ? "SERVICE" : null;
    if (referredById && commissionModule) {
      await creditCommission(tx, {
        referredById,
        amount: Number(item.lineTotal),
        description: item.description,
        module: commissionModule,
      });
    }
  }

  await tx.notification.create({
    data: {
      userId: checkout.userId,
      title: "Payment received",
      message: `Your payment of ৳${Number(checkout.totalAmount).toFixed(2)} has been confirmed. Your booking(s) are now confirmed.`,
      type: "SYSTEM",
    },
  });

  return checkout;
}

// ─── Admin: approve / reject submitted proof ───────────────────────────────────

export async function approveCheckoutAction(id: string) {
  const session = await requireAdmin();

  await prisma.$transaction((tx) => settleCheckoutPaid(tx, id, session.userId));

  revalidatePath("/admin/checkouts");
  revalidatePath(`/admin/checkouts/${id}`);
}

// ─── User: pay a checkout instantly from their platform wallet ────────────────

type WalletPayState = { error?: string; success?: boolean } | null;

export async function payCheckoutWithWalletAction(token: string): Promise<WalletPayState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const checkout = await prisma.checkout.findUnique({ where: { token } });
  if (!checkout) return { error: "Checkout not found." };
  if (checkout.userId !== session.userId) return { error: "This checkout doesn't belong to your account." };
  if (checkout.status !== "AWAITING_PAYMENT" && checkout.status !== "REJECTED") {
    return { error: "This checkout is not awaiting payment." };
  }
  if (checkout.expiresAt && checkout.expiresAt < new Date()) {
    return { error: "This payment link has expired. Please contact us for a new one." };
  }

  const amount = Number(checkout.totalAmount);

  try {
    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: session.userId } });
      if (!wallet) throw new Error("Wallet not found.");
      const balanceBefore = Number(wallet.balance);
      if (balanceBefore < amount) {
        throw new Error(`Insufficient wallet balance. You need ৳${amount.toFixed(2)} but have ৳${balanceBefore.toFixed(2)}. Deposit funds first.`);
      }
      const balanceAfter = balanceBefore - amount;

      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "CHECKOUT_PAYMENT",
          amount,
          description: `Checkout payment — ${checkout.token}`,
          balanceBefore,
          balanceAfter,
        },
      });
      await tx.checkout.update({
        where: { id: checkout.id },
        data: { paymentMethod: "WALLET", txId: null, screenshotUrl: null, adminNote: null },
      });
      await settleCheckoutPaid(tx, checkout.id, null);
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Payment failed." };
  }

  revalidatePath(`/pay/${token}`);
  return { success: true };
}

export async function rejectCheckoutAction(id: string, note: string) {
  await requireAdmin();

  const checkout = await prisma.checkout.update({
    where: { id },
    data: { status: "REJECTED", adminNote: note || null },
  });

  await prisma.notification.create({
    data: {
      userId: checkout.userId,
      title: "Payment proof rejected",
      message: `We couldn't verify your payment.${note ? ` Reason: ${note}.` : ""} Please resubmit using the same link.`,
      type: "SYSTEM",
    },
  });

  revalidatePath("/admin/checkouts");
  revalidatePath(`/admin/checkouts/${id}`);
}
