import { prisma } from "@/lib/prisma";

// Mirrors app/shares/certificate/[id]/page.tsx. The `id` IS a
// ShareCertificate.id (no separate Certificate model). No auth/ownership
// check beyond "must have an owner" — same public-by-id pattern as the
// checkout pay-link, so no Bearer token required here either.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const cert = await prisma.shareCertificate.findUnique({
      where: { id },
      include: { project: { select: { name: true } }, owner: { select: { fullName: true } } },
    });
    if (!cert || !cert.owner) return Response.json({ error: "Certificate not found." }, { status: 404 });

    return Response.json({
      ownerName: cert.owner.fullName,
      projectName: cert.project.name,
      shareNumber: cert.shareNumber,
      code: cert.code,
      issueDate: (cert.issuedAt ?? new Date()).toISOString(),
    });
  } catch (err: unknown) {
    console.error("Mobile certificate error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load certificate." }, { status: 500 });
  }
}
