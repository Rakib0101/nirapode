-- Brute-force guard for PIN login.
--
-- Hand-written rather than generated: pg_cron (added in
-- 20261106144505_schedule_reminder_cron) only installs into the `postgres`
-- database, so `prisma migrate dev` can't build its shadow database here.
-- `prisma migrate deploy` applies this normally.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pinLockedUntil" TIMESTAMP(3);
