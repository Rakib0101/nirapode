import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";
import { z } from "zod";

// Mirrors app/lost-found/page.tsx — only OPEN posts show publicly; RESOLVED/
// REMOVED disappear from this list entirely (still visible on /my for their
// own author). Contact info is the real user's own name/phone, never
// manually entered.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const typeFilter = type === "LOST" || type === "FOUND" ? type : undefined;

    const posts = await prisma.lostFoundPost.findMany({
      where: { status: "OPEN", type: typeFilter },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, fullName: true, phone: true } } },
    });

    return Response.json({
      posts: posts.map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        description: p.description,
        location: p.location,
        date: p.createdAt.toISOString(),
        author: p.user.fullName,
        phone: p.user.phone,
        isMine: p.user.id === session.userId,
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile lost-found-list error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load posts." }, { status: 500 });
  }
}

// Mirrors app/actions/lost-found.ts createLostFoundPostAction.
const postSchema = z.object({
  type: z.enum(["LOST", "FOUND"]),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Please add more details"),
  location: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const body = await req.json();
    const parse = postSchema.safeParse(body);
    if (!parse.success) return Response.json({ error: parse.error.issues[0].message }, { status: 400 });

    const { type, title, description, location } = parse.data;

    await prisma.lostFoundPost.create({
      data: { userId: session.userId, type, title, description, location: location ?? null, images: [] },
    });

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Mobile lost-found-create error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to publish post." }, { status: 500 });
  }
}
