import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { debitWallet } from "@/lib/wallet";
import { notifyAdmin } from "@/lib/notifications";
import { todayDate } from "@/lib/pick-put";
import { bookingTotal, formatTravelDate, roundKg } from "@/lib/pick-put-utils";
import { z } from "zod";

// Mirrors app/actions/pick-put.ts bookTripAction exactly.
const bookingSchema = z.object({
  weightKg: z.coerce.number().min(0.5, "Minimum 0.5 kg").max(100),
  itemDescription: z.string().trim().min(3, "Describe what you're sending").max(500),
  receiverName: z.string().trim().min(2, "Enter the receiver's name").max(100),
  receiverPhone: z.string().trim().min(6, "Enter the receiver's phone").max(30),
  receiverAddress: z.string().trim().max(300).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { id: tripId } = await params;
    const body = await req.json();
    const parse = bookingSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { itemDescription, receiverName, receiverPhone, receiverAddress } = parse.data;
    const weightKg = roundKg(parse.data.weightKg);

    const trip = await prisma.pickPutTrip.findUnique({
      where: { id: tripId },
      include: { traveler: { select: { fullName: true } } },
    });
    if (!trip || trip.status !== "OPEN" || trip.travelDate < todayDate()) {
      return Response.json({ error: "This trip is no longer taking bookings." }, { status: 400 });
    }
    if (trip.travelerId === session.userId) {
      return Response.json({ error: "You can't book space on your own trip." }, { status: 400 });
    }

    const ratePerKg = Number(trip.ratePerKg);
    const totalAmount = bookingTotal(weightKg, ratePerKg);

    try {
      await prisma.$transaction(async (tx) => {
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
      return Response.json({ error: err instanceof Error ? err.message : "Booking failed. Please try again." }, { status: 400 });
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

    return Response.json({
      success: true,
      message: `৳${totalAmount.toFixed(2)} paid from your wallet and held safely until delivery. The traveler will confirm your booking.`,
    });
  } catch (err: unknown) {
    console.error("Mobile pick-put book error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Booking failed. Please try again." }, { status: 500 });
  }
}
