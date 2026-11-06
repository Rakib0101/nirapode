import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { notifyUser } from "@/lib/notifications";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

// Mirrors app/actions/pick-put.ts acceptBookingAction — traveler (or admin) only.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { id: bookingId } = await params;
    const booking = await prisma.pickPutBooking.findUnique({
      where: { id: bookingId },
      include: { trip: { select: { travelerId: true } }, customer: { select: { email: true, phone: true } } },
    });
    if (!booking) return Response.json({ error: "Booking not found." }, { status: 404 });
    if (booking.trip.travelerId !== session.userId && !ADMIN_ROLES.includes(session.role)) return unauthorizedJson();

    const { count } = await prisma.pickPutBooking.updateMany({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "ACCEPTED" },
    });
    if (count === 0) return Response.json({ error: "Booking is no longer pending." }, { status: 400 });

    const message = `Your ${Number(booking.weightKg)} kg booking was accepted. You can now contact the traveler from My Pick & Put to hand over the items.`;
    await prisma.notification.create({
      data: { userId: booking.customerId, title: "Pick & Put booking accepted", message, type: "SYSTEM" },
    });
    await notifyUser({
      to: booking.customer.email,
      phone: booking.customer.phone,
      subject: "Pick & Put booking accepted",
      heading: "Booking Accepted",
      message,
    });

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile pick-put accept error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to accept booking." }, { status: 500 });
  }
}
