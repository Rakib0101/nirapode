import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { refundPickPutBooking } from "@/lib/pick-put";

// Mirrors app/actions/pick-put.ts cancelBookingAction.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { id: bookingId } = await params;
    const booking = await prisma.pickPutBooking.findUnique({ where: { id: bookingId }, select: { customerId: true, status: true } });
    if (!booking || booking.customerId !== session.userId) return Response.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status !== "PENDING") {
      return Response.json({ error: "Only bookings not yet accepted can be cancelled. Contact admin for help." }, { status: 400 });
    }

    await prisma.$transaction((tx) => refundPickPutBooking(tx, bookingId, "CANCELLED", "cancelled by you"), { timeout: 15000 });
    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile pick-put cancel error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to cancel booking." }, { status: 500 });
  }
}
