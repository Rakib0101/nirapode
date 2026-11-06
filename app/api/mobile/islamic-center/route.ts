import { prisma } from "@/lib/prisma";

// Mirrors app/islamic-center/page.tsx. Public — no login required, same as the web page.
export async function GET() {
  try {
    const [surahCount, duaCount, articleCount, pdfCount] = await Promise.all([
      prisma.surah.count(),
      prisma.dua.count(),
      prisma.islamicArticle.count({ where: { status: "PUBLISHED" } }),
      prisma.pdfDocument.count({ where: { status: "PUBLISHED" } }),
    ]);
    const [recentDuas, recentArticles, recentPdfs] = await Promise.all([
      prisma.dua.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
      prisma.islamicArticle.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { author: { select: { fullName: true } } },
      }),
      prisma.pdfDocument.findMany({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 4 }),
    ]);

    return Response.json({
      counts: { quran: surahCount, duas: duaCount, articles: articleCount, pdfs: pdfCount },
      recentDuas: recentDuas.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        arabic: d.arabic,
        transliteration: d.transliteration,
        translation: d.translation,
      })),
      recentArticles: recentArticles.map((a) => ({ id: a.id, title: a.title, excerpt: a.excerpt, author: a.author.fullName })),
      recentPdfs: recentPdfs.map((p) => ({ id: p.id, title: p.title, category: p.category, fileUrl: p.fileUrl })),
    });
  } catch (err: unknown) {
    console.error("Mobile islamic-center summary error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load Islamic Center." }, { status: 500 });
  }
}
