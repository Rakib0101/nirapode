import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { refundPickPutBooking } from "@/lib/pick-put";
import { z } from "zod";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];
const schema = z.object({ note: z.string().trim().max(300).optional() });

// Mirrors app/actions/pick-put.ts rejectBookingAction — traveler can reject
// only while still PENDING; once ACCEPTED, only admin can unwind it (the
// traveler may already hold the items).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { id: bookingId } = await params;
    const booking = await prisma.pickPutBooking.findUnique({
      where: { id: bookingId },
      include: { trip: { select: { travelerId: true } } },
    });
    if (!booking) return Response.json({ error: "Booking not found." }, { status: 404 });

    const isAdmin = ADMIN_ROLES.includes(session.role);
    if (booking.trip.travelerId !== session.userId && !isAdmin) return unauthorizedJson();
    if (booking.status === "ACCEPTED" && !isAdmin) {
      return Response.json({ error: "This booking is already accepted — contact admin to cancel it." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parse = schema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    await prisma.$transaction(
      (tx) =>
        refundPickPutBooking(tx, bookingId, "REJECTED", isAdmin ? "rejected by admin" : "declined by the traveler", parse.data.note?.trim() || null),
      { timeout: 15000 }
    );
    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile pick-put reject error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to reject booking." }, { status: 500 });
  }
}
