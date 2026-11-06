import { prisma } from "@/lib/prisma";

// Mirrors app/islamic-center/duas/page.tsx, including its placeholder fallback.
// Public — no login required.
const PLACEHOLDER_DUAS = [
  {
    id: "p1",
    category: "Morning",
    title: "Morning Remembrance (Subah Ki Dua)",
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ",
    transliteration: "Aṣbaḥnā wa aṣbaḥal-mulku lillāh, wal-ḥamdu lillāh",
    translation: "We have reached the morning and the whole sovereignty belongs to Allah. All praises are for Allah.",
    source: "Muslim",
  },
  {
    id: "p2",
    category: "Morning",
    title: "Dua upon waking",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
    transliteration: "Alḥamdulillāhil-ladhī aḥyānā ba'da mā amātanā wa ilayhin-nushūr",
    translation: "All praise is for Allah who gave us life after having taken it from us, and unto Him is the resurrection.",
    source: "Bukhari",
  },
  {
    id: "p3",
    category: "Evening",
    title: "Evening Remembrance (Shaam Ki Dua)",
    arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ",
    transliteration: "Amsaynā wa amsal-mulku lillāh, wal-ḥamdu lillāh",
    translation: "We have reached the evening and the whole sovereignty belongs to Allah. All praises are for Allah.",
    source: "Muslim",
  },
  {
    id: "p4",
    category: "Travel",
    title: "Dua for Travel (Safar Ki Dua)",
    arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ",
    transliteration: "Subḥānal-ladhī sakhkhara lanā hādhā wa mā kunnā lahū muqrinīn",
    translation: "Glory be to the One Who has subjected this to us, and we were not able to do it ourselves.",
    source: "Abu Dawud",
  },
  {
    id: "p5",
    category: "Protection",
    title: "Dua for Protection (Hifazat Ki Dua)",
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ",
    transliteration: "Bismillāhil-ladhī lā yaḍurru ma'asmihi shay'un fil-arḍi wa lā fis-samā'",
    translation: "In the name of Allah, with Whose name nothing can cause harm on earth or in heaven.",
    source: "Tirmidhi",
  },
  {
    id: "p6",
    category: "Food",
    title: "Dua before eating (Khana Khane Ki Dua)",
    arabic: "اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ",
    transliteration: "Allāhumma bārik lanā fīmā razaqtanā wa qinā 'adhāban-nār",
    translation: "O Allah, bless us in what You have provided for us and protect us from the punishment of Fire.",
    source: "Ibn As-Sunni",
  },
];

export async function GET() {
  try {
    const duas = await prisma.dua.findMany({ orderBy: { createdAt: "asc" } });
    const isPlaceholder = duas.length === 0;
    return Response.json({
      duas: isPlaceholder
        ? PLACEHOLDER_DUAS
        : duas.map((d) => ({
            id: d.id,
            category: d.category,
            title: d.title,
            arabic: d.arabic,
            transliteration: d.transliteration,
            translation: d.translation,
            source: d.source,
          })),
      isPlaceholder,
    });
  } catch (err: unknown) {
    console.error("Mobile duas error:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed to load duas." }, { status: 500 });
  }
}
