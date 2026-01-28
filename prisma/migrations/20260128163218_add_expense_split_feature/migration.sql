-- CreateEnum
CREATE TYPE "expense_ledger"."SplitType" AS ENUM ('EQUAL', 'EXACT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "expense_ledger"."SettlementStatus" AS ENUM ('PENDING', 'PARTIAL', 'SETTLED');

-- CreateTable
CREATE TABLE "expense_ledger"."expense_splits" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "paid_by" UUID NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "split_type" "expense_ledger"."SplitType" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expense_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."split_participants" (
    "id" UUID NOT NULL,
    "split_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "share_amount" DECIMAL(12,2) NOT NULL,
    "share_percentage" DECIMAL(5,2),
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "split_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."split_settlements" (
    "id" UUID NOT NULL,
    "split_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "total_owed_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "expense_ledger"."SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "settled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "split_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_splits_expense_id_key" ON "expense_ledger"."expense_splits"("expense_id");

-- CreateIndex
CREATE INDEX "expense_splits_workspace_id_idx" ON "expense_ledger"."expense_splits"("workspace_id");

-- CreateIndex
CREATE INDEX "expense_splits_paid_by_idx" ON "expense_ledger"."expense_splits"("paid_by");

-- CreateIndex
CREATE INDEX "expense_splits_expense_id_idx" ON "expense_ledger"."expense_splits"("expense_id");

-- CreateIndex
CREATE INDEX "split_participants_split_id_idx" ON "expense_ledger"."split_participants"("split_id");

-- CreateIndex
CREATE INDEX "split_participants_user_id_idx" ON "expense_ledger"."split_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "split_participants_split_id_user_id_key" ON "expense_ledger"."split_participants"("split_id", "user_id");

-- CreateIndex
CREATE INDEX "split_settlements_split_id_idx" ON "expense_ledger"."split_settlements"("split_id");

-- CreateIndex
CREATE INDEX "split_settlements_from_user_id_idx" ON "expense_ledger"."split_settlements"("from_user_id");

-- CreateIndex
CREATE INDEX "split_settlements_to_user_id_idx" ON "expense_ledger"."split_settlements"("to_user_id");

-- CreateIndex
CREATE INDEX "split_settlements_status_idx" ON "expense_ledger"."split_settlements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "split_settlements_split_id_from_user_id_to_user_id_key" ON "expense_ledger"."split_settlements"("split_id", "from_user_id", "to_user_id");

-- AddForeignKey
ALTER TABLE "expense_ledger"."split_participants" ADD CONSTRAINT "split_participants_split_id_fkey" FOREIGN KEY ("split_id") REFERENCES "expense_ledger"."expense_splits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_ledger"."split_settlements" ADD CONSTRAINT "split_settlements_split_id_fkey" FOREIGN KEY ("split_id") REFERENCES "expense_ledger"."expense_splits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
