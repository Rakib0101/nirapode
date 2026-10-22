"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { creditWallet, debitWallet } from "@/lib/wallet";
import { notifyAdmin, notifyUser } from "@/lib/notifications";
import { resolvePickPutRate, todayDate } from "@/lib/pick-put";
import { DIRECTION_LABELS, bookingTotal, formatTravelDate, roundKg } from "@/lib/pick-put-utils";

type ActionState = { error?: string; success?: boolean; message?: string } | null;
type Result = { error?: string; success?: boolean };

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

async function requireAdmin() {
  const session = await requireUser();
  if (!ADMIN_ROLES.includes(session.role)) redirect("/dashboard");
  return session;
}

function revalidatePickPut() {
  revalidatePath("/pick-put", "layout");
  revalidatePath("/admin/pick-put");
  revalidatePath("/wallet");
  revalidatePath("/dashboard");
}

// Refunds a PENDING/ACCEPTED booking back to the customer and frees its kg on
// the trip. The status guard on the update makes a double refund impossible.
async function refundBooking(
  tx: TxClient,
  bookingId: string,
  status: "REJECTED" | "CANCELLED",
  reason: string,
  adminNote?: string | null
): Promise<void> {
  const { count } = await tx.pickPutBooking.updateMany({
    where: { id: bookingId, status: { in: ["PENDING", "ACCEPTED"] } },
    data: { status, ...(adminNote !== undefined ? { adminNote } : {}) },
  });
  if (count === 0) throw new Error("Booking is already settled.");

  const booking = await tx.pickPutBooking.findUniqueOrThrow({ where: { id: bookingId } });
  await tx.pickPutTrip.update({
    where: { id: booking.tripId },
    data: { bookedKg: { decrement: booking.weightKg } },
  });
  await creditWallet(tx, {
    userId: booking.customerId,
    amount: Number(booking.totalAmount),
    type: "REFUND",
    description: `Pick & Put refund — ${reason}`,
    referenceId: booking.id,
  });
  const message = `Your ${Number(booking.weightKg)} kg booking was ${status.toLowerCase()} (${reason}). ৳${Number(booking.totalAmount).toFixed(2)} has been refunded to your wallet.`;
  await tx.notification.create({
    data: {
      userId: booking.customerId,
      title: `Pick & Put booking ${status.toLowerCase()}`,
      message,
      type: "WALLET",
    },
  });

  const customer = await tx.user.findUnique({ where: { id: booking.customerId }, select: { email: true, phone: true } });
  if (customer) {
    await notifyUser({
      to: customer.email,
      phone: customer.phone,
      subject: `Pick & Put booking ${status.toLowerCase()}`,
      heading: status === "REJECTED" ? "Booking Rejected" : "Booking Cancelled",
      message,
    });
  }
}

async function run(fn: () => Promise<void>): Promise<Result> {
  try {
    await fn();
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Something went wrong. Please try again." };
  }
  revalidatePickPut();
  return { success: true };
}

// ── Traveler: post a trip with spare luggage space ──────────────────────────

const tripSchema = z.object({
  direction: z.enum(["SG_TO_BD", "BD_TO_SG"], { message: "Choose a travel direction" }),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select your travel date"),
  flightInfo: z.string().trim().max(100).optional(),
  totalKg: z.coerce.number().min(1, "Offer at least 1 kg").max(100, "Maximum 100 kg"),
  notes: z.string().trim().max(500).optional(),
});

export async function createTripAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();

  const parse = tripSchema.safeParse({
    direction: formData.get("direction"),
    travelDate: formData.get("travelDate"),
    flightInfo: formData.get("flightInfo") || undefined,
    totalKg: formData.get("totalKg"),
    notes: formData.get("notes") || undefined,
  });
  if (!parse.success) return { error: parse.error.issues[0].message };

  const { direction, flightInfo, notes } = parse.data;
  const travelDate = new Date(parse.data.travelDate);
  const totalKg = roundKg(parse.data.totalKg);
  if (travelDate < todayDate()) return { error: "Travel date can't be in the past." };

  // Locked now from the admin rate for this date; 0 means no rate is set yet
  // and admin must enter one when approving.
  const ratePerKg = (await resolvePickPutRate(travelDate, direction)) ?? 0;

  await prisma.pickPutTrip.create({
    data: {
      travelerId: session.userId,
      direction,
      travelDate,
      flightInfo: flightInfo ?? null,
      totalKg,
      ratePerKg,
      notes: notes ?? null,
    },
  });

  await notifyAdmin({
    subject: `New Pick & Put trip — ${formatTravelDate(travelDate)}`,
    heading: "New Pick & Put Trip",
    lines: [
      { label: "Traveler", value: `${session.fullName} (${session.email})` },
      { label: "Route", value: DIRECTION_LABELS[direction] },
      { label: "Date", value: formatTravelDate(travelDate) },
      { label: "Space", value: `${totalKg} kg` },
      { label: "Rate", value: ratePerKg > 0 ? `৳${ratePerKg.toFixed(2)}/kg` : "Not set — set it on approval" },
    ],
    actionPath: "/admin/pick-put",
  });

  revalidatePickPut();
  return { success: true, message: "Your trip has been submitted. It will be listed once admin approves it." };
}

