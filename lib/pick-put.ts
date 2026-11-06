import { prisma } from "@/lib/prisma";
import { creditWallet } from "@/lib/wallet";
import { notifyUser } from "@/lib/notifications";
import type { TripDirection } from "@/lib/pick-put-utils";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Today's date as a UTC-midnight Date, comparable with the DATE travelDate column.
export function todayDate(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

// Shared with the mobile API routes (cancel/reject) — mirrors the private
// refundBooking() in app/actions/pick-put.ts. Refunds a PENDING/ACCEPTED
// booking back to the customer and frees its kg on the trip; the status
// guard on the update makes a double refund impossible.
export async function refundPickPutBooking(
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

// The admin-set per-kg rate for a travel date — a direction-specific rate or
// one that covers both. When several ranges overlap, the newest one wins.
// Returns null when admin hasn't set a rate covering that date.
export async function resolvePickPutRate(travelDate: Date, direction: TripDirection): Promise<number | null> {
  const rate = await prisma.pickPutRate.findFirst({
    where: {
      startDate: { lte: travelDate },
      endDate: { gte: travelDate },
      OR: [{ direction }, { direction: null }],
    },
    orderBy: { createdAt: "desc" },
    select: { ratePerKg: true },
  });
  return rate ? Number(rate.ratePerKg) : null;
}
