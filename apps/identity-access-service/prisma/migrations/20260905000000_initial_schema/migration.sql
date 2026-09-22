-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity_workspace";

-- CreateEnum
CREATE TYPE "identity_workspace"."OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "identity_workspace"."user_account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_workspace"."workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_workspace"."workspace_membership" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_workspace"."workspace_invitation" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_workspace"."auth_session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_workspace"."outbox_event" (
    "id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "identity_workspace"."OutboxEventStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "delivered_to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lease_token" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_account_email_key" ON "identity_workspace"."user_account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_slug_key" ON "identity_workspace"."workspace"("slug");

-- CreateIndex
CREATE INDEX "workspace_membership_workspace_id_idx" ON "identity_workspace"."workspace_membership"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_membership_user_id_idx" ON "identity_workspace"."workspace_membership"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_membership_user_id_workspace_id_key" ON "identity_workspace"."workspace_membership"("user_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitation_token_key" ON "identity_workspace"."workspace_invitation"("token");

-- CreateIndex
CREATE INDEX "workspace_invitation_workspace_id_idx" ON "identity_workspace"."workspace_invitation"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_invitation_email_idx" ON "identity_workspace"."workspace_invitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_token_key" ON "identity_workspace"."auth_session"("token");

-- CreateIndex
CREATE INDEX "auth_session_user_id_idx" ON "identity_workspace"."auth_session"("user_id");

-- CreateIndex
CREATE INDEX "outbox_event_status_created_at_idx" ON "identity_workspace"."outbox_event"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_event_aggregate_id_idx" ON "identity_workspace"."outbox_event"("aggregate_id");

-- AddForeignKey
ALTER TABLE "identity_workspace"."workspace" ADD CONSTRAINT "workspace_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "identity_workspace"."user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_workspace"."workspace_membership" ADD CONSTRAINT "workspace_membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_workspace"."user_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_workspace"."workspace_membership" ADD CONSTRAINT "workspace_membership_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "identity_workspace"."workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_workspace"."workspace_invitation" ADD CONSTRAINT "workspace_invitation_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "identity_workspace"."workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_workspace"."auth_session" ADD CONSTRAINT "auth_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_workspace"."user_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
