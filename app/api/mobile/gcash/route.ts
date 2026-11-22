import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { createGcashTransfer, getGcashSettings } from "@/lib/gcash-transfer";
import { resolveUploadUrl } from "@/lib/storage";

// The app's Send to GCash screen: settings (rate, where to pay, instructions)
// plus the user's own requests with signed links to both screenshots. Same
// service as app/services/gcash on the website.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const [settings, rows] = await Promise.all([
      getGcashSettings(),
      prisma.gcashTransfer.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const requests = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        amountSgd: Number(r.amountSgd),
        amountPhp: Number(r.amountPhp),
        rate: Number(r.rate),
        paymentMethod: r.paymentMethod,
        recipientName: r.recipientName,
        recipientGcashNumber: r.recipientGcashNumber,
        status: r.status,
        adminNote: r.adminNote,
        paymentProofUrl: await resolveUploadUrl(r.paymentProofUrl),
        sentProofUrl: await resolveUploadUrl(r.sentProofUrl),
        date: r.createdAt.toISOString(),
      })),
    );

    return Response.json({ settings, requests });
  } catch (err: unknown) {
    console.error("Mobile gcash GET error:", err);
    return Response.json({ error: "Failed to load." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();
    const body = await req.json().catch(() => ({}));
    const res = await createGcashTransfer(session, body);
    if ("error" in res) return Response.json({ error: res.error }, { status: 400 });
    return Response.json(res);
  } catch (err: unknown) {
    console.error("Mobile gcash POST error:", err);
    return Response.json({ error: "Could not send the request." }, { status: 500 });
  }
}