export async function closeTripAction(tripId: string): Promise<Result> {
  const session = await requireUser();
  const trip = await prisma.pickPutTrip.findUnique({ where: { id: tripId }, select: { travelerId: true } });
  if (!trip) return { error: "Trip not found." };
  if (trip.travelerId !== session.userId && !ADMIN_ROLES.includes(session.role)) return { error: "Not allowed." };

  return run(async () => {
    await prisma.pickPutTrip.update({ where: { id: tripId }, data: { status: "CLOSED" } });
  });
}

// ── Customer: book space on a trip (paid from wallet, held in escrow) ───────

const bookingSchema = z.object({
  tripId: z.string().min(1),
  weightKg: z.coerce.number().min(0.5, "Minimum 0.5 kg").max(100),
  itemDescription: z.string().trim().min(3, "Describe what you're sending").max(500),
  receiverName: z.string().trim().min(2, "Enter the receiver's name").max(100),
  receiverPhone: z.string().trim().min(6, "Enter the receiver's phone").max(30),
  receiverAddress: z.string().trim().max(300).optional(),
});

export async function bookTripAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireUser();

  const parse = bookingSchema.safeParse({
    tripId: formData.get("tripId"),
    weightKg: formData.get("weightKg"),
    itemDescription: formData.get("itemDescription"),
    receiverName: formData.get("receiverName"),
    receiverPhone: formData.get("receiverPhone"),
    receiverAddress: formData.get("receiverAddress") || undefined,
  });
  if (!parse.success) return { error: parse.error.issues[0].message };

  const { tripId, itemDescription, receiverName, receiverPhone, receiverAddress } = parse.data;
  const weightKg = roundKg(parse.data.weightKg);

  const trip = await prisma.pickPutTrip.findUnique({
    where: { id: tripId },
    include: { traveler: { select: { fullName: true } } },
  });
  if (!trip || trip.status !== "OPEN" || trip.travelDate < todayDate()) {
    return { error: "This trip is no longer taking bookings." };
  }
  if (trip.travelerId === session.userId) return { error: "You can't book space on your own trip." };

  const ratePerKg = Number(trip.ratePerKg);
  const totalAmount = bookingTotal(weightKg, ratePerKg);

  try {
    await prisma.$transaction(async (tx) => {
      // Reserve the kg atomically so two customers can't overbook the same space.
      const reserved = await tx.$executeRaw`
        UPDATE "PickPutTrip"
        SET "bookedKg" = "bookedKg" + ${weightKg}::numeric, "updatedAt" = NOW()
        WHERE "id" = ${tripId} AND "status" = 'OPEN' AND "bookedKg" + ${weightKg}::numeric <= "totalKg"
      `;
      if (reserved === 0) {
        const left = roundKg(Number(trip.totalKg) - Number(trip.bookedKg));
        throw new Error(`Only ${Math.max(left, 0)} kg is still available on this trip.`);
      }

      const booking = await tx.pickPutBooking.create({
        data: {
          tripId,
          customerId: session.userId,
          weightKg,
          ratePerKg,
          totalAmount,
          itemDescription,
          receiverName,
          receiverPhone,
          receiverAddress: receiverAddress ?? null,
        },
      });

      await debitWallet(tx, {
        userId: session.userId,
        amount: totalAmount,
        type: "PICKPUT_PAYMENT",
        description: `Pick & Put — ${weightKg} kg with ${trip.traveler.fullName} (${formatTravelDate(trip.travelDate)})`,
        referenceId: booking.id,
      });

      await tx.notification.create({
        data: {
          userId: trip.travelerId,
          title: "New Pick & Put booking",
          message: `${session.fullName} booked ${weightKg} kg on your ${formatTravelDate(trip.travelDate)} trip. Accept or reject it from My Pick & Put.`,
          type: "SYSTEM",
        },
      });
    });
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Booking failed. Please try again." };
  }

  await notifyAdmin({
    subject: `New Pick & Put booking — ${weightKg} kg`,
    heading: "New Pick & Put Booking",
    lines: [
      { label: "Customer", value: `${session.fullName} (${session.email})` },
      { label: "Traveler", value: trip.traveler.fullName },
      { label: "Date", value: formatTravelDate(trip.travelDate) },
      { label: "Weight", value: `${weightKg} kg × ৳${ratePerKg.toFixed(2)}` },
      { label: "Paid (held)", value: `৳${totalAmount.toFixed(2)}` },
    ],
    actionPath: "/admin/pick-put",
  });

  revalidatePickPut();
  return {
    success: true,
    message: `৳${totalAmount.toFixed(2)} paid from your wallet and held safely until delivery. The traveler will confirm your booking.`,
  };
}

