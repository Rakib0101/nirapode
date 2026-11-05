import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { getReferredByAgentId } from "@/lib/commission";
import { notifyAdmin } from "@/lib/notifications";
import { z } from "zod";

// Mirrors app/actions/taxi.ts requestTaxiAction.
const taxiSchema = z.object({
  pickupLocation: z.string().min(3, "Enter pickup location"),
  destination: z.string().min(3, "Enter destination"),
  date: z.string().min(1, "Select a date"),
  passengerCount: z.coerce.number().int().min(1).max(10),
  vehicleType: z.enum(["Noah", "Private Car", "Hiace"]),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const parse = taxiSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { pickupLocation, destination, date, passengerCount, vehicleType, notes } = parse.data;
    const referredById = await getReferredByAgentId(session.userId);

    await prisma.taxiRequest.create({
      data: {
        userId: session.userId,
        pickupLocation,
        destination,
        date: new Date(date),
        passengerCount,
        vehicleType,
        notes: notes ?? null,
        referredById,
      },
    });

    await prisma.notification.create({
      data: {
        userId: session.userId,
        title: "Taxi booking requested",
        message: `Your taxi request from ${pickupLocation} to ${destination} (${vehicleType}) has been submitted. We'll contact you within 1 hour to confirm.`,
        type: "SYSTEM",
      },
    });

    await notifyAdmin({
      subject: `New taxi request — ${pickupLocation} → ${destination}`,
      heading: "New Taxi Request",
      lines: [
        { label: "Requested by", value: `${session.fullName} (${session.email})` },
        { label: "Pickup", value: pickupLocation },
        { label: "Destination", value: destination },
        { label: "Date", value: new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
        { label: "Vehicle Type", value: vehicleType },
        { label: "Passengers", value: String(passengerCount) },
      ],
      actionPath: "/admin/taxi",
    });

    return Response.json({ success: true, message: "Taxi request submitted! We'll contact you within 1 hour to confirm." });
  } catch (err: unknown) {
    console.error("Mobile taxi-request error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to submit taxi request." }, { status: 500 });
  }
}
