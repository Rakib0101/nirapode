import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { roundKg } from "@/lib/pick-put-utils";

// Mirrors app/pick-put/my/page.tsx — both sides of the marketplace: trips I
// offered (as traveler) and bookings I made (as customer).
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const [trips, bookings] = await Promise.all([
      prisma.pickPutTrip.findMany({
        where: { travelerId: session.userId },
        orderBy: { travelDate: "desc" },
        include: {
          bookings: {
            orderBy: { createdAt: "desc" },
            include: { customer: { select: { fullName: true, phone: true } } },
          },
        },
      }),
      prisma.pickPutBooking.findMany({
        where: { customerId: session.userId },
        orderBy: { createdAt: "desc" },
        include: { trip: { include: { traveler: { select: { fullName: true, phone: true } } } } },
      }),
    ]);

    return Response.json({
      trips: trips.map((trip) => ({
        id: trip.id,
        direction: trip.direction,
        travelDate: trip.travelDate.toISOString(),
        totalKg: Number(trip.totalKg),
        bookedKg: roundKg(Number(trip.bookedKg)),
        ratePerKg: Number(trip.ratePerKg),
        status: trip.status,
        adminNote: trip.adminNote,
        earned: trip.bookings.filter((b) => b.status === "DELIVERED").reduce((sum, b) => sum + Number(b.totalAmount), 0),
        bookings: trip.bookings.map((b) => ({
          id: b.id,
          weightKg: Number(b.weightKg),
          customer: b.customer.fullName,
          customerPhone: b.customer.phone,
          itemDescription: b.itemDescription,
          receiverName: b.receiverName,
          receiverPhone: b.receiverPhone,
          receiverAddress: b.receiverAddress,
          totalAmount: Number(b.totalAmount),
          status: b.status,
        })),
      })),
      bookings: bookings.map((b) => ({
        id: b.id,
        weightKg: Number(b.weightKg),
        traveler: b.trip.traveler.fullName,
        travelerPhone: b.trip.traveler.phone,
        direction: b.trip.direction,
        travelDate: b.trip.travelDate.toISOString(),
        flightInfo: b.trip.flightInfo,
        itemDescription: b.itemDescription,
        receiverName: b.receiverName,
        receiverPhone: b.receiverPhone,
        receiverAddress: b.receiverAddress,
        totalAmount: Number(b.totalAmount),
        status: b.status,
        adminNote: b.adminNote,
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile pick-put my error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load your Pick & Put." }, { status: 500 });
  }
}
