import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { notifyAdmin } from "@/lib/notifications";

// Mirrors app/actions/apply.ts submitApplicationAction — requires a real
// logged-in user (unlike the public Services request form), and requires at
// least a Resume or ePassport file.
const FIELDS = ["resumeUrl", "ePassportUrl", "permitUrl", "oldPassportUrl", "otherFileUrl"] as const;

function isValidBase64File(value: unknown): boolean {
  if (typeof value !== "string" || !value) return true;
  return value.startsWith("data:") && value.length < 6 * 1024 * 1024;
}

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const serviceId = body?.serviceId as string | undefined;
    if (!serviceId) return Response.json({ error: "Service is required." }, { status: 400 });

    const service = await prisma.applyService.findUnique({ where: { id: serviceId, isActive: true } });
    if (!service) return Response.json({ error: "Service not found." }, { status: 404 });

    const existing = await prisma.applyApplication.findFirst({
      where: { userId: session.userId, serviceId, status: { in: ["PENDING", "IN_PROGRESS"] } },
    });
    if (existing) return Response.json({ error: "You already have a pending application for this service." }, { status: 409 });

    const files: Record<string, string | null> = {};
    for (const field of FIELDS) {
      const val = body?.[field] as string | undefined;
      if (val && val.startsWith("data:")) {
        if (!isValidBase64File(val)) return Response.json({ error: "File too large (max ~4MB each)." }, { status: 400 });
        files[field] = val;
      } else {
        files[field] = null;
      }
    }

    if (!files.resumeUrl && !files.ePassportUrl) {
      return Response.json({ error: "Please upload at least your Resume or ePassport." }, { status: 400 });
    }

    await prisma.applyApplication.create({
      data: {
        userId: session.userId,
        serviceId,
        resumeUrl: files.resumeUrl,
        ePassportUrl: files.ePassportUrl,
        permitUrl: files.permitUrl,
        oldPassportUrl: files.oldPassportUrl,
        otherFileUrl: files.otherFileUrl,
      },
    });

    await notifyAdmin({
      subject: `New application — ${service.name}`,
      heading: "New Service Application",
      lines: [
        { label: "Applicant", value: `${session.fullName} (${session.email})` },
        { label: "Service", value: service.name },
      ],
      actionPath: "/admin/apply",
    });

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile apply-submit error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to submit application." }, { status: 500 });
  }
}
