-- Per-section admin permissions. A super admin picks which admin panel
-- sections each ADMIN / MODERATOR may use; SUPER_ADMIN always has all.
-- The section check replaces the old hard-coded role lists in each server
-- action, so the backfill below gives existing staff exactly the sections
-- their role could act on before — nobody gains or loses anything when this
-- ships. New staff start with none until a super admin grants some.
--
-- Hand-written (see 20261115160000_web_push_subscriptions for why).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "User"
SET "adminPermissions" = ARRAY[
  'users', 'shares', 'deposits', 'withdrawals', 'checkouts', 'airTicket', 'taxi',
  'blog', 'islamic', 'pickPut', 'apply', 'products', 'partners', 'settings'
]::TEXT[]
WHERE "role" = 'ADMIN' AND cardinality("adminPermissions") = 0;

-- Moderators could previously only act on these (the rest of their server
-- actions required ADMIN).
UPDATE "User"
SET "adminPermissions" = ARRAY[
  'checkouts', 'airTicket', 'taxi', 'blog', 'islamic', 'pickPut', 'apply'
]::TEXT[]
WHERE "role" = 'MODERATOR' AND cardinality("adminPermissions") = 0;
