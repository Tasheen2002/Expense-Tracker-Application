-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "bank_feed_sync";

-- CreateEnum
CREATE TYPE "bank_feed_sync"."ConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'EXPIRED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "bank_feed_sync"."SyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "bank_feed_sync"."TransactionStatus" AS ENUM ('PENDING', 'MATCHED', 'IMPORTED', 'IGNORED', 'DUPLICATE');

-- CreateTable
CREATE TABLE "bank_feed_sync"."bank_connection" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "institution_name" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_type" TEXT NOT NULL,
    "account_mask" TEXT,
    "currency" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "status" "bank_feed_sync"."ConnectionStatus" NOT NULL,
    "last_sync_at" TIMESTAMP(3),
    "token_expires_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_feed_sync"."sync_session" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "status" "bank_feed_sync"."SyncStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "transactions_fetched" INTEGER NOT NULL DEFAULT 0,
    "transactions_imported" INTEGER NOT NULL DEFAULT 0,
    "transactions_duplicate" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_feed_sync"."bank_transaction" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "merchant_name" TEXT,
    "category_name" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "posted_date" TIMESTAMP(3),
    "status" "bank_feed_sync"."TransactionStatus" NOT NULL,
    "expense_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_connection_workspace_id_institution_id_account_id_key" ON "bank_feed_sync"."bank_connection"("workspace_id", "institution_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transaction_workspace_id_external_id_key" ON "bank_feed_sync"."bank_transaction"("workspace_id", "external_id");

-- AddForeignKey
ALTER TABLE "bank_feed_sync"."sync_session" ADD CONSTRAINT "sync_session_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "bank_feed_sync"."bank_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_feed_sync"."bank_transaction" ADD CONSTRAINT "bank_transaction_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "bank_feed_sync"."bank_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_feed_sync"."bank_transaction" ADD CONSTRAINT "bank_transaction_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "bank_feed_sync"."sync_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
