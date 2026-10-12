import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import Link from "next/link";

const CATEGORIES = ["All", "General", "Jobs & Career", "Transport & Housing", "Remittance & Finance", "Legal & Visa"];

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category = "All", q } = await searchParams;
  const session = await getSession();

  const where: any = {};
  if (category && category !== "All") {
    where.category = category;
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }

  const topics = await prisma.forumTopic.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { fullName: true, role: true } },
      _count: { select: { replies: true } },
    },
  });

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-brand bg-brand-50 px-3 py-1 rounded-full mb-2">
              Community Forum
            </span>
            <h1 className="text-2xl font-bold text-foreground">Probashi Community Discussions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Discuss jobs, travel, transport, and share advice with other Bangladeshis in Singapore.
            </p>
          </div>

          <Link
            href={session ? "/forum/new" : "/login"}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand text-white font-semibold text-xs rounded-xl hover:bg-brand-dark transition-colors shadow-xs shrink-0"
          >
            + Start Discussion
          </Link>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <Link
                key={cat}
                href={cat === "All" ? "/forum" : `/forum?category=${encodeURIComponent(cat)}`}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-brand text-white shadow-2xs font-semibold"
                    : "bg-white text-muted-foreground border border-border hover:text-foreground"
                }`}
              >
                {cat}
              </Link>
            );
          })}
        </div>

        {/* Topics List */}
        <div className="space-y-3">
          {topics.map((t) => (
            <Link key={t.id} href={`/forum/${t.id}`} className="block group">
              <div className="bg-white rounded-2xl border border-border p-5 hover:border-brand/40 transition-all shadow-2xs">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold text-brand bg-brand-50 px-2 py-0.5 rounded">
                        {t.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        by {t.user.fullName} · {t.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    <h2 className="font-bold text-foreground text-base group-hover:text-brand transition-colors line-clamp-1">
                      {t.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {t.content}
                    </p>
                  </div>

                  {t.imageUrl && (
                    <img src={t.imageUrl} alt="" className="w-16 h-16 rounded-lg border border-border object-cover shrink-0" />
                  )}

                  <div className="flex items-center gap-3 shrink-0 text-muted-foreground text-xs pt-1">
                    <span className="inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-lg">
                      <svg className="w-3.5 h-3.5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <strong className="text-foreground">{t._count.replies}</strong> replies
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {topics.length === 0 && (
            <div className="bg-white rounded-2xl border border-border p-12 text-center">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="font-bold text-foreground text-base mb-1">No discussions yet in this category</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Be the first to start a conversation with fellow members.
              </p>
              <Link
                href="/forum/new"
                className="inline-block px-4 py-2 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-dark transition-colors"
              >
                + Start Discussion
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
