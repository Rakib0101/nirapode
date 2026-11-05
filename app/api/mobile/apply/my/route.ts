import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/apply/my/page.tsx.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const applications = await prisma.applyApplication.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: { service: { select: { name: true } } },
    });

    return Response.json({
      applications: applications.map((a) => {
        const docs: string[] = [];
        if (a.resumeUrl) docs.push("Resume / CV");
        if (a.ePassportUrl) docs.push("ePassport");
        if (a.permitUrl) docs.push("Work Permit");
        if (a.oldPassportUrl) docs.push("Old Passport");
        if (a.otherFileUrl) docs.push("Other File");

        return {
          id: a.id,
          service: a.service.name,
          status: a.status,
          adminNote: a.adminNote,
          docs,
          date: a.createdAt.toISOString(),
        };
      }),
    });
  } catch (err: unknown) {
    console.error("Mobile my-applications error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load your applications." }, { status: 500 });
  }
}
