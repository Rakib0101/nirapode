-- This migration file is a retroactive reconstruction. The schema changes it
-- describes were already applied directly to the live database by an earlier
-- session (outside the normal `prisma migrate dev` flow), under this same
-- migration name — but the migration folder itself was never committed to
-- this repo, leaving `_prisma_migrations` pointing at a name with no local
-- file. That dangling row was also marked rolled_back/0-steps, so Prisma's
-- bookkeeping didn't actually consider it applied even though the schema
-- changes were live.
--
-- This file documents those already-live changes (ForumTopic/ForumReply,
-- Reminder, and a few added columns) so a fresh environment replaying
-- migration history from scratch ends up with the same schema the live
-- database already has. It is registered via `prisma migrate resolve
-- --applied` rather than executed, since the changes already exist live.

-- AlterTable
ALTER TABLE "AirTicketRequest" ADD COLUMN     "ticketUrl" TEXT;

-- AlterTable
ALTER TABLE "ShareCertificate" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "WithdrawalRequest" ADD COLUMN     "adminProofUrl" TEXT,
ADD COLUMN     "adminTxId" TEXT;

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "isUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "note" TEXT,
    "remindAt" TIMESTAMP(3),
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumTopic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumReply" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_userId_slotIndex_key" ON "Reminder"("userId", "slotIndex");

-- CreateIndex
CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");

-- CreateIndex
CREATE INDEX "ForumTopic_category_idx" ON "ForumTopic"("category");

-- CreateIndex
CREATE INDEX "ForumTopic_userId_idx" ON "ForumTopic"("userId");

-- CreateIndex
CREATE INDEX "ForumReply_topicId_idx" ON "ForumReply"("topicId");

-- CreateIndex
CREATE INDEX "ForumReply_userId_idx" ON "ForumReply"("userId");

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumTopic" ADD CONSTRAINT "ForumTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ForumTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
