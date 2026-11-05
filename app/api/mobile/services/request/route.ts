import { prisma } from "@/lib/prisma";
import { getMobileSession } from "@/lib/mobile-session";
import { getReferredByAgentId } from "@/lib/commission";
import { notifyAdmin } from "@/lib/notifications";
import { z } from "zod";

// Mirrors app/actions/service-requests.ts submitServiceRequestAction — the
// web action explicitly doesn't require login (session is optional, only
// used to attach a referral), so this endpoint mirrors that rather than
// requiring a Bearer token like every other mobile endpoint.
const schema = z.object({
  serviceId: z.string().min(1),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(6, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parse = schema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { serviceId, fullName, phone, email } = parse.data;

    const service = await prisma.applyService.findUnique({ where: { id: serviceId, isActive: true }, select: { id: true, name: true } });
    if (!service) return Response.json({ error: "Service not found or unavailable." }, { status: 404 });

    const session = await getMobileSession(req);
    const referredById = session ? await getReferredByAgentId(session.userId) : null;

    await prisma.serviceRequest.create({
      data: { serviceId, fullName, phone, email, referredById },
    });

    await notifyAdmin({
      subject: `New service request — ${service.name}`,
      heading: "New Service Request",
      lines: [
        { label: "Name", value: fullName },
        { label: "Service", value: service.name },
        { label: "Phone", value: phone },
        { label: "Email", value: email },
      ],
      actionPath: "/admin/apply",
    });

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile service-request error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to submit request." }, { status: 500 });
  }
}
