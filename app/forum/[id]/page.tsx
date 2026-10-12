import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ReplyForm } from "./reply-form";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  const topic = await prisma.forumTopic.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, fullName: true, role: true } },
        },
      },
    },
  });

  if (!topic) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/forum" className="hover:text-brand transition-colors">
            Forum
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-sm">{topic.title}</span>
        </div>

        {/* Main Topic Card */}
        <div className="bg-white rounded-2xl border border-border p-6 md:p-8 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand bg-brand-50 px-2.5 py-1 rounded-full">
              {topic.category}
            </span>
            <span className="text-xs text-muted-foreground">
              Posted on {topic.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-foreground leading-snug">{topic.title}</h1>

          <div className="flex items-center gap-3 py-2 border-y border-border">
            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand flex items-center justify-center font-bold text-xs">
              {topic.user.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{topic.user.fullName}</p>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {topic.user.role.replace("_", " ")}
              </span>
            </div>
          </div>

          <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap pt-2">
            {topic.content}
          </div>
          {topic.imageUrl && (
            <img src={topic.imageUrl} alt="" className="mt-3 max-h-96 rounded-xl border border-border object-contain" />
          )}
        </div>

        {/* Replies Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">
              Replies ({topic.replies.length})
            </h2>
          </div>

          <div className="space-y-3">
            {topic.replies.map((reply) => (
              <div key={reply.id} className="bg-white rounded-2xl border border-border p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-50 text-brand flex items-center justify-center font-bold text-[10px]">
                      {reply.user.fullName.charAt(0)}
                    </span>
                    <span className="font-semibold text-foreground">{reply.user.fullName}</span>
                    {reply.user.role !== "USER" && (
                      <span className="text-[9px] bg-brand-50 text-brand font-bold uppercase px-1.5 py-0.2 rounded">
                        Staff
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-[11px]">
                    {reply.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </span>
                </div>

                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap pt-1 pl-8">
                  {reply.content}
                </p>
                {reply.imageUrl && (
                  <img src={reply.imageUrl} alt="" className="max-h-72 rounded-lg border border-border object-contain ml-8" />
                )}
              </div>
            ))}

            {topic.replies.length === 0 && (
              <div className="bg-white rounded-2xl border border-border p-8 text-center text-xs text-muted-foreground">
                No replies yet. Join the conversation and share your thoughts below!
              </div>
            )}
          </div>

          {/* Post a Reply Form */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-2xs">
            <h3 className="font-semibold text-foreground text-sm mb-3">Leave a Reply</h3>
            {session ? (
              <ReplyForm topicId={topic.id} />
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-3">You must be logged in to participate in the discussion.</p>
                <Link
                  href="/login"
                  className="px-4 py-2 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-dark transition-colors inline-block"
                >
                  Login to Reply
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
