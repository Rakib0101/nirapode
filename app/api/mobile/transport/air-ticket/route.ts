import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { getReferredByAgentId } from "@/lib/commission";
import { notifyAdmin } from "@/lib/notifications";
import { z } from "zod";

// Mirrors app/actions/air-ticket.ts requestAirTicketAction.
const airTicketSchema = z.object({
  origin: z.string().min(2, "Enter origin"),
  destination: z.string().min(2, "Enter destination"),
  departDate: z.string().min(1, "Select a departure date"),
  returnDate: z.string().optional(),
  passengers: z.coerce.number().int().min(1).max(10),
  preferredAirline: z.enum(["Biman Bangladesh Airlines", "Singapore Airlines", "US-Bangla Airlines", "AirAsia"]),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const parse = airTicketSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

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

    return Response.json({ success: true, message: "Flight request submitted! We'll contact you within 1 hour to confirm." });
  } catch (err: unknown) {
    console.error("Mobile air-ticket-request error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to submit flight request." }, { status: 500 });
  }
}
