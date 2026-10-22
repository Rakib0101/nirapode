"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getReferredByAgentId } from "@/lib/commission";
import { notifyAdmin, notifyUser } from "@/lib/notifications";

type ActionState = { error?: string; success?: boolean; message?: string } | null;
type BookingStatus = "PENDING" | "ASSIGNED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(session.role)) redirect("/dashboard");
  return session;
}

const airTicketSchema = z.object({
  origin: z.string().min(2, "Enter origin"),
  destination: z.string().min(2, "Enter destination"),
  departDate: z.string().min(1, "Select a departure date"),
  returnDate: z.string().optional(),
  passengers: z.coerce.number().int().min(1).max(10),
  preferredAirline: z.enum(["Biman Bangladesh Airlines", "Singapore Airlines", "US-Bangla Airlines", "AirAsia"]),
  notes: z.string().optional(),
});

export async function requestAirTicketAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parse = airTicketSchema.safeParse({
    origin: formData.get("origin"),
    destination: formData.get("destination"),
    departDate: formData.get("departDate"),
    returnDate: formData.get("returnDate") || undefined,
    passengers: formData.get("passengers"),
    preferredAirline: formData.get("preferredAirline"),
    notes: formData.get("notes") || undefined,
  });

  if (!parse.success) return { error: parse.error.issues[0].message };

  const { origin, destination, departDate, returnDate, passengers, preferredAirline, notes } = parse.data;

  const referredById = await getReferredByAgentId(session.userId);

  await prisma.airTicketRequest.create({
    data: {
      userId: session.userId,
      origin,
      destination,
      departDate: new Date(departDate),
      returnDate: returnDate ? new Date(returnDate) : null,
      passengers,
      preferredAirline,
      notes: notes ?? null,
      referredById,
    },
  });

  await prisma.notification.create({
    data: {
      userId: session.userId,
      title: "Air ticket booking requested",
      message: `Your flight request from ${origin} to ${destination} (${preferredAirline}) has been submitted. We'll contact you within 1 hour to discuss options.`,
      type: "SYSTEM",
    },
  });

  await notifyAdmin({
    subject: `New air ticket request — ${origin} → ${destination}`,
    heading: "New Air Ticket Request",
    lines: [
      { label: "Requested by", value: `${session.fullName} (${session.email})` },
      { label: "Origin", value: origin },
      { label: "Destination", value: destination },
      { label: "Depart", value: new Date(departDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
      { label: "Airline", value: preferredAirline },
      { label: "Passengers", value: String(passengers) },
    ],
    actionPath: "/admin/air-ticket",
  });

  revalidatePath("/air-ticket/my");
  revalidatePath("/dashboard");
  return { success: true, message: "Air ticket request submitted! We'll contact you within 1 hour to discuss options." };
}

// ─── Admin: staff list for "assign to manager" ────────────────────────────────

export async function getAirTicketStaff() {
  await requireAdmin();
  return prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] } },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: "asc" },
  });
}

// ─── Admin: assign an internal manager + set price ────────────────────────────

export async function assignAirTicketRequestAction(
  requestId: string,
  data: { assignedManagerId: string; price: number; adminNote?: string }
): Promise<{ error?: string }> {
  const session = await requireAdmin();

  const request = await prisma.airTicketRequest.findUnique({ where: { id: requestId } });
  if (!request) return { error: "Request not found." };

  await prisma.airTicketRequest.update({
    where: { id: requestId },
    data: {
      price: data.price,
      assignedManagerId: data.assignedManagerId,
      adminNote: data.adminNote || null,
      processedById: session.userId,
      processedAt: new Date(),
      status: request.status === "PENDING" ? "ASSIGNED" : request.status,
    },
  });

  const manager = await prisma.user.findUnique({ where: { id: data.assignedManagerId } });

  await prisma.notification.create({
    data: {
      userId: request.userId,
      title: "Air ticket request assigned",
      message: `Your air ticket request from ${request.origin} to ${request.destination} has been assigned to ${manager?.fullName ?? "our team"}. Price: ৳${Number(data.price).toFixed(2)}.`,
      type: "SYSTEM",
    },
  });

  revalidatePath("/admin/air-ticket");
  revalidatePath("/air-ticket/my");
  return {};
}

// ─── Admin: update request status ─────────────────────────────────────────────

export async function updateAirTicketStatusAction(
  id: string,
  status: BookingStatus,
  adminNote?: string,
  ticketUrl?: string,
  farePrice?: number
): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin();

  const existing = await prisma.airTicketRequest.findUnique({
    where: { id },
    include: { user: { select: { email: true, phone: true } } },
  });
  if (!existing) return { error: "Request not found." };

  const effectiveFare = farePrice !== undefined ? farePrice : (existing.price ? Number(existing.price) : 0);

  // Deduct fare from customer's platform balance upon confirmation if price is set and not already confirmed
  if (status === "CONFIRMED" && existing.status !== "CONFIRMED" && effectiveFare > 0) {
    const userWallet = await prisma.wallet.findUnique({ where: { userId: existing.userId } });
    if (!userWallet || Number(userWallet.balance) < effectiveFare) {
      return {
        error: `Customer has insufficient platform wallet balance (৳${Number(userWallet?.balance ?? 0).toFixed(2)}) for this flight fare of ৳${effectiveFare.toFixed(2)}.`,
      };
    }
    const newBal = Number(userWallet.balance) - effectiveFare;
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: userWallet.id },
        data: { balance: newBal },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: userWallet.id,
          type: "CHECKOUT_PAYMENT",
          amount: effectiveFare,
          description: `Air ticket fare deduction: ${existing.origin} → ${existing.destination}`,
          balanceBefore: userWallet.balance,
          balanceAfter: newBal,
        },
      }),
    ]);
  }

  const dataToUpdate: any = { status, adminNote: adminNote || null };
  if (farePrice !== undefined) {
    dataToUpdate.price = farePrice;
  }
  if (ticketUrl) {
    dataToUpdate.ticketUrl = ticketUrl;
  }

  const request = await prisma.airTicketRequest.update({
    where: { id },
    data: dataToUpdate,
  });

  const STATUS_MESSAGES: Partial<Record<BookingStatus, string>> = {
    CONFIRMED: ticketUrl
      ? "Your flight booking has been confirmed! Your E-Ticket has been attached and is ready for download."
      : "Your air ticket booking has been confirmed.",
    COMPLETED: "Your air ticket trip is marked as completed. Thanks for flying with us!",
    CANCELLED: "Your air ticket request has been cancelled.",
  };

  if (STATUS_MESSAGES[status]) {
    await prisma.notification.create({
      data: {
        userId: request.userId,
        title: "Air ticket request update",
        message: STATUS_MESSAGES[status]!,
        type: "SYSTEM",
      },
    });

    await notifyUser({
      to: existing.user.email,
      phone: existing.user.phone,
      subject: "Air ticket request update",
      heading: "Air Ticket Request Update",
      message: STATUS_MESSAGES[status]!,
    });
  }

  revalidatePath("/admin/air-ticket");
  revalidatePath("/air-ticket/my");
  revalidatePath("/dashboard");
  revalidatePath("/wallet");
  return { success: true };
}
