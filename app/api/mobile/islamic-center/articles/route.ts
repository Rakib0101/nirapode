import { prisma } from "@/lib/prisma";

// Mirrors app/islamic-center/articles/page.tsx, including its placeholder
// fallback. Public — no login required. The web page never links to a detail
// view either, so this intentionally omits the article body.
const PLACEHOLDER_ARTICLES = [
  {
    id: "p1",
    title: "The Importance of Salah in a Muslim's Life",
    excerpt: "Prayer is the second pillar of Islam and a direct connection between the believer and Allah. This article explores how to maintain regular prayers while working abroad.",
    author: "Admin",
    createdAt: new Date("2025-12-01").toISOString(),
  },
  {
    id: "p2",
    title: "Ramadan in Singapore: A Guide for Bangladeshi Muslims",
    excerpt: "Fasting hours, Taraweeh mosques near Little India, halal iftar options in Singapore — everything you need for a spiritual Ramadan while away from home.",
    author: "Admin",
    createdAt: new Date("2025-11-15").toISOString(),
  },
  {
    id: "p3",
    title: "Friday Prayer (Jumu'ah) Mosques Near Your Workplace",
    excerpt: "A directory of mosques across Singapore's major business and industrial districts for workers to attend Friday prayers conveniently.",
    author: "Admin",
    createdAt: new Date("2025-10-20").toISOString(),
  },
  {
    id: "p4",
    title: "Halal Certification in Singapore: What You Need to Know",
    excerpt: "Understanding Singapore's MUIS halal certification system so you can make informed food choices at supermarkets, hawker centres, and restaurants.",
    author: "Admin",
    createdAt: new Date("2025-09-05").toISOString(),
  },
];

export async function GET() {
  try {
    const articles = await prisma.islamicArticle.findMany({
      where: { status: "PUBLISHED" },
      include: { author: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
    const isPlaceholder = articles.length === 0;
    return Response.json({
      articles: isPlaceholder
        ? PLACEHOLDER_ARTICLES
        : articles.map((a) => ({
            id: a.id,
            title: a.title,
            excerpt: a.excerpt,
            author: a.author?.fullName ?? "Admin",
            createdAt: a.createdAt.toISOString(),
          })),
      isPlaceholder,
    });
  } catch (err: unknown) {
    console.error("Mobile islamic-articles error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load articles." }, { status: 500 });
  }
}
