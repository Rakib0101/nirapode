import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/blog/[slug]/page.tsx. content is plain text with \n paragraph
// breaks (not HTML/markdown) — split on \n client-side to render paragraphs,
// same as the web page does.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const { slug } = await params;

    const post = await prisma.blog.findUnique({
      where: { slug, status: "PUBLISHED" },
      include: {
        author: { select: { fullName: true } },
        category: { select: { name: true, slug: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
      },
    });
    if (!post) return Response.json({ error: "Article not found." }, { status: 404 });

    return Response.json({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      category: post.category?.name ?? null,
      author: post.author.fullName,
      date: (post.publishedAt ?? post.createdAt).toISOString(),
      tags: post.tags.map((t) => t.tag.name),
    });
  } catch (err: unknown) {
    console.error("Mobile blog-detail error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load article." }, { status: 500 });
  }
}
