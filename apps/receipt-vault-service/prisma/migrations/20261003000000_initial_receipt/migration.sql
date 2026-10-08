-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "receipt_vault";

-- CreateEnum
CREATE TYPE "receipt_vault"."ReceiptStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "receipt_vault"."ReceiptType" AS ENUM ('EXPENSE', 'INVOICE', 'BILL', 'TICKET', 'OTHER');

-- CreateEnum
CREATE TYPE "receipt_vault"."StorageProvider" AS ENUM ('LOCAL', 'S3', 'AZURE_BLOB', 'GCS');

-- CreateEnum
CREATE TYPE "receipt_vault"."OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "receipt_vault"."receipts" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "expense_id" UUID,
    "user_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(1000) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_hash" VARCHAR(64),
    "receipt_type" "receipt_vault"."ReceiptType" NOT NULL DEFAULT 'EXPENSE',
    "status" "receipt_vault"."ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "storage_provider" "receipt_vault"."StorageProvider" NOT NULL DEFAULT 'LOCAL',
    "storage_bucket" VARCHAR(255),
    "storage_key" VARCHAR(500),
    "thumbnail_path" VARCHAR(1000),
    "ocr_text" TEXT,
    "ocr_confidence" DECIMAL(5,2),
    "processed_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_vault"."receipt_metadata" (
    "id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "merchant_name" VARCHAR(255),
    "merchant_address" TEXT,
    "merchant_phone" VARCHAR(50),
    "merchant_tax_id" VARCHAR(50),
    "transaction_date" DATE,
    "transaction_time" VARCHAR(20),
    "subtotal" DECIMAL(12,2),
    "tax_amount" DECIMAL(12,2),
    "tip_amount" DECIMAL(12,2),
    "total_amount" DECIMAL(12,2),
    "currency" VARCHAR(3),
    "payment_method" VARCHAR(50),
    "last_four_digits" VARCHAR(4),
    "invoice_number" VARCHAR(100),
    "po_number" VARCHAR(100),
    "line_items" JSONB,
    "notes" TEXT,
    "custom_fields" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "receipt_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_vault"."receipt_tag_definitions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_tag_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_vault"."receipt_tags" (
    "receipt_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_tags_pkey" PRIMARY KEY ("receipt_id","tag_id")
);

-- CreateTable
CREATE TABLE "receipt_vault"."outbox_event" (
    "id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "receipt_vault"."OutboxEventStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receipts_workspace_id_idx" ON "receipt_vault"."receipts"("workspace_id");

-- CreateIndex
CREATE INDEX "receipts_expense_id_idx" ON "receipt_vault"."receipts"("expense_id");

-- CreateIndex
CREATE INDEX "receipts_user_id_idx" ON "receipt_vault"."receipts"("user_id");

-- CreateIndex
CREATE INDEX "receipts_status_idx" ON "receipt_vault"."receipts"("status");

-- CreateIndex
CREATE INDEX "receipts_receipt_type_idx" ON "receipt_vault"."receipts"("receipt_type");

-- CreateIndex
CREATE INDEX "receipts_created_at_idx" ON "receipt_vault"."receipts"("created_at");

-- CreateIndex
CREATE INDEX "receipts_file_hash_idx" ON "receipt_vault"."receipts"("file_hash");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_metadata_receipt_id_key" ON "receipt_vault"."receipt_metadata"("receipt_id");

-- CreateIndex
CREATE INDEX "receipt_metadata_merchant_name_idx" ON "receipt_vault"."receipt_metadata"("merchant_name");

-- CreateIndex
CREATE INDEX "receipt_metadata_transaction_date_idx" ON "receipt_vault"."receipt_metadata"("transaction_date");

-- CreateIndex
CREATE INDEX "receipt_metadata_invoice_number_idx" ON "receipt_vault"."receipt_metadata"("invoice_number");

-- CreateIndex
CREATE INDEX "receipt_tag_definitions_workspace_id_idx" ON "receipt_vault"."receipt_tag_definitions"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_tag_workspace_name" ON "receipt_vault"."receipt_tag_definitions"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "receipt_tags_receipt_id_idx" ON "receipt_vault"."receipt_tags"("receipt_id");

-- CreateIndex
CREATE INDEX "receipt_tags_tag_id_idx" ON "receipt_vault"."receipt_tags"("tag_id");

-- CreateIndex
CREATE INDEX "outbox_event_status_created_at_idx" ON "receipt_vault"."outbox_event"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_event_aggregate_id_idx" ON "receipt_vault"."outbox_event"("aggregate_id");

-- AddForeignKey
ALTER TABLE "receipt_vault"."receipt_metadata" ADD CONSTRAINT "receipt_metadata_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipt_vault"."receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_vault"."receipt_tags" ADD CONSTRAINT "receipt_tags_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipt_vault"."receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_vault"."receipt_tags" ADD CONSTRAINT "receipt_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "receipt_vault"."receipt_tag_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

