-- AlterEnum
ALTER TYPE "bank_feed_sync"."ConnectionStatus" ADD VALUE 'DELETED';

-- DropForeignKey
ALTER TABLE "bank_feed_sync"."sync_session" DROP CONSTRAINT "sync_session_connection_id_fkey";

-- DropForeignKey
ALTER TABLE "bank_feed_sync"."bank_transaction" DROP CONSTRAINT "bank_transaction_connection_id_fkey";

-- DropForeignKey
ALTER TABLE "bank_feed_sync"."bank_transaction" DROP CONSTRAINT "bank_transaction_session_id_fkey";

-- DropIndex
DROP INDEX "bank_feed_sync"."bank_transaction_workspace_id_external_id_key";

-- AlterTable
ALTER TABLE "bank_feed_sync"."bank_transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,6);

-- Optimistic version guard for concurrent connection mutations.
ALTER TABLE "bank_feed_sync"."bank_connection" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "identity_workspace"."workspace_membership";

-- CreateIndex
CREATE UNIQUE INDEX "bank_connection_id_workspace_id_key" ON "bank_feed_sync"."bank_connection"("id", "workspace_id");

-- CreateIndex
CREATE INDEX "sync_session_workspace_id_connection_id_started_at_idx" ON "bank_feed_sync"."sync_session"("workspace_id", "connection_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "sync_session_id_workspace_id_connection_id_key" ON "bank_feed_sync"."sync_session"("id", "workspace_id", "connection_id");

-- CreateIndex
CREATE INDEX "bank_transaction_workspace_id_connection_id_transaction_dat_idx" ON "bank_feed_sync"."bank_transaction"("workspace_id", "connection_id", "transaction_date");

-- CreateIndex
CREATE INDEX "bank_transaction_workspace_id_status_transaction_date_idx" ON "bank_feed_sync"."bank_transaction"("workspace_id", "status", "transaction_date");

-- CreateIndex
CREATE INDEX "bank_transaction_session_id_workspace_id_connection_id_idx" ON "bank_feed_sync"."bank_transaction"("session_id", "workspace_id", "connection_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transaction_connection_id_external_id_key" ON "bank_feed_sync"."bank_transaction"("connection_id", "external_id");

-- AddForeignKey
ALTER TABLE "bank_feed_sync"."sync_session" ADD CONSTRAINT "sync_session_connection_id_workspace_id_fkey" FOREIGN KEY ("connection_id", "workspace_id") REFERENCES "bank_feed_sync"."bank_connection"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_feed_sync"."bank_transaction" ADD CONSTRAINT "bank_transaction_connection_id_workspace_id_fkey" FOREIGN KEY ("connection_id", "workspace_id") REFERENCES "bank_feed_sync"."bank_connection"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_feed_sync"."bank_transaction" ADD CONSTRAINT "bank_transaction_session_id_workspace_id_connection_id_fkey" FOREIGN KEY ("session_id", "workspace_id", "connection_id") REFERENCES "bank_feed_sync"."sync_session"("id", "workspace_id", "connection_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma cannot represent a partial unique index. It is the database-level
-- guard against two concurrent syncs for the same connection.
CREATE UNIQUE INDEX "sync_session_one_active_per_connection_idx"
ON "bank_feed_sync"."sync_session"("connection_id")
WHERE "status" IN ('PENDING', 'IN_PROGRESS');
