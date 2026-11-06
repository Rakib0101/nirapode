-- Schedules automatic reminder delivery, which previously had no trigger at
-- all: app/api/cron/reminders/route.ts was built to be pinged periodically
-- (e.g. by an external service like cron-job.org, per the Admin -> Settings
-- panel), but nothing was ever actually wired up to call it, so scheduled
-- reminders were saved correctly but never sent. This ties it into Postgres
-- itself via pg_cron + pg_net, so it runs without any third-party service or
-- Vercel plan tier dependency.
--
-- The secret key used to authenticate the call is intentionally NOT in this
-- file -- it lives in Supabase Vault under the name 'reminder_cron_key' (the
-- same key already shown to admins on the Admin -> Settings page) and is
-- looked up at execution time via vault.decrypted_secrets, so it never ends
-- up in git history. If this project is deployed to a fresh database where
-- that secret doesn't exist yet, create it once before (or any time before
-- the next tick) this job first runs:
--
--   select vault.create_secret('<value from Admin -> Settings -> Automatic sending>', 'reminder_cron_key');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- net.http_get is fire-and-forget async HTTP -- the route itself is
-- idempotent per-reminder (see sendDueReminders() in lib/reminders.ts, which
-- atomically claims each due reminder before sending), so an overlapping or
-- retried call can never send the same reminder twice.
select cron.schedule(
  'send-due-reminders',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://www.nirapode.com/api/cron/reminders?key=' ||
      (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_cron_key')
  );
  $$
);
