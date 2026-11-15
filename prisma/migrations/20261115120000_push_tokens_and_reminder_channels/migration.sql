-- Push notifications, and the end of WhatsApp reminders.
--
-- Hand-written rather than generated: pg_cron (migration
-- 20261106144505_schedule_reminder_cron) only installs into the `postgres`
-- database, so `prisma migrate dev` can't build its shadow database here.
-- `prisma migrate deploy` applies this normally.

-- One row per device, so an account signed in on a phone and a tablet is
-- reachable on both.
CREATE TABLE IF NOT EXISTS "PushToken" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "platform"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushToken_token_key" ON "PushToken"("token");
CREATE INDEX IF NOT EXISTS "PushToken_userId_idx" ON "PushToken"("userId");

ALTER TABLE "PushToken"
  DROP CONSTRAINT IF EXISTS "PushToken_userId_fkey";
ALTER TABLE "PushToken"
  ADD CONSTRAINT "PushToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reminder channels: WHATSAPP and GMAIL become APP and EMAIL.
--
-- WHATSAPP maps to APP rather than EMAIL on purpose — someone who chose
-- WhatsApp wanted it to reach their phone, and a push notification is the
-- closest thing to what they asked for. BOTH keeps its name and now means
-- email plus app.
UPDATE "Reminder" SET "channel" = 'APP'   WHERE "channel" = 'WHATSAPP';
UPDATE "Reminder" SET "channel" = 'EMAIL' WHERE "channel" = 'GMAIL';

-- Anything else (hand-edited rows — the web action never validated this
-- field) falls back to BOTH rather than silently going quiet.
UPDATE "Reminder" SET "channel" = 'BOTH' WHERE "channel" NOT IN ('APP', 'EMAIL', 'BOTH');

ALTER TABLE "Reminder" ALTER COLUMN "channel" SET DEFAULT 'BOTH';
