-- ============================================================================
-- Expense Tracker — Per-Service Database Setup
-- ============================================================================
-- Run this script once against your PostgreSQL server to create isolated
-- databases for each microservice. Each database contains only the schemas
-- owned by that service's bounded context.
--
-- Usage:
--   psql -U postgres -f scripts/setup-databases.sql
-- ============================================================================

-- 1. Identity & Access Service
CREATE DATABASE expense_tracker_identity;
\c expense_tracker_identity
CREATE SCHEMA IF NOT EXISTS identity_workspace;

-- 2. Expense & Budgeting Service
CREATE DATABASE expense_tracker_expense;
\c expense_tracker_expense
CREATE SCHEMA IF NOT EXISTS expense_ledger;
CREATE SCHEMA IF NOT EXISTS budget_management;
CREATE SCHEMA IF NOT EXISTS budget_planning;
CREATE SCHEMA IF NOT EXISTS cost_allocation;
CREATE SCHEMA IF NOT EXISTS inventory_management;

-- 3. Categorization Service
CREATE DATABASE expense_tracker_categorization;
\c expense_tracker_categorization
CREATE SCHEMA IF NOT EXISTS categorization_rules;
CREATE SCHEMA IF NOT EXISTS identity_workspace;

-- 4. Approval & Policy Service
CREATE DATABASE expense_tracker_approval;
\c expense_tracker_approval
CREATE SCHEMA IF NOT EXISTS approval_workflow;
CREATE SCHEMA IF NOT EXISTS policy_controls;

-- 5. Bank Feed Service
CREATE DATABASE expense_tracker_bank_feed;
\c expense_tracker_bank_feed
CREATE SCHEMA IF NOT EXISTS bank_feed_sync;

-- 6. Receipt Vault Service
CREATE DATABASE expense_tracker_receipt;
\c expense_tracker_receipt
CREATE SCHEMA IF NOT EXISTS receipt_vault;

-- 7. Notification Service
CREATE DATABASE expense_tracker_notification;
\c expense_tracker_notification
CREATE SCHEMA IF NOT EXISTS notification_dispatch;

-- 8. Audit & Compliance Service
CREATE DATABASE expense_tracker_audit;
\c expense_tracker_audit
CREATE SCHEMA IF NOT EXISTS audit_compliance;

-- ============================================================================
-- Done! Each service now has its own database with its required schemas.
-- Run `prisma migrate deploy` (or `prisma db push`) in each service directory
-- to create the tables within each database.
-- ============================================================================
