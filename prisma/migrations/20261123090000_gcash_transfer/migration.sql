-- SGD → GCash (Pesos) transfer service. See the GcashTransfer model.
-- Hand-written (see 20261115160000_web_push_subscriptions for why).
DO $$ BEGIN
  CREATE TYPE "GcashTransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "GcashTransfer" (
  "id"                   TEXT NOT NULL,
  "userId"               TEXT NOT NULL,
  "amountSgd"            DECIMAL(12,2) NOT NULL,
  "rate"                 DECIMAL(12,4) NOT NULL,
  "amountPhp"            DECIMAL(14,2) NOT NULL,
  "paymentMethod"        TEXT NOT NULL,
  "payerAccount"         TEXT NOT NULL,
  "paymentProofUrl"      TEXT NOT NULL,
  "recipientName"        TEXT NOT NULL,
  "recipientGcashNumber" TEXT NOT NULL,
  "note"                 TEXT,
  "status"               "GcashTransferStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote"            TEXT,
  "sentProofUrl"         TEXT,
  "processedById"        TEXT,
  "processedAt"          TIMESTAMP(3),
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GcashTransfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GcashTransfer_userId_idx" ON "GcashTransfer"("userId");
CREATE INDEX IF NOT EXISTS "GcashTransfer_status_idx" ON "GcashTransfer"("status");

DO $$ BEGIN
  ALTER TABLE "GcashTransfer" ADD CONSTRAINT "GcashTransfer_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "GcashTransfer" ADD CONSTRAINT "GcashTransfer_processedById_fkey"
    FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admins have had every section so far; give them the new one too.
-- Moderators don't get it unless a super admin ticks it.
UPDATE "User"
SET "adminPermissions" = array_append("adminPermissions", 'gcash')
WHERE "role" = 'ADMIN' AND NOT ('gcash' = ANY("adminPermissions"));
