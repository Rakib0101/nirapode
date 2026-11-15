-- Browser push subscriptions. The counterpart to "PushToken" (phones) —
-- browsers speak Web Push rather than Expo, so the address is the push
-- service's endpoint URL and the payload is encrypted with keys the browser
-- hands over at subscribe time.
--
-- Hand-written rather than generated: pg_cron (migration
-- 20261106144505_schedule_reminder_cron) only installs into the `postgres`
-- database, so `prisma migrate dev` can't build its shadow database here.
CREATE TABLE IF NOT EXISTS "WebPushSubscription" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "endpoint"   TEXT NOT NULL,
  "p256dh"     TEXT NOT NULL,
  "auth"       TEXT NOT NULL,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WebPushSubscription_endpoint_key" ON "WebPushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "WebPushSubscription_userId_idx" ON "WebPushSubscription"("userId");

ALTER TABLE "WebPushSubscription" DROP CONSTRAINT IF EXISTS "WebPushSubscription_userId_fkey";
ALTER TABLE "WebPushSubscription"
  ADD CONSTRAINT "WebPushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
