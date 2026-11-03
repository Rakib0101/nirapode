-- CreateTable
CREATE TABLE "PlatformWallet" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformWalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTxType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "balanceBefore" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformWalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformWalletTransaction_walletId_idx" ON "PlatformWalletTransaction"("walletId");

-- AddForeignKey
ALTER TABLE "PlatformWalletTransaction" ADD CONSTRAINT "PlatformWalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "PlatformWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