export async function cancelBookingAction(bookingId: string): Promise<Result> {
  const session = await requireUser();
  const booking = await prisma.pickPutBooking.findUnique({ where: { id: bookingId }, select: { customerId: true, status: true } });
  if (!booking || booking.customerId !== session.userId) return { error: "Booking not found." };
  if (booking.status !== "PENDING") return { error: "Only bookings not yet accepted can be cancelled. Contact admin for help." };

  return run(() => prisma.$transaction((tx) => refundBooking(tx, bookingId, "CANCELLED", "cancelled by you")));
}

// ── Traveler (or admin): accept / reject a booking ──────────────────────────

async function loadBookingForTraveler(bookingId: string) {
  const session = await requireUser();
  const booking = await prisma.pickPutBooking.findUnique({
    where: { id: bookingId },
    include: { trip: { select: { travelerId: true } }, customer: { select: { email: true, phone: true } } },
  });
  if (!booking) return { error: "Booking not found." } as const;
  const isAdmin = ADMIN_ROLES.includes(session.role);
  if (booking.trip.travelerId !== session.userId && !isAdmin) return { error: "Not allowed." } as const;
  return { booking, isAdmin } as const;
}

export async function acceptBookingAction(bookingId: string): Promise<Result> {
  const loaded = await loadBookingForTraveler(bookingId);
  if ("error" in loaded) return { error: loaded.error };

  return run(async () => {
    const { count } = await prisma.pickPutBooking.updateMany({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "ACCEPTED" },
    });
    if (count === 0) throw new Error("Booking is no longer pending.");
    const message = `Your ${Number(loaded.booking.weightKg)} kg booking was accepted. You can now contact the traveler from My Pick & Put to hand over the items.`;
    await prisma.notification.create({
      data: {
        userId: loaded.booking.customerId,
        title: "Pick & Put booking accepted",
        message,
        type: "SYSTEM",
      },
    });
    await notifyUser({
      to: loaded.booking.customer.email,
      phone: loaded.booking.customer.phone,
      subject: "Pick & Put booking accepted",
      heading: "Booking Accepted",
      message,
    });
  });
}

export async function rejectBookingAction(bookingId: string, note?: string): Promise<Result> {
  const loaded = await loadBookingForTraveler(bookingId);
  if ("error" in loaded) return { error: loaded.error };
  // Once accepted, only admin can unwind it (the traveler may already hold the items).
  if (loaded.booking.status === "ACCEPTED" && !loaded.isAdmin) {
    return { error: "This booking is already accepted — contact admin to cancel it." };
  }

  return run(() =>
    prisma.$transaction((tx) =>
      refundBooking(tx, bookingId, "REJECTED", loaded.isAdmin ? "rejected by admin" : "declined by the traveler", note?.trim() || null)
    )
  );
}

// ── Admin: trips, delivery payout, rates ────────────────────────────────────

export async function approveTripAction(tripId: string, ratePerKg: number, note?: string): Promise<Result> {
  await requireAdmin();
  if (!(ratePerKg > 0)) return { error: "Set a per-kg rate greater than 0." };

  return run(async () => {
    const trip = await prisma.pickPutTrip.update({
      where: { id: tripId, status: "PENDING" },
      data: { status: "OPEN", ratePerKg: Math.round(ratePerKg * 100) / 100, adminNote: note?.trim() || null },
      include: { traveler: { select: { email: true, phone: true } } },
    });
    const message = `Your ${formatTravelDate(trip.travelDate)} trip is now listed at ৳${Number(trip.ratePerKg).toFixed(2)}/kg. You'll be notified when someone books space.`;
    await prisma.notification.create({
      data: {
        userId: trip.travelerId,
        title: "Your Pick & Put trip is live",
        message,
        type: "SYSTEM",
      },
    });
    await notifyUser({
      to: trip.traveler.email,
      phone: trip.traveler.phone,
      subject: "Your Pick & Put trip is live",
      heading: "Trip Approved",
      message,
    });
  });
}

