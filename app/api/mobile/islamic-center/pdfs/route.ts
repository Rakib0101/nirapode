import { prisma } from "@/lib/prisma";

// Mirrors app/islamic-center/pdfs/page.tsx, including its placeholder fallback
// (fileUrl "#" = coming soon, not yet uploaded). Public — no login required.
const PLACEHOLDER_PDFS = [
  { id: "p1", title: "Complete Salah Guide with Bengali Translation", description: "Step-by-step guide to performing all 5 daily prayers with Arabic text, transliteration, and Bengali translation.", category: "Prayer", fileUrl: "#" },
  { id: "p2", title: "Ramadan Dua Booklet", description: "Essential duas for Ramadan including Taraweeh, Sehri, Iftar, and Laylatul Qadr supplications.", category: "Ramadan", fileUrl: "#" },
  { id: "p3", title: "Surah Yaseen with Bengali Tafsir", description: "Complete Surah Yaseen with word-for-word Bengali meaning and brief tafsir notes.", category: "Quran", fileUrl: "#" },
  { id: "p4", title: "Singapore Halal Mosque Directory 2025", description: "List of all MUIS-registered mosques in Singapore with addresses, prayer times, and contact information.", category: "Directory", fileUrl: "#" },
  { id: "p5", title: "Hajj & Umrah Guide for Bangladeshis in Singapore", description: "Complete guide to applying for Hajj/Umrah from Singapore, including visa requirements and package information.", category: "Hajj & Umrah", fileUrl: "#" },
  { id: "p6", title: "40 Hadith Nawawi — Bengali Translation", description: "The famous collection of 40 hadiths compiled by Imam Nawawi with accurate Bengali translations.", category: "Hadith", fileUrl: "#" },
];

export async function GET() {
  try {
    const pdfs = await prisma.pdfDocument.findMany({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" } });
    const isPlaceholder = pdfs.length === 0;
    return Response.json({
      pdfs: isPlaceholder
        ? PLACEHOLDER_PDFS
        : pdfs.map((p) => ({ id: p.id, title: p.title, description: p.description, category: p.category, fileUrl: p.fileUrl })),
      isPlaceholder,
    });
  } catch (err: unknown) {
    console.error("Mobile pdfs error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load PDF library." }, { status: 500 });
  }
}
