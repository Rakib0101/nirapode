import { prisma } from "@/lib/prisma";
import { getMobileSession, unauthorizedJson } from "@/lib/mobile-session";

// Mirrors app/blog/page.tsx — a real Blog/BlogCategory model, not static
// content. Only PUBLISHED posts are ever returned.
export async function GET(req: Request) {
  try {
    const session = await getMobileSession(req);
    if (!session) return unauthorizedJson();

    const url = new URL(req.url);
    const categorySlug = url.searchParams.get("category") || undefined;

    const [posts, categories] = await Promise.all([
      prisma.blog.findMany({
        where: { status: "PUBLISHED", category: categorySlug ? { slug: categorySlug } : undefined },
        orderBy: { publishedAt: "desc" },
        include: { author: { select: { fullName: true } }, category: { select: { name: true, slug: true } } },
      }),
      prisma.blogCategory.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    ]);

    return Response.json({
      categories,
      posts: posts.map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        featuredImage: p.featuredImage,
        category: p.category?.name ?? null,
        categorySlug: p.category?.slug ?? null,
        author: p.author.fullName,
        date: (p.publishedAt ?? p.createdAt).toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error("Mobile blog-list error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load articles." }, { status: 500 });
  }
}