export async function rejectTripAction(tripId: string, note?: string): Promise<Result> {
  await requireAdmin();
  return run(async () => {
    const trip = await prisma.pickPutTrip.update({
      where: { id: tripId, status: "PENDING" },
      data: { status: "REJECTED", adminNote: note?.trim() || null },
      include: { traveler: { select: { email: true, phone: true } } },
    });
    const message = `Your ${formatTravelDate(trip.travelDate)} trip was not approved.${note?.trim() ? ` Reason: ${note.trim()}` : ""}`;
    await prisma.notification.create({
      data: {
        userId: trip.travelerId,
        title: "Pick & Put trip not approved",
        message,
        type: "SYSTEM",
      },
    });
    await notifyUser({
      to: trip.traveler.email,
      phone: trip.traveler.phone,
      subject: "Pick & Put trip not approved",
      heading: "Trip Not Approved",
      message,
    });
  });
}

// Releases the held payment to the traveler once the items are delivered.
export async function markDeliveredAction(bookingId: string): Promise<Result> {
  await requireAdmin();
  return run(() =>
    prisma.$transaction(async (tx) => {
      const { count } = await tx.pickPutBooking.updateMany({
        where: { id: bookingId, status: "ACCEPTED" },
        data: { status: "DELIVERED" },
      });
      if (count === 0) throw new Error("Only accepted bookings can be marked delivered.");

      const booking = await tx.pickPutBooking.findUniqueOrThrow({
        where: { id: bookingId },
        include: {
          trip: { select: { travelerId: true, travelDate: true, traveler: { select: { email: true, phone: true } } } },
          customer: { select: { email: true, phone: true } },
        },
      });
      await creditWallet(tx, {
        userId: booking.trip.travelerId,
        amount: Number(booking.totalAmount),
        type: "PICKPUT_EARNING",
        description: `Pick & Put delivery — ${Number(booking.weightKg)} kg (${formatTravelDate(booking.trip.travelDate)})`,
        referenceId: booking.id,
      });
      const travelerMessage = `৳${Number(booking.totalAmount).toFixed(2)} for delivering ${Number(booking.weightKg)} kg has been added to your wallet.`;
      const customerMessage = `Your ${Number(booking.weightKg)} kg shipment has been marked as delivered.`;
      await tx.notification.createMany({
        data: [
          {
            userId: booking.trip.travelerId,
            title: "Pick & Put payment received",
            message: travelerMessage,
            type: "WALLET",
          },
          {
            userId: booking.customerId,
            title: "Pick & Put delivered",
            message: customerMessage,
            type: "SYSTEM",
          },
        ],
      });
      await notifyUser({
        to: booking.trip.traveler.email,
        phone: booking.trip.traveler.phone,
        subject: "Pick & Put payment received",
        heading: "Payment Received",
        message: travelerMessage,
      });
      await notifyUser({
        to: booking.customer.email,
        phone: booking.customer.phone,
        subject: "Pick & Put delivered",
        heading: "Shipment Delivered",
        message: customerMessage,
      });
    })
  );
}

const rateSchema = z
  .object({
    direction: z.enum(["BOTH", "SG_TO_BD", "BD_TO_SG"]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a start date"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select an end date"),
    ratePerKg: z.coerce.number().positive("Enter a rate greater than 0"),
    note: z.string().trim().max(200).optional(),
  })
  .refine((d) => d.endDate >= d.startDate, { message: "End date must be on or after the start date" });

export async function createRateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parse = rateSchema.safeParse({
    direction: formData.get("direction"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    ratePerKg: formData.get("ratePerKg"),
    note: formData.get("note") || undefined,
  });
  if (!parse.success) return { error: parse.error.issues[0].message };

  const { direction, startDate, endDate, ratePerKg, note } = parse.data;
  await prisma.pickPutRate.create({
    data: {
      direction: direction === "BOTH" ? null : direction,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      ratePerKg: Math.round(ratePerKg * 100) / 100,
      note: note ?? null,
    },
  });

  revalidatePickPut();
  return { success: true };
}

export async function deleteRateAction(rateId: string): Promise<Result> {
  await requireAdmin();
  return run(async () => {
    await prisma.pickPutRate.delete({ where: { id: rateId } });
  });
}
