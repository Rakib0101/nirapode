import { prisma } from "@/lib/prisma";

// Mirrors app/islamic-center/quran/page.tsx, including its placeholder fallback
// when admin hasn't seeded any surahs yet. Public — no login required.
const SURAH_PLACEHOLDER = [
  { number: 1, arabicName: "الفاتحة", englishName: "Al-Fatihah", meaningName: "The Opening", totalVerses: 7, revelationType: "Meccan" },
  { number: 2, arabicName: "البقرة", englishName: "Al-Baqarah", meaningName: "The Cow", totalVerses: 286, revelationType: "Medinan" },
  { number: 3, arabicName: "آل عمران", englishName: "Ali 'Imran", meaningName: "Family of Imran", totalVerses: 200, revelationType: "Medinan" },
  { number: 36, arabicName: "يس", englishName: "Ya-Sin", meaningName: "Ya Sin", totalVerses: 83, revelationType: "Meccan" },
  { number: 55, arabicName: "الرحمن", englishName: "Ar-Rahman", meaningName: "The Beneficent", totalVerses: 78, revelationType: "Medinan" },
  { number: 56, arabicName: "الواقعة", englishName: "Al-Waqi'ah", meaningName: "The Event", totalVerses: 96, revelationType: "Meccan" },
  { number: 67, arabicName: "الملك", englishName: "Al-Mulk", meaningName: "The Sovereignty", totalVerses: 30, revelationType: "Meccan" },
  { number: 112, arabicName: "الإخلاص", englishName: "Al-Ikhlas", meaningName: "The Sincerity", totalVerses: 4, revelationType: "Meccan" },
  { number: 113, arabicName: "الفلق", englishName: "Al-Falaq", meaningName: "The Daybreak", totalVerses: 5, revelationType: "Meccan" },
  { number: 114, arabicName: "الناس", englishName: "An-Nas", meaningName: "Mankind", totalVerses: 6, revelationType: "Meccan" },
];

export async function GET() {
  try {
    const surahs = await prisma.surah.findMany({ orderBy: { number: "asc" } });
    const isPlaceholder = surahs.length === 0;
    return Response.json({
      surahs: isPlaceholder
        ? SURAH_PLACEHOLDER
        : surahs.map((s) => ({
            number: s.number,
            arabicName: s.arabicName,
            englishName: s.englishName,
            meaningName: s.meaningName,
            totalVerses: s.totalVerses,
            revelationType: s.revelationType,
          })),
      isPlaceholder,
    });
  } catch (err: unknown) {
    console.error("Mobile quran error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load surahs." }, { status: 500 });
  }
}
