import fp from "fastify-plugin";
import { container } from "./container";
import { registerIdentityWorkspaceRoutes } from "../../../modules/identity-workspace/infrastructure/http/routes/index";
import { registerExpenseLedgerRoutes } from "../../../modules/expense-ledger/infrastructure/http/routes/index";
import { registerBudgetRoutes } from "../../../modules/budget-management/infrastructure/http/routes/index";
import { registerReceiptVaultRoutes } from "../../../modules/receipt-vault/infrastructure/http/routes/index";
import { registerApprovalWorkflowRoutes } from "../../../modules/approval-workflow/infrastructure/http/routes/index";
import { registerNotificationDispatchRoutes } from "../../../modules/notification-dispatch/infrastructure/http/routes/index";
import { registerCostAllocationRoutes } from "../../../modules/cost-allocation/infrastructure/http/routes/index";
import { registerCategorizationRulesRoutes } from "../../../modules/categorization-rules/infrastructure/http/routes/main";
import { registerBudgetPlanningRoutes } from "../../../modules/budget-planning/infrastructure/http/routes/index";
import { registerAuditComplianceRoutes } from "../../../modules/audit-compliance/infrastructure/http/routes/index";
import { registerPolicyControlsRoutes } from "../../../modules/policy-controls/infrastructure/http/routes/index";
import { registerBankFeedSyncRoutes } from "../../../modules/bank-feed-sync/infrastructure/http/routes/index";

export default fp(
  async (fastify) => {
    fastify.log.info("Registering modules...");

    // ============================================
    // Identity-Workspace Module
    // ============================================
    const identityWorkspaceServices = container.getIdentityWorkspaceServices();
    await registerIdentityWorkspaceRoutes(fastify, identityWorkspaceServices);
    fastify.log.info("✓ Identity-Workspace module registered");

    // ============================================
    // Expense-Ledger Module
    // ============================================
    const expenseLedgerServices = container.getExpenseLedgerServices();
    await registerExpenseLedgerRoutes(
      fastify,
      expenseLedgerServices,
      expenseLedgerServices.prisma,
    );
    fastify.log.info("✓ Expense-Ledger module registered");

    // ============================================
    // Budget Management Module
    // ============================================
    const budgetManagementServices = container.getBudgetManagementServices();
    await registerBudgetRoutes(
      fastify,
      budgetManagementServices,
      budgetManagementServices.prisma,
    );
    fastify.log.info("✓ Budget Management module registered");

    // ============================================
    // Receipt Vault Module
    // ============================================
    const receiptVaultServices = container.getReceiptVaultServices();
    await registerReceiptVaultRoutes(
      fastify,
      receiptVaultServices,
      receiptVaultServices.prisma,
    );
    fastify.log.info("✓ Receipt Vault module registered");

    // ============================================
    // Approval Workflow Module
    // ============================================
    const approvalWorkflowServices = container.getApprovalWorkflowServices();
    await registerApprovalWorkflowRoutes(fastify, approvalWorkflowServices);
    fastify.log.info("✓ Approval Workflow module registered");

    // ============================================
    // Notification Dispatch Module
    // ============================================
    const notificationDispatchServices =
      container.getNotificationDispatchServices();
    await registerNotificationDispatchRoutes(
      fastify,
      notificationDispatchServices,
      notificationDispatchServices.prisma,
    );
    fastify.log.info("✓ Notification Dispatch module registered");

    // ============================================
    // Cost Allocation Module
    // ============================================
    const costAllocationServices = container.getCostAllocationServices();
    await registerCostAllocationRoutes(
      fastify,
      costAllocationServices,
      costAllocationServices.prisma,
    );
    fastify.log.info("✓ Cost Allocation module registered");

    // ============================================
    // Categorization Rules Module
    // ============================================
    const categorizationRulesServices =
      container.getCategorizationRulesServices();
    await registerCategorizationRulesRoutes(
      fastify,
      categorizationRulesServices,
      categorizationRulesServices.prisma,
    );
    fastify.log.info("✓ Categorization Rules module registered");

    // ============================================
    // Budget Planning Module
    // ============================================
    const budgetPlanningServices = container.getBudgetPlanningServices();
    await registerBudgetPlanningRoutes(
      fastify,
      budgetPlanningServices,
      budgetPlanningServices.prisma,
    );
    fastify.log.info("✓ Budget Planning module registered");

    // ============================================
    // Audit Compliance Module
    // ============================================
    const auditComplianceServices = container.getAuditComplianceServices();
    await registerAuditComplianceRoutes(
      fastify,
      auditComplianceServices.auditService,
      auditComplianceServices.prisma,
    );
    fastify.log.info("✓ Audit Compliance module registered");

    // ============================================
    // Policy Controls Module
    // ============================================
    const policyControlsServices = container.getPolicyControlsServices();
    await registerPolicyControlsRoutes(fastify, policyControlsServices);
    fastify.log.info("✓ Policy Controls module registered");

    // Bank Feed Sync Module
    // ============================================
    const bankFeedSyncServices = container.getBankFeedSyncServices();
    await registerBankFeedSyncRoutes(
      fastify,
      bankFeedSyncServices,
      bankFeedSyncServices.prisma,
    );
    fastify.log.info("✓ Bank Feed Sync module registered");

    fastify.log.info("All modules registered successfully");
  },
  { name: "module-loader" },
);
