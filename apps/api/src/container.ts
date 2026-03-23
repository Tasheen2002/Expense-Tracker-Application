import { PrismaClient } from '@prisma/client';

// Event Bus
import { getEventBus } from './shared/domain/events/event-bus';
import { InMemoryCacheService } from './shared/infrastructure/cache/cache.service';
import { NotificationEventHandler } from '../../../modules/notification-dispatch/application/handlers/notification.handler';

import { AuditLogRepositoryImpl } from '../../../modules/audit-compliance/infrastructure/persistence/audit-log.repository.impl';
import { AuditService } from '../../../modules/audit-compliance/application/services/audit.service';
import { AuditEventListener } from '../../../modules/audit-compliance/infrastructure/listeners/audit-event.listener';
import { AuditLogController } from '../../../modules/audit-compliance/infrastructure/http/controllers/audit-log.controller';

// Audit Command & Query Handlers
import { CreateAuditLogHandler } from '../../../modules/audit-compliance/application/commands/create-audit-log.command';
import { PurgeAuditLogsHandler } from '../../../modules/audit-compliance/application/commands/purge-audit-logs.command';
import { GetAuditLogHandler } from '../../../modules/audit-compliance/application/queries/get-audit-log.query';
import { ListAuditLogsHandler } from '../../../modules/audit-compliance/application/queries/list-audit-logs.query';
import { GetEntityAuditHistoryHandler } from '../../../modules/audit-compliance/application/queries/get-entity-audit-history.query';
import { GetAuditSummaryHandler } from '../../../modules/audit-compliance/application/queries/get-audit-summary.query';

// Identity-Workspace Module
import { UserRepositoryImpl } from '../../../modules/identity-workspace/infrastructure/persistence/user.repository.impl';
import { WorkspaceRepositoryImpl } from '../../../modules/identity-workspace/infrastructure/persistence/workspace.repository.impl';
import { WorkspaceMembershipRepositoryImpl } from '../../../modules/identity-workspace/infrastructure/persistence/workspace-membership.repository.impl';
import { WorkspaceInvitationRepositoryImpl } from '../../../modules/identity-workspace/infrastructure/persistence/workspace-invitation.repository.impl';
import { UserManagementService } from '../../../modules/identity-workspace/application/services/user-management.service';
import { WorkspaceManagementService } from '../../../modules/identity-workspace/application/services/workspace-management.service';
import { WorkspaceMembershipService } from '../../../modules/identity-workspace/application/services/workspace-membership.service';
import { WorkspaceInvitationService } from '../../../modules/identity-workspace/application/services/workspace-invitation.service';
import { RegisterUserHandler } from '../../../modules/identity-workspace/application/commands/register-user.command';
import { LoginUserHandler } from '../../../modules/identity-workspace/application/queries/login-user.query';
import { GetUserHandler } from '../../../modules/identity-workspace/application/queries/get-user.query';
import { CreateWorkspaceHandler } from '../../../modules/identity-workspace/application/commands/create-workspace.command';
import { UpdateWorkspaceHandler } from '../../../modules/identity-workspace/application/commands/update-workspace.command';
import { DeleteWorkspaceHandler } from '../../../modules/identity-workspace/application/commands/delete-workspace.command';
import { GetWorkspaceByIdHandler } from '../../../modules/identity-workspace/application/queries/get-workspace-by-id.query';
import { GetUserWorkspacesHandler } from '../../../modules/identity-workspace/application/queries/get-user-workspaces.query';
import { CreateInvitationHandler } from '../../../modules/identity-workspace/application/commands/create-invitation.command';
import { AcceptInvitationHandler } from '../../../modules/identity-workspace/application/commands/accept-invitation.command';
import { CancelInvitationHandler } from '../../../modules/identity-workspace/application/commands/cancel-invitation.command';
import { GetInvitationByTokenHandler } from '../../../modules/identity-workspace/application/queries/get-invitation-by-token.query';
import { GetWorkspaceInvitationsHandler } from '../../../modules/identity-workspace/application/queries/get-workspace-invitations.query';
import { GetPendingInvitationsHandler } from '../../../modules/identity-workspace/application/queries/get-pending-invitations.query';
import { WorkspaceAuthHelper } from '../../../modules/identity-workspace/infrastructure/http/middleware/workspace-auth.helper';
import { AuthController } from '../../../modules/identity-workspace/infrastructure/http/controllers/auth.controller';
import { WorkspaceController } from '../../../modules/identity-workspace/infrastructure/http/controllers/workspace.controller';
import { InvitationController } from '../../../modules/identity-workspace/infrastructure/http/controllers/invitation.controller';
import { MemberController } from '../../../modules/identity-workspace/infrastructure/http/controllers/member.controller';
import { ListWorkspaceMembersHandler } from '../../../modules/identity-workspace/application/queries/list-workspace-members.query';
import { RemoveMemberHandler } from '../../../modules/identity-workspace/application/commands/remove-member.command';
import { ChangeMemberRoleHandler } from '../../../modules/identity-workspace/application/commands/change-member-role.command';

import { ExpenseRepositoryImpl } from '../../../modules/expense-ledger/infrastructure/persistence/expense.repository.impl';
import { CategoryRepositoryImpl } from '../../../modules/expense-ledger/infrastructure/persistence/category.repository.impl';
import { TagRepositoryImpl } from '../../../modules/expense-ledger/infrastructure/persistence/tag.repository.impl';
import { AttachmentRepositoryImpl } from '../../../modules/expense-ledger/infrastructure/persistence/attachment.repository.impl';
import { ExpenseSplitRepositoryImpl } from '../../../modules/expense-ledger/infrastructure/persistence/expense-split.repository.impl';
import { SplitSettlementRepositoryImpl } from '../../../modules/expense-ledger/infrastructure/persistence/split-settlement.repository.impl';

import { ExpenseService } from '../../../modules/expense-ledger/application/services/expense.service';
import { CategoryService } from '../../../modules/expense-ledger/application/services/category.service';
import { TagService } from '../../../modules/expense-ledger/application/services/tag.service';
import { AttachmentService } from '../../../modules/expense-ledger/application/services/attachment.service';
import { ExpenseSplitService } from '../../../modules/expense-ledger/application/services/expense-split.service';

// Expense-Ledger Module - Command Handlers
import { CreateExpenseHandler } from '../../../modules/expense-ledger/application/commands/create-expense.command';
import { UpdateExpenseHandler } from '../../../modules/expense-ledger/application/commands/update-expense.command';
import { DeleteExpenseHandler } from '../../../modules/expense-ledger/application/commands/delete-expense.command';
import { SubmitExpenseHandler } from '../../../modules/expense-ledger/application/commands/submit-expense.command';
import { ApproveExpenseHandler } from '../../../modules/expense-ledger/application/commands/approve-expense.command';
import { RejectExpenseHandler } from '../../../modules/expense-ledger/application/commands/reject-expense.command';
import { ReimburseExpenseHandler } from '../../../modules/expense-ledger/application/commands/reimburse-expense.command';
import { CreateCategoryHandler } from '../../../modules/expense-ledger/application/commands/create-category.command';
import { UpdateCategoryHandler } from '../../../modules/expense-ledger/application/commands/update-category.command';
import { DeleteCategoryHandler } from '../../../modules/expense-ledger/application/commands/delete-category.command';
import { CreateTagHandler } from '../../../modules/expense-ledger/application/commands/create-tag.command';
import { UpdateTagHandler } from '../../../modules/expense-ledger/application/commands/update-tag.command';
import { DeleteTagHandler } from '../../../modules/expense-ledger/application/commands/delete-tag.command';
import { CreateAttachmentHandler } from '../../../modules/expense-ledger/application/commands/create-attachment.command';
import { DeleteAttachmentHandler } from '../../../modules/expense-ledger/application/commands/delete-attachment.command';
import { CreateSplitHandler } from '../../../modules/expense-ledger/application/commands/create-split.command';
import { DeleteSplitHandler } from '../../../modules/expense-ledger/application/commands/delete-split.command';
import { RecordPaymentHandler } from '../../../modules/expense-ledger/application/commands/record-payment.command';
import { GetSplitHandler } from '../../../modules/expense-ledger/application/queries/get-split.query';
import { GetSplitByExpenseHandler } from '../../../modules/expense-ledger/application/queries/get-split-by-expense.query';
import { ListUserSplitsHandler } from '../../../modules/expense-ledger/application/queries/list-user-splits.query';
import { ListUserSettlementsHandler } from '../../../modules/expense-ledger/application/queries/list-user-settlements.query';
import { GetSplitSettlementsHandler } from '../../../modules/expense-ledger/application/queries/get-split-settlements.query';

// Expense-Ledger Module - Query Handlers
import { GetExpenseHandler } from '../../../modules/expense-ledger/application/queries/get-expense.query';
import { FilterExpensesHandler } from '../../../modules/expense-ledger/application/queries/filter-expenses.query';
import { GetExpenseStatisticsHandler } from '../../../modules/expense-ledger/application/queries/get-expense-statistics.query';
import { GetCategoryHandler } from '../../../modules/expense-ledger/application/queries/get-category.query';
import { ListCategoriesHandler } from '../../../modules/expense-ledger/application/queries/list-categories.query';
import { GetTagHandler } from '../../../modules/expense-ledger/application/queries/get-tag.query';
import { ListTagsHandler } from '../../../modules/expense-ledger/application/queries/list-tags.query';
import { GetAttachmentHandler } from '../../../modules/expense-ledger/application/queries/get-attachment.query';
import { ListAttachmentsHandler } from '../../../modules/expense-ledger/application/queries/list-attachments.query';

import { ExpenseController } from '../../../modules/expense-ledger/infrastructure/http/controllers/expense.controller';
import { CategoryController } from '../../../modules/expense-ledger/infrastructure/http/controllers/category.controller';
import { TagController } from '../../../modules/expense-ledger/infrastructure/http/controllers/tag.controller';
import { AttachmentController } from '../../../modules/expense-ledger/infrastructure/http/controllers/attachment.controller';
import { ExpenseSplitController } from '../../../modules/expense-ledger/infrastructure/http/controllers/expense-split.controller';

// Recurring Expense
import { PrismaRecurringExpenseRepository } from '../../../modules/expense-ledger/infrastructure/persistence/recurring-expense.repository.impl';
import { RecurringExpenseService } from '../../../modules/expense-ledger/application/services/recurring-expense.service';
import { CreateRecurringExpenseHandler } from '../../../modules/expense-ledger/application/commands/create-recurring-expense.command';
import { PauseRecurringExpenseHandler } from '../../../modules/expense-ledger/application/commands/pause-recurring-expense.command';
import { ResumeRecurringExpenseHandler } from '../../../modules/expense-ledger/application/commands/resume-recurring-expense.command';
import { StopRecurringExpenseHandler } from '../../../modules/expense-ledger/application/commands/stop-recurring-expense.command';
import { ProcessRecurringExpensesHandler } from '../../../modules/expense-ledger/application/commands/process-recurring-expenses.command';
import { RecurringExpenseController } from '../../../modules/expense-ledger/infrastructure/http/controllers/recurring-expense.controller';

// Budget Management Module - Repositories
import { BudgetRepositoryImpl } from '../../../modules/budget-management/infrastructure/persistence/budget.repository.impl';
import { BudgetAllocationRepositoryImpl } from '../../../modules/budget-management/infrastructure/persistence/budget-allocation.repository.impl';
import { BudgetAlertRepositoryImpl } from '../../../modules/budget-management/infrastructure/persistence/budget-alert.repository.impl';
import { SpendingLimitRepositoryImpl } from '../../../modules/budget-management/infrastructure/persistence/spending-limit.repository.impl';

// Budget Management Module - Services
import { BudgetService } from '../../../modules/budget-management/application/services/budget.service';
import { SpendingLimitService } from '../../../modules/budget-management/application/services/spending-limit.service';

// Budget Management Module - Command Handlers
import { CreateBudgetHandler } from '../../../modules/budget-management/application/commands/create-budget.command';
import { UpdateBudgetHandler } from '../../../modules/budget-management/application/commands/update-budget.command';
import { DeleteBudgetHandler } from '../../../modules/budget-management/application/commands/delete-budget.command';
import { ActivateBudgetHandler } from '../../../modules/budget-management/application/commands/activate-budget.command';
import { ArchiveBudgetHandler } from '../../../modules/budget-management/application/commands/archive-budget.command';
import { AddAllocationHandler } from '../../../modules/budget-management/application/commands/add-allocation.command';
import { UpdateAllocationHandler } from '../../../modules/budget-management/application/commands/update-allocation.command';
import { DeleteAllocationHandler } from '../../../modules/budget-management/application/commands/delete-allocation.command';
import { CreateSpendingLimitHandler } from '../../../modules/budget-management/application/commands/create-spending-limit.command';
import { UpdateSpendingLimitHandler } from '../../../modules/budget-management/application/commands/update-spending-limit.command';
import { DeleteSpendingLimitHandler } from '../../../modules/budget-management/application/commands/delete-spending-limit.command';

// Budget Management Module - Query Handlers
import { GetBudgetHandler } from '../../../modules/budget-management/application/queries/get-budget.query';
import { ListBudgetsHandler } from '../../../modules/budget-management/application/queries/list-budgets.query';
import { GetAllocationsHandler } from '../../../modules/budget-management/application/queries/get-allocations.query';
import { GetUnreadAlertsHandler } from '../../../modules/budget-management/application/queries/get-unread-alerts.query';
import { ListSpendingLimitsHandler } from '../../../modules/budget-management/application/queries/list-spending-limits.query';

// Budget Management Module - Controllers
import { BudgetController } from '../../../modules/budget-management/infrastructure/http/controllers/budget.controller';
import { SpendingLimitController } from '../../../modules/budget-management/infrastructure/http/controllers/spending-limit.controller';

// Receipt Vault Module - Repositories
import { ReceiptRepositoryImpl } from '../../../modules/receipt-vault/infrastructure/persistence/receipt.repository.impl';
import { ReceiptMetadataRepositoryImpl } from '../../../modules/receipt-vault/infrastructure/persistence/receipt-metadata.repository.impl';
import { ReceiptTagDefinitionRepositoryImpl } from '../../../modules/receipt-vault/infrastructure/persistence/receipt-tag-definition.repository.impl';
import { ReceiptTagRepositoryImpl } from '../../../modules/receipt-vault/infrastructure/persistence/receipt-tag.repository.impl';

// Receipt Vault Module - Services
import { ReceiptService } from '../../../modules/receipt-vault/application/services/receipt.service';
import { TagService as ReceiptTagService } from '../../../modules/receipt-vault/application/services/tag.service';
import { LocalFileStorageAdapter } from '../../../modules/receipt-vault/infrastructure/adapters/local-file-storage.adapter';
import * as path from 'path';

// Receipt Vault Module - Command Handlers
import { UploadReceiptHandler } from '../../../modules/receipt-vault/application/commands/upload-receipt.command';
import { LinkReceiptToExpenseHandler } from '../../../modules/receipt-vault/application/commands/link-receipt-to-expense.command';
import { UnlinkReceiptFromExpenseHandler } from '../../../modules/receipt-vault/application/commands/unlink-receipt-from-expense.command';
import { ProcessReceiptHandler } from '../../../modules/receipt-vault/application/commands/process-receipt.command';
import { VerifyReceiptHandler } from '../../../modules/receipt-vault/application/commands/verify-receipt.command';
import { RejectReceiptHandler } from '../../../modules/receipt-vault/application/commands/reject-receipt.command';
import { DeleteReceiptHandler } from '../../../modules/receipt-vault/application/commands/delete-receipt.command';
import { AddReceiptMetadataHandler } from '../../../modules/receipt-vault/application/commands/add-receipt-metadata.command';
import { UpdateReceiptMetadataHandler } from '../../../modules/receipt-vault/application/commands/update-receipt-metadata.command';
import { AddReceiptTagHandler } from '../../../modules/receipt-vault/application/commands/add-receipt-tag.command';
import { RemoveReceiptTagHandler } from '../../../modules/receipt-vault/application/commands/remove-receipt-tag.command';
import { CreateTagHandler as CreateReceiptTagHandler } from '../../../modules/receipt-vault/application/commands/create-tag.command';
import { UpdateTagHandler as UpdateReceiptTagHandler } from '../../../modules/receipt-vault/application/commands/update-tag.command';
import { DeleteTagHandler as DeleteReceiptTagHandler } from '../../../modules/receipt-vault/application/commands/delete-tag.command';

// Receipt Vault Module - Query Handlers
import { GetReceiptHandler } from '../../../modules/receipt-vault/application/queries/get-receipt.query';
import { ListReceiptsHandler } from '../../../modules/receipt-vault/application/queries/list-receipts.query';
import { GetReceiptsByExpenseHandler } from '../../../modules/receipt-vault/application/queries/get-receipts-by-expense.query';
import { GetReceiptMetadataHandler } from '../../../modules/receipt-vault/application/queries/get-receipt-metadata.query';
import { GetReceiptStatsHandler } from '../../../modules/receipt-vault/application/queries/get-receipt-stats.query';
import { ListTagsHandler as ListReceiptTagsHandler } from '../../../modules/receipt-vault/application/queries/list-tags.query';

// Receipt Vault Module - Controllers
import { ReceiptController } from '../../../modules/receipt-vault/infrastructure/http/controllers/receipt.controller';
import { TagController as ReceiptTagController } from '../../../modules/receipt-vault/infrastructure/http/controllers/tag.controller';

// Approval Workflow Module - Repositories
import { PrismaApprovalChainRepository } from '../../../modules/approval-workflow/infrastructure/persistence/approval-chain.repository.impl';
import { PrismaExpenseWorkflowRepository } from '../../../modules/approval-workflow/infrastructure/persistence/expense-workflow.repository.impl';

// Approval Workflow Module - Services
import { ApprovalChainService } from '../../../modules/approval-workflow/application/services/approval-chain.service';
import { WorkflowService } from '../../../modules/approval-workflow/application/services/workflow.service';

// Approval Workflow Module - Command Handlers
import { CreateApprovalChainHandler } from '../../../modules/approval-workflow/application/commands/create-approval-chain.command';
import { UpdateApprovalChainHandler } from '../../../modules/approval-workflow/application/commands/update-approval-chain.command';
import { DeleteApprovalChainHandler } from '../../../modules/approval-workflow/application/commands/delete-approval-chain.command';
import { ActivateApprovalChainHandler } from '../../../modules/approval-workflow/application/commands/activate-approval-chain.command';
import { DeactivateApprovalChainHandler } from '../../../modules/approval-workflow/application/commands/deactivate-approval-chain.command';
import { InitiateWorkflowHandler } from '../../../modules/approval-workflow/application/commands/initiate-workflow.command';
import { ApproveStepHandler } from '../../../modules/approval-workflow/application/commands/approve-step.command';
import { RejectStepHandler } from '../../../modules/approval-workflow/application/commands/reject-step.command';
import { DelegateStepHandler } from '../../../modules/approval-workflow/application/commands/delegate-step.command';
import { CancelWorkflowHandler } from '../../../modules/approval-workflow/application/commands/cancel-workflow.command';

// Approval Workflow Module - Query Handlers
import { GetApprovalChainHandler } from '../../../modules/approval-workflow/application/queries/get-approval-chain.query';
import { ListApprovalChainsHandler } from '../../../modules/approval-workflow/application/queries/list-approval-chains.query';
import { GetWorkflowHandler } from '../../../modules/approval-workflow/application/queries/get-workflow.query';
import { ListPendingApprovalsHandler } from '../../../modules/approval-workflow/application/queries/list-pending-approvals.query';
import { ListUserWorkflowsHandler } from '../../../modules/approval-workflow/application/queries/list-user-workflows.query';

// Approval Workflow Module - Controllers
import { ApprovalChainController } from '../../../modules/approval-workflow/infrastructure/http/controllers/approval-chain.controller';
import { WorkflowController } from '../../../modules/approval-workflow/infrastructure/http/controllers/workflow.controller';

// Notification Dispatch Module - Repositories
import { NotificationRepositoryImpl } from '../../../modules/notification-dispatch/infrastructure/persistence/notification.repository.impl';
import { NotificationTemplateRepositoryImpl } from '../../../modules/notification-dispatch/infrastructure/persistence/notification-template.repository.impl';
import { NotificationPreferenceRepositoryImpl } from '../../../modules/notification-dispatch/infrastructure/persistence/notification-preference.repository.impl';

// Notification Dispatch Module - Services
import { NotificationService } from '../../../modules/notification-dispatch/application/services/notification.service';
import { TemplateService } from '../../../modules/notification-dispatch/application/services/template.service';
import { PreferenceService } from '../../../modules/notification-dispatch/application/services/preference.service';

// Notification Dispatch Module - Command Handlers
import { SendNotificationHandler } from '../../../modules/notification-dispatch/application/commands/send-notification.command';
import { MarkAsReadHandler as NotificationMarkAsReadHandler } from '../../../modules/notification-dispatch/application/commands/mark-as-read.command';
import { MarkAllAsReadHandler as NotificationMarkAllAsReadHandler } from '../../../modules/notification-dispatch/application/commands/mark-all-as-read.command';
import { UpdatePreferencesHandler as NotificationUpdatePreferencesHandler } from '../../../modules/notification-dispatch/application/commands/update-preferences.command';
import { UpdateTypePreferenceHandler } from '../../../modules/notification-dispatch/application/commands/update-type-preference.command';
import { CreateTemplateHandler } from '../../../modules/notification-dispatch/application/commands/create-template.command';
import { UpdateTemplateHandler as NotificationUpdateTemplateHandler } from '../../../modules/notification-dispatch/application/commands/update-template.command';
import { ActivateTemplateHandler } from '../../../modules/notification-dispatch/application/commands/activate-template.command';
import { DeactivateTemplateHandler } from '../../../modules/notification-dispatch/application/commands/deactivate-template.command';

// Notification Dispatch Module - Query Handlers
import { ListNotificationsHandler } from '../../../modules/notification-dispatch/application/queries/list-notifications.query';
import { GetUnreadCountHandler } from '../../../modules/notification-dispatch/application/queries/get-unread-count.query';
import { GetUnreadNotificationsHandler } from '../../../modules/notification-dispatch/application/queries/get-unread-notifications.query';
import { GetPreferencesHandler as NotificationGetPreferencesHandler } from '../../../modules/notification-dispatch/application/queries/get-preferences.query';

import { CheckChannelEnabledHandler } from '../../../modules/notification-dispatch/application/queries/check-channel-enabled.query';
import { GetTemplateByIdHandler } from '../../../modules/notification-dispatch/application/queries/get-template-by-id.query';
import { GetActiveTemplateHandler as NotificationGetActiveTemplateHandler } from '../../../modules/notification-dispatch/application/queries/get-active-template.query';

// Notification Dispatch Module - Infrastructure Adapters
import { PrismaRecipientLookupAdapter } from '../../../modules/notification-dispatch/infrastructure/adapters/recipient-lookup.adapter';

// Notification Dispatch Module - Controllers
import { NotificationController } from '../../../modules/notification-dispatch/infrastructure/http/controllers/notification.controller';
import { TemplateController } from '../../../modules/notification-dispatch/infrastructure/http/controllers/template.controller';
import { PreferenceController } from '../../../modules/notification-dispatch/infrastructure/http/controllers/preference.controller';

// Cost Allocation Module - Repositories
import { DepartmentRepositoryImpl } from '../../../modules/cost-allocation/infrastructure/persistence/department.repository.impl';
import { CostCenterRepositoryImpl } from '../../../modules/cost-allocation/infrastructure/persistence/cost-center.repository.impl';
import { ProjectRepositoryImpl } from '../../../modules/cost-allocation/infrastructure/persistence/project.repository.impl';
import { ExpenseAllocationRepositoryImpl } from '../../../modules/cost-allocation/infrastructure/persistence/expense-allocation.repository.impl';

// Cost Allocation Module - Services
import { AllocationManagementService } from '../../../modules/cost-allocation/application/services/allocation-management.service';
import { ExpenseAllocationService } from '../../../modules/cost-allocation/application/services/expense-allocation.service';

// Cost Allocation Module - Adapters
import { PrismaExpenseLookupAdapter } from '../../../modules/cost-allocation/infrastructure/adapters/prisma-expense-lookup.adapter';
import { PrismaAllocationSummaryAdapter } from '../../../modules/cost-allocation/infrastructure/adapters/prisma-allocation-summary.adapter';
import { PrismaWorkspaceAccessAdapter } from '../../../modules/cost-allocation/infrastructure/adapters/prisma-workspace-access.adapter';

// Cost Allocation Module - Command Handlers
import { CreateDepartmentHandler } from '../../../modules/cost-allocation/application/commands/create-department.command';
import { UpdateDepartmentHandler } from '../../../modules/cost-allocation/application/commands/update-department.command';
import { DeleteDepartmentHandler } from '../../../modules/cost-allocation/application/commands/delete-department.command';
import { ActivateDepartmentHandler } from '../../../modules/cost-allocation/application/commands/activate-department.command';
import { CreateCostCenterHandler } from '../../../modules/cost-allocation/application/commands/create-cost-center.command';
import { UpdateCostCenterHandler } from '../../../modules/cost-allocation/application/commands/update-cost-center.command';
import { DeleteCostCenterHandler } from '../../../modules/cost-allocation/application/commands/delete-cost-center.command';
import { ActivateCostCenterHandler } from '../../../modules/cost-allocation/application/commands/activate-cost-center.command';
import { CreateProjectHandler } from '../../../modules/cost-allocation/application/commands/create-project.command';
import { UpdateProjectHandler } from '../../../modules/cost-allocation/application/commands/update-project.command';
import { DeleteProjectHandler } from '../../../modules/cost-allocation/application/commands/delete-project.command';
import { ActivateProjectHandler } from '../../../modules/cost-allocation/application/commands/activate-project.command';
import { AllocateExpenseHandler } from '../../../modules/cost-allocation/application/commands/allocate-expense.command';
import { DeleteAllocationsHandler } from '../../../modules/cost-allocation/application/commands/delete-allocations.command';

// Cost Allocation Module - Query Handlers
import { GetDepartmentHandler } from '../../../modules/cost-allocation/application/queries/get-department.query';
import { ListDepartmentsHandler } from '../../../modules/cost-allocation/application/queries/list-departments.query';
import { GetCostCenterHandler } from '../../../modules/cost-allocation/application/queries/get-cost-center.query';
import { ListCostCentersHandler } from '../../../modules/cost-allocation/application/queries/list-cost-centers.query';
import { GetProjectHandler } from '../../../modules/cost-allocation/application/queries/get-project.query';
import { ListProjectsHandler } from '../../../modules/cost-allocation/application/queries/list-projects.query';
import { GetExpenseAllocationsHandler } from '../../../modules/cost-allocation/application/queries/get-expense-allocations.query';
import { GetAllocationSummaryHandler } from '../../../modules/cost-allocation/application/queries/get-allocation-summary.query';

// Cost Allocation Module - Controllers
import { AllocationManagementController } from '../../../modules/cost-allocation/infrastructure/http/controllers/allocation-management.controller';
import { ExpenseAllocationController } from '../../../modules/cost-allocation/infrastructure/http/controllers/expense-allocation.controller';

// Categorization Rules Module - Repositories
import { PrismaCategoryRuleRepository } from '../../../modules/categorization-rules/infrastructure/persistence/category-rule.repository.impl';
import { PrismaRuleExecutionRepository } from '../../../modules/categorization-rules/infrastructure/persistence/rule-execution.repository.impl';
import { PrismaCategorySuggestionRepository } from '../../../modules/categorization-rules/infrastructure/persistence/category-suggestion.repository.impl';

// Categorization Rules Module - Services
import { CategoryRuleService } from '../../../modules/categorization-rules/application/services/category-rule.service';
import { RuleExecutionService } from '../../../modules/categorization-rules/application/services/rule-execution.service';
import { CategorySuggestionService } from '../../../modules/categorization-rules/application/services/category-suggestion.service';

// Categorization Rules Module - Command Handlers
import { CreateCategoryRuleHandler } from '../../../modules/categorization-rules/application/commands/create-category-rule.command';
import { UpdateCategoryRuleHandler } from '../../../modules/categorization-rules/application/commands/update-category-rule.command';
import { DeleteCategoryRuleHandler } from '../../../modules/categorization-rules/application/commands/delete-category-rule.command';
import { ActivateCategoryRuleHandler } from '../../../modules/categorization-rules/application/commands/activate-category-rule.command';
import { DeactivateCategoryRuleHandler } from '../../../modules/categorization-rules/application/commands/deactivate-category-rule.command';
import { EvaluateRulesHandler } from '../../../modules/categorization-rules/application/commands/evaluate-rules.command';
import { CreateSuggestionHandler } from '../../../modules/categorization-rules/application/commands/create-suggestion.command';
import { AcceptSuggestionHandler } from '../../../modules/categorization-rules/application/commands/accept-suggestion.command';
import { RejectSuggestionHandler } from '../../../modules/categorization-rules/application/commands/reject-suggestion.command';
import { DeleteSuggestionHandler } from '../../../modules/categorization-rules/application/commands/delete-suggestion.command';

// Categorization Rules Module - Query Handlers
import { GetRuleByIdHandler } from '../../../modules/categorization-rules/application/queries/get-rule-by-id.query';
import { GetRulesByWorkspaceHandler } from '../../../modules/categorization-rules/application/queries/get-rules-by-workspace.query';
import { GetActiveRulesByWorkspaceHandler } from '../../../modules/categorization-rules/application/queries/get-active-rules-by-workspace.query';
import { GetExecutionsByRuleHandler } from '../../../modules/categorization-rules/application/queries/get-executions-by-rule.query';
import { GetExecutionsByExpenseHandler } from '../../../modules/categorization-rules/application/queries/get-executions-by-expense.query';
import { GetExecutionsByWorkspaceHandler } from '../../../modules/categorization-rules/application/queries/get-executions-by-workspace.query';
import { GetSuggestionByIdHandler } from '../../../modules/categorization-rules/application/queries/get-suggestion-by-id.query';
import { GetSuggestionsByExpenseHandler } from '../../../modules/categorization-rules/application/queries/get-suggestions-by-expense.query';
import { GetPendingSuggestionsByWorkspaceHandler } from '../../../modules/categorization-rules/application/queries/get-pending-suggestions-by-workspace.query';
import { GetSuggestionsByWorkspaceHandler } from '../../../modules/categorization-rules/application/queries/get-suggestions-by-workspace.query';

// Categorization Rules Module - Controllers
import { CategoryRuleController } from '../../../modules/categorization-rules/infrastructure/http/controllers/category-rule.controller';
import { RuleExecutionController } from '../../../modules/categorization-rules/infrastructure/http/controllers/rule-execution.controller';
import { CategorySuggestionController } from '../../../modules/categorization-rules/infrastructure/http/controllers/category-suggestion.controller';

// Budget Planning Module - Repositories
import { BudgetPlanRepositoryImpl } from '../../../modules/budget-planning/infrastructure/persistence/budget-plan.repository.impl';
import { ForecastRepositoryImpl } from '../../../modules/budget-planning/infrastructure/persistence/forecast.repository.impl';
import { ScenarioRepositoryImpl } from '../../../modules/budget-planning/infrastructure/persistence/scenario.repository.impl';
import { ForecastItemRepositoryImpl } from '../../../modules/budget-planning/infrastructure/persistence/forecast-item.repository.impl';

// Budget Planning Module - Services
import { BudgetPlanService } from '../../../modules/budget-planning/application/services/budget-plan.service';
import { ForecastService } from '../../../modules/budget-planning/application/services/forecast.service';
import { ScenarioService } from '../../../modules/budget-planning/application/services/scenario.service';

// Budget Planning Module - Command Handlers
import { CreateBudgetPlanHandler } from '../../../modules/budget-planning/application/commands/create-budget-plan.command';
import { UpdateBudgetPlanHandler } from '../../../modules/budget-planning/application/commands/update-budget-plan.command';
import { ActivateBudgetPlanHandler } from '../../../modules/budget-planning/application/commands/activate-budget-plan.command';
import { CreateForecastHandler } from '../../../modules/budget-planning/application/commands/create-forecast.command';
import { AddForecastItemHandler } from '../../../modules/budget-planning/application/commands/add-forecast-item.command';
import { CreateScenarioHandler } from '../../../modules/budget-planning/application/commands/create-scenario.command';
import { DeleteBudgetPlanHandler } from '../../../modules/budget-planning/application/commands/delete-budget-plan.command';
import {
  DeleteForecastHandler,
  DeleteForecastItemHandler,
} from '../../../modules/budget-planning/application/commands/delete-forecast.command';
import { DeleteScenarioHandler } from '../../../modules/budget-planning/application/commands/delete-scenario.command';

// Budget Planning Module - Query Handlers
import { GetBudgetPlanHandler } from '../../../modules/budget-planning/application/queries/get-budget-plan.query';
import { ListBudgetPlansHandler } from '../../../modules/budget-planning/application/queries/list-budget-plans.query';
import { GetForecastHandler } from '../../../modules/budget-planning/application/queries/get-forecast.query';
import { ListForecastsHandler } from '../../../modules/budget-planning/application/queries/list-forecasts.query';
import { GetForecastItemsHandler } from '../../../modules/budget-planning/application/queries/get-forecast-items.query';
import { GetScenarioHandler } from '../../../modules/budget-planning/application/queries/get-scenario.query';
import { ListScenariosHandler } from '../../../modules/budget-planning/application/queries/list-scenarios.query';

// Budget Planning Module - Controllers
import { BudgetPlanController } from '../../../modules/budget-planning/infrastructure/http/controllers/budget-plan.controller';
import { ForecastController } from '../../../modules/budget-planning/infrastructure/http/controllers/forecast.controller';
import { ScenarioController } from '../../../modules/budget-planning/infrastructure/http/controllers/scenario.controller';

// Policy Controls Module - Repositories
import { PrismaPolicyRepository } from '../../../modules/policy-controls/infrastructure/persistence/policy.repository.impl';
import { PrismaViolationRepository } from '../../../modules/policy-controls/infrastructure/persistence/violation.repository.impl';
import { PrismaExemptionRepository } from '../../../modules/policy-controls/infrastructure/persistence/exemption.repository.impl';

// Policy Controls Module - Services
import { PolicyEvaluationService } from '../../../modules/policy-controls/application/services/policy-evaluation.service';

// Policy Controls Module - Command Handlers
import { CreatePolicyHandler } from '../../../modules/policy-controls/application/commands/create-policy.command';
import { UpdatePolicyHandler } from '../../../modules/policy-controls/application/commands/update-policy.command';
import { ActivatePolicyHandler } from '../../../modules/policy-controls/application/commands/activate-policy.command';
import { DeactivatePolicyHandler } from '../../../modules/policy-controls/application/commands/deactivate-policy.command';
import { DeletePolicyHandler } from '../../../modules/policy-controls/application/commands/delete-policy.command';
import { AcknowledgeViolationHandler } from '../../../modules/policy-controls/application/commands/acknowledge-violation.command';
import { ResolveViolationHandler } from '../../../modules/policy-controls/application/commands/resolve-violation.command';
import { ExemptViolationHandler } from '../../../modules/policy-controls/application/commands/exempt-violation.command';
import { OverrideViolationHandler } from '../../../modules/policy-controls/application/commands/override-violation.command';
import { RequestExemptionHandler } from '../../../modules/policy-controls/application/commands/request-exemption.command';
import { ApproveExemptionHandler } from '../../../modules/policy-controls/application/commands/approve-exemption.command';
import { RejectExemptionHandler } from '../../../modules/policy-controls/application/commands/reject-exemption.command';

// Policy Controls Module - Query Handlers
import { GetPolicyHandler } from '../../../modules/policy-controls/application/queries/get-policy.query';
import { ListPoliciesHandler } from '../../../modules/policy-controls/application/queries/list-policies.query';
import { GetViolationHandler } from '../../../modules/policy-controls/application/queries/get-violation.query';
import { ListViolationsHandler } from '../../../modules/policy-controls/application/queries/list-violations.query';
import { GetViolationStatsHandler } from '../../../modules/policy-controls/application/queries/get-violation-stats.query';
import { GetExemptionHandler } from '../../../modules/policy-controls/application/queries/get-exemption.query';
import { ListExemptionsHandler } from '../../../modules/policy-controls/application/queries/list-exemptions.query';
import { CheckActiveExemptionHandler } from '../../../modules/policy-controls/application/queries/check-active-exemption.query';

// Policy Controls Module - Controllers
import { PolicyController } from '../../../modules/policy-controls/infrastructure/http/controllers/policy.controller';
import { ViolationController } from '../../../modules/policy-controls/infrastructure/http/controllers/violation.controller';
import { ExemptionController } from '../../../modules/policy-controls/infrastructure/http/controllers/exemption.controller';

// Bank Feed Sync Module - Repositories
import { PrismaBankConnectionRepository } from '../../../modules/bank-feed-sync/infrastructure/persistence/bank-connection.repository.impl';
import { PrismaSyncSessionRepository } from '../../../modules/bank-feed-sync/infrastructure/persistence/sync-session.repository.impl';
import { PrismaBankTransactionRepository } from '../../../modules/bank-feed-sync/infrastructure/persistence/bank-transaction.repository.impl';

// Bank Feed Sync Module - Services
import { TransactionSyncService } from '../../../modules/bank-feed-sync/application/services/transaction-sync.service';

// Bank Feed Sync Module - Command Handlers
import {
  ConnectBankHandler,
  DisconnectBankHandler,
  UpdateConnectionTokenHandler,
  DeleteConnectionHandler,
  SyncTransactionsHandler,
  ProcessTransactionHandler,
} from '../../../modules/bank-feed-sync/application/commands';

// Bank Feed Sync Module - Query Handlers
import {
  GetBankConnectionsHandler,
  GetBankConnectionHandler,
  GetSyncHistoryHandler,
  GetSyncSessionHandler,
  GetActiveSyncsHandler,
  GetPendingTransactionsHandler,
  GetBankTransactionHandler,
  GetTransactionsByConnectionHandler,
} from '../../../modules/bank-feed-sync/application/queries';

// Bank Feed Sync Module - Controllers
import { BankConnectionController } from '../../../modules/bank-feed-sync/infrastructure/http/controllers/bank-connection.controller';
import { TransactionSyncController } from '../../../modules/bank-feed-sync/infrastructure/http/controllers/transaction-sync.controller';
import { BankTransactionController } from '../../../modules/bank-feed-sync/infrastructure/http/controllers/bank-transaction.controller';

// Event Outbox Module - Repositories
import { OutboxEventRepositoryImpl } from '../../../modules/event-outbox/infrastructure/persistence/outbox-event.repository.impl';
import { IOutboxEventRepository } from '../../../modules/event-outbox/domain/repositories/outbox-event.repository';

// Event Outbox Module - Services
import { OutboxEventService } from '../../../modules/event-outbox/application/services/outbox-event.service';

// Event Outbox Module - Command Handlers
import { StoreOutboxEventHandler } from '../../../modules/event-outbox/application/commands/store-outbox-event.command';
import { ProcessOutboxEventHandler } from '../../../modules/event-outbox/application/commands/process-outbox-event.command';
import { RetryOutboxEventHandler } from '../../../modules/event-outbox/application/commands/retry-outbox-event.command';
import { RetryAllFailedEventsHandler } from '../../../modules/event-outbox/application/commands/retry-all-failed-events.command';
import { CleanupProcessedEventsHandler } from '../../../modules/event-outbox/application/commands/cleanup-processed-events.command';

// Event Outbox Module - Query Handlers
import { GetPendingEventsHandler } from '../../../modules/event-outbox/application/queries/get-pending-events.query';
import { GetFailedEventsHandler } from '../../../modules/event-outbox/application/queries/get-failed-events.query';
import { GetDeadLetterCountHandler } from '../../../modules/event-outbox/application/queries/get-dead-letter-count.query';

// Event Outbox Module - Controllers
import { OutboxEventController } from '../../../modules/event-outbox/infrastructure/http/controllers/outbox-event.controller';

/**
 * Dependency Injection Container
 * Following e-commerce pattern for service registration
 */
export class Container {
  private static instance: Container;
  private services: Map<string, unknown> = new Map();

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Register all services with dependencies
   */
  register(prisma: PrismaClient): void {
    const eventBus = getEventBus();
    const cacheService = new InMemoryCacheService();

    // ============================================
    // Identity-Workspace Module
    // ============================================

    // Repositories
    const userRepository = new UserRepositoryImpl(prisma, eventBus);
    const workspaceRepository = new WorkspaceRepositoryImpl(prisma, eventBus);
    const workspaceMembershipRepository = new WorkspaceMembershipRepositoryImpl(
      prisma,
      eventBus
    );
    const workspaceInvitationRepository = new WorkspaceInvitationRepositoryImpl(
      prisma,
      eventBus
    );

    this.services.set('userRepository', userRepository);
    this.services.set('workspaceRepository', workspaceRepository);
    this.services.set(
      'workspaceMembershipRepository',
      workspaceMembershipRepository
    );
    this.services.set(
      'workspaceInvitationRepository',
      workspaceInvitationRepository
    );

    // Services
    const userManagementService = new UserManagementService(userRepository);
    const workspaceManagementService = new WorkspaceManagementService(
      workspaceRepository,
      workspaceMembershipRepository
    );
    const workspaceMembershipService = new WorkspaceMembershipService(
      workspaceMembershipRepository,
      cacheService
    );
    const workspaceInvitationService = new WorkspaceInvitationService(
      workspaceInvitationRepository,
      workspaceMembershipRepository,
      userRepository
    );

    this.services.set('userManagementService', userManagementService);
    this.services.set('workspaceManagementService', workspaceManagementService);
    this.services.set('workspaceMembershipService', workspaceMembershipService);
    this.services.set('workspaceInvitationService', workspaceInvitationService);

    // Controllers
    const workspaceAuthHelper = new WorkspaceAuthHelper(
      workspaceMembershipService
    );

    const authController = new AuthController(
      new RegisterUserHandler(userManagementService),
      new LoginUserHandler(userManagementService),
      new GetUserHandler(userManagementService)
    );
    const workspaceController = new WorkspaceController(
      new CreateWorkspaceHandler(workspaceManagementService),
      new UpdateWorkspaceHandler(workspaceManagementService),
      new DeleteWorkspaceHandler(workspaceManagementService),
      new GetWorkspaceByIdHandler(workspaceManagementService),
      new GetUserWorkspacesHandler(workspaceManagementService),
      workspaceAuthHelper
    );
    const invitationController = new InvitationController(
      new CreateInvitationHandler(workspaceInvitationService),
      new AcceptInvitationHandler(workspaceInvitationService),
      new CancelInvitationHandler(workspaceInvitationService),
      new GetInvitationByTokenHandler(workspaceInvitationService),
      new GetWorkspaceInvitationsHandler(workspaceInvitationService),
      new GetPendingInvitationsHandler(workspaceInvitationService),
      workspaceAuthHelper
    );
    const memberController = new MemberController(
      new ListWorkspaceMembersHandler(workspaceMembershipService),
      new RemoveMemberHandler(workspaceMembershipService),
      new ChangeMemberRoleHandler(workspaceMembershipService),
      workspaceAuthHelper
    );

    this.services.set('authController', authController);
    this.services.set('workspaceController', workspaceController);
    this.services.set('invitationController', invitationController);
    this.services.set('memberController', memberController);

    // ============================================
    // Expense-Ledger Module
    // ============================================

    // Repositories
    const expenseRepository = new ExpenseRepositoryImpl(prisma, eventBus);
    const categoryRepository = new CategoryRepositoryImpl(prisma, eventBus);
    const tagRepository = new TagRepositoryImpl(prisma, eventBus);
    const attachmentRepository = new AttachmentRepositoryImpl(prisma, eventBus);
    const recurringExpenseRepository = new PrismaRecurringExpenseRepository(
      prisma,
      eventBus
    );
    const expenseSplitRepository = new ExpenseSplitRepositoryImpl(
      prisma,
      eventBus
    );
    const splitSettlementRepository = new SplitSettlementRepositoryImpl(
      prisma,
      eventBus
    );

    this.services.set('expenseRepository', expenseRepository);
    this.services.set('categoryRepository', categoryRepository);
    this.services.set('tagRepository', tagRepository);
    this.services.set('attachmentRepository', attachmentRepository);
    this.services.set('recurringExpenseRepository', recurringExpenseRepository);
    this.services.set('expenseSplitRepository', expenseSplitRepository);
    this.services.set('splitSettlementRepository', splitSettlementRepository);

    // Services
    const expenseService = new ExpenseService(expenseRepository, tagRepository);
    const categoryService = new CategoryService(
      categoryRepository,
      cacheService
    );
    const tagService = new TagService(tagRepository);
    const attachmentService = new AttachmentService(attachmentRepository);
    const recurringExpenseService = new RecurringExpenseService(
      recurringExpenseRepository,
      expenseService
    );
    const expenseSplitService = new ExpenseSplitService(
      expenseSplitRepository,
      splitSettlementRepository
    );

    this.services.set('expenseService', expenseService);
    this.services.set('categoryService', categoryService);
    this.services.set('tagService', tagService);
    this.services.set('attachmentService', attachmentService);
    this.services.set('recurringExpenseService', recurringExpenseService);
    this.services.set('expenseSplitService', expenseSplitService);

    // Command Handlers
    const createExpenseHandler = new CreateExpenseHandler(
      expenseService,
      categoryRepository,
      tagRepository
    );
    const updateExpenseHandler = new UpdateExpenseHandler(
      expenseService,
      categoryRepository
    );
    const deleteExpenseHandler = new DeleteExpenseHandler(expenseService);
    const submitExpenseHandler = new SubmitExpenseHandler(expenseService);
    const approveExpenseHandler = new ApproveExpenseHandler(expenseService);
    const rejectExpenseHandler = new RejectExpenseHandler(expenseService);
    const reimburseExpenseHandler = new ReimburseExpenseHandler(expenseService);

    const createCategoryHandler = new CreateCategoryHandler(categoryService);
    const updateCategoryHandler = new UpdateCategoryHandler(categoryService);
    const deleteCategoryHandler = new DeleteCategoryHandler(
      categoryService,
      expenseRepository
    );

    const createTagHandler = new CreateTagHandler(tagService);
    const updateTagHandler = new UpdateTagHandler(tagService);
    const deleteTagHandler = new DeleteTagHandler(tagService);

    const createAttachmentHandler = new CreateAttachmentHandler(
      attachmentService,
      expenseService
    );
    const deleteAttachmentHandler = new DeleteAttachmentHandler(
      attachmentService,
      expenseService
    );

    // Query Handlers
    const getExpenseHandler = new GetExpenseHandler(expenseService);
    const filterExpensesHandler = new FilterExpensesHandler(expenseService);
    const getExpenseStatisticsHandler = new GetExpenseStatisticsHandler(
      expenseService
    );

    const getCategoryHandler = new GetCategoryHandler(categoryService);
    const listCategoriesHandler = new ListCategoriesHandler(categoryService);

    const getTagHandler = new GetTagHandler(tagService);
    const listTagsHandler = new ListTagsHandler(tagService);

    const getAttachmentHandler = new GetAttachmentHandler(attachmentService);
    const listAttachmentsHandler = new ListAttachmentsHandler(
      attachmentService
    );

    const createRecurringExpenseHandler = new CreateRecurringExpenseHandler(
      recurringExpenseService
    );
    const pauseRecurringExpenseHandler = new PauseRecurringExpenseHandler(
      recurringExpenseService
    );
    const resumeRecurringExpenseHandler = new ResumeRecurringExpenseHandler(
      recurringExpenseService
    );
    const stopRecurringExpenseHandler = new StopRecurringExpenseHandler(
      recurringExpenseService
    );
    const processRecurringExpensesHandler = new ProcessRecurringExpensesHandler(
      recurringExpenseService
    );

    // Controllers
    const expenseController = new ExpenseController(
      createExpenseHandler,
      updateExpenseHandler,
      deleteExpenseHandler,
      submitExpenseHandler,
      approveExpenseHandler,
      rejectExpenseHandler,
      reimburseExpenseHandler,
      getExpenseHandler,
      filterExpensesHandler,
      getExpenseStatisticsHandler
    );

    const categoryController = new CategoryController(
      createCategoryHandler,
      updateCategoryHandler,
      deleteCategoryHandler,
      getCategoryHandler,
      listCategoriesHandler
    );

    const tagController = new TagController(
      createTagHandler,
      updateTagHandler,
      deleteTagHandler,
      getTagHandler,
      listTagsHandler
    );

    const attachmentController = new AttachmentController(
      createAttachmentHandler,
      deleteAttachmentHandler,
      getAttachmentHandler,
      listAttachmentsHandler
    );

    const recurringExpenseController = new RecurringExpenseController(
      createRecurringExpenseHandler,
      pauseRecurringExpenseHandler,
      resumeRecurringExpenseHandler,
      stopRecurringExpenseHandler,
      processRecurringExpensesHandler
    );

    const getSplitByExpenseHandler = new GetSplitByExpenseHandler(
      expenseSplitService
    );
    const getSplitSettlementsHandler = new GetSplitSettlementsHandler(
      expenseSplitService
    );

    const createSplitHandler = new CreateSplitHandler(
      expenseSplitService,
      expenseService
    );
    const deleteSplitHandler = new DeleteSplitHandler(expenseSplitService);
    const recordPaymentHandler = new RecordPaymentHandler(expenseSplitService);
    const getSplitHandler = new GetSplitHandler(expenseSplitService);
    const listUserSplitsHandler = new ListUserSplitsHandler(
      expenseSplitService
    );
    const listUserSettlementsHandler = new ListUserSettlementsHandler(
      expenseSplitService
    );

    const expenseSplitController = new ExpenseSplitController(
      createSplitHandler,
      deleteSplitHandler,
      recordPaymentHandler,
      getSplitHandler,
      getSplitByExpenseHandler,
      listUserSplitsHandler,
      listUserSettlementsHandler,
      getSplitSettlementsHandler
    );

    this.services.set('expenseController', expenseController);
    this.services.set('categoryController', categoryController);
    this.services.set('tagController', tagController);
    this.services.set('attachmentController', attachmentController);
    this.services.set('recurringExpenseController', recurringExpenseController);
    this.services.set('expenseSplitController', expenseSplitController);

    // ============================================
    // Budget Management Module
    // ============================================

    // Repositories
    const budgetRepository = new BudgetRepositoryImpl(prisma, eventBus);
    const budgetAllocationRepository = new BudgetAllocationRepositoryImpl(
      prisma,
      eventBus
    );
    const budgetAlertRepository = new BudgetAlertRepositoryImpl(
      prisma,
      eventBus
    );
    const spendingLimitRepository = new SpendingLimitRepositoryImpl(
      prisma,
      eventBus
    );

    this.services.set('budgetRepository', budgetRepository);
    this.services.set('budgetAllocationRepository', budgetAllocationRepository);
    this.services.set('budgetAlertRepository', budgetAlertRepository);
    this.services.set('spendingLimitRepository', spendingLimitRepository);

    // Services
    const budgetService = new BudgetService(
      budgetRepository,
      budgetAllocationRepository,
      budgetAlertRepository
    );
    const spendingLimitService = new SpendingLimitService(
      spendingLimitRepository
    );

    this.services.set('budgetService', budgetService);
    this.services.set('spendingLimitService', spendingLimitService);

    // Command Handlers
    const createBudgetHandler = new CreateBudgetHandler(budgetService);
    const updateBudgetHandler = new UpdateBudgetHandler(budgetService);
    const deleteBudgetHandler = new DeleteBudgetHandler(budgetService);
    const activateBudgetHandler = new ActivateBudgetHandler(budgetService);
    const archiveBudgetHandler = new ArchiveBudgetHandler(budgetService);
    const addAllocationHandler = new AddAllocationHandler(budgetService);
    const updateAllocationHandler = new UpdateAllocationHandler(budgetService);
    const deleteAllocationHandler = new DeleteAllocationHandler(budgetService);
    const createSpendingLimitHandler = new CreateSpendingLimitHandler(
      spendingLimitService
    );
    const updateSpendingLimitHandler = new UpdateSpendingLimitHandler(
      spendingLimitService
    );
    const deleteSpendingLimitHandler = new DeleteSpendingLimitHandler(
      spendingLimitService
    );

    // Query Handlers
    const getBudgetHandler = new GetBudgetHandler(budgetService);
    const listBudgetsHandler = new ListBudgetsHandler(budgetService);
    const getAllocationsHandler = new GetAllocationsHandler(budgetService);
    const getUnreadAlertsHandler = new GetUnreadAlertsHandler(budgetService);
    const listSpendingLimitsHandler = new ListSpendingLimitsHandler(
      spendingLimitService
    );

    // Controllers
    const budgetController = new BudgetController(
      createBudgetHandler,
      updateBudgetHandler,
      deleteBudgetHandler,
      activateBudgetHandler,
      archiveBudgetHandler,
      addAllocationHandler,
      updateAllocationHandler,
      deleteAllocationHandler,
      getBudgetHandler,
      listBudgetsHandler,
      getAllocationsHandler,
      getUnreadAlertsHandler
    );

    const spendingLimitController = new SpendingLimitController(
      createSpendingLimitHandler,
      updateSpendingLimitHandler,
      deleteSpendingLimitHandler,
      listSpendingLimitsHandler
    );

    this.services.set('budgetController', budgetController);
    this.services.set('spendingLimitController', spendingLimitController);

    // ============================================
    // Receipt Vault Module
    // ============================================

    // Repositories
    const receiptRepository = new ReceiptRepositoryImpl(prisma, eventBus);
    const receiptMetadataRepository = new ReceiptMetadataRepositoryImpl(
      prisma,
      eventBus
    );
    const receiptTagDefinitionRepository =
      new ReceiptTagDefinitionRepositoryImpl(prisma, eventBus);
    const receiptTagRepository = new ReceiptTagRepositoryImpl(prisma);

    this.services.set('receiptRepository', receiptRepository);
    this.services.set('receiptMetadataRepository', receiptMetadataRepository);
    this.services.set(
      'receiptTagDefinitionRepository',
      receiptTagDefinitionRepository
    );
    this.services.set('receiptTagRepository', receiptTagRepository);

    // Services
    const fileStorageService = new LocalFileStorageAdapter(
      path.join(process.cwd(), 'uploads'), // Verify this path is correct for your setup
      process.env.UPLOAD_BASE_URL || 'http://localhost:3000/uploads'
    );

    const receiptService = new ReceiptService(
      receiptRepository,
      receiptMetadataRepository,
      receiptTagRepository,
      fileStorageService
    );
    const receiptTagService = new ReceiptTagService(
      receiptTagDefinitionRepository,
      receiptTagRepository
    );

    this.services.set('fileStorageService', fileStorageService);
    this.services.set('receiptService', receiptService);
    this.services.set('receiptTagService', receiptTagService);

    // Command Handlers
    const uploadReceiptHandler = new UploadReceiptHandler(receiptService);
    const linkReceiptToExpenseHandler = new LinkReceiptToExpenseHandler(
      receiptService
    );
    const unlinkReceiptFromExpenseHandler = new UnlinkReceiptFromExpenseHandler(
      receiptService
    );
    const processReceiptHandler = new ProcessReceiptHandler(receiptService);
    const verifyReceiptHandler = new VerifyReceiptHandler(receiptService);
    const rejectReceiptHandler = new RejectReceiptHandler(receiptService);
    const deleteReceiptHandler = new DeleteReceiptHandler(receiptService);
    const addReceiptMetadataHandler = new AddReceiptMetadataHandler(
      receiptService
    );
    const updateReceiptMetadataHandler = new UpdateReceiptMetadataHandler(
      receiptService
    );
    const addReceiptTagHandler = new AddReceiptTagHandler(receiptService);
    const removeReceiptTagHandler = new RemoveReceiptTagHandler(receiptService);
    const createReceiptTagHandler = new CreateReceiptTagHandler(
      receiptTagService
    );
    const updateReceiptTagHandler = new UpdateReceiptTagHandler(
      receiptTagService
    );
    const deleteReceiptTagHandler = new DeleteReceiptTagHandler(
      receiptTagService
    );

    // Query Handlers
    const getReceiptHandler = new GetReceiptHandler(receiptService);
    const listReceiptsHandler = new ListReceiptsHandler(receiptService);
    const getReceiptsByExpenseHandler = new GetReceiptsByExpenseHandler(
      receiptService
    );
    const getReceiptMetadataHandler = new GetReceiptMetadataHandler(
      receiptService
    );
    const getReceiptStatsHandler = new GetReceiptStatsHandler(receiptService);
    const listReceiptTagsHandler = new ListReceiptTagsHandler(
      receiptTagService
    );

    // Controllers
    const receiptController = new ReceiptController(
      uploadReceiptHandler,
      linkReceiptToExpenseHandler,
      unlinkReceiptFromExpenseHandler,
      processReceiptHandler,
      verifyReceiptHandler,
      rejectReceiptHandler,
      deleteReceiptHandler,
      addReceiptMetadataHandler,
      updateReceiptMetadataHandler,
      addReceiptTagHandler,
      removeReceiptTagHandler,
      getReceiptHandler,
      listReceiptsHandler,
      getReceiptsByExpenseHandler,
      getReceiptMetadataHandler,
      getReceiptStatsHandler
    );

    const receiptTagController = new ReceiptTagController(
      createReceiptTagHandler,
      updateReceiptTagHandler,
      deleteReceiptTagHandler,
      listReceiptTagsHandler
    );

    this.services.set('receiptController', receiptController);
    this.services.set('receiptTagController', receiptTagController);

    // ============================================
    // Approval Workflow Module
    // ============================================

    // Repositories
    const approvalChainRepository = new PrismaApprovalChainRepository(
      prisma,
      eventBus
    );
    const expenseWorkflowRepository = new PrismaExpenseWorkflowRepository(
      prisma,
      eventBus
    );

    this.services.set('approvalChainRepository', approvalChainRepository);
    this.services.set('expenseWorkflowRepository', expenseWorkflowRepository);

    // Services
    const approvalChainService = new ApprovalChainService(
      approvalChainRepository
    );
    const workflowService = new WorkflowService(
      expenseWorkflowRepository,
      approvalChainRepository
    );

    this.services.set('approvalChainService', approvalChainService);
    this.services.set('workflowService', workflowService);

    // Command Handlers - Approval Chain
    const createApprovalChainHandler = new CreateApprovalChainHandler(
      approvalChainService
    );
    const updateApprovalChainHandler = new UpdateApprovalChainHandler(
      approvalChainService
    );
    const deleteApprovalChainHandler = new DeleteApprovalChainHandler(
      approvalChainService
    );
    const activateApprovalChainHandler = new ActivateApprovalChainHandler(
      approvalChainService
    );
    const deactivateApprovalChainHandler = new DeactivateApprovalChainHandler(
      approvalChainService
    );

    // Query Handlers - Approval Chain
    const getApprovalChainHandler = new GetApprovalChainHandler(
      approvalChainService
    );
    const listApprovalChainsHandler = new ListApprovalChainsHandler(
      approvalChainService
    );

    // Command Handlers - Workflow
    const initiateWorkflowHandler = new InitiateWorkflowHandler(
      workflowService
    );
    const approveStepHandler = new ApproveStepHandler(workflowService);
    const rejectStepHandler = new RejectStepHandler(workflowService);
    const delegateStepHandler = new DelegateStepHandler(workflowService);
    const cancelWorkflowHandler = new CancelWorkflowHandler(workflowService);

    // Query Handlers - Workflow
    const getWorkflowHandler = new GetWorkflowHandler(workflowService);
    const listPendingApprovalsHandler = new ListPendingApprovalsHandler(
      workflowService
    );
    const listUserWorkflowsHandler = new ListUserWorkflowsHandler(
      workflowService
    );

    // Controllers
    const approvalChainController = new ApprovalChainController(
      createApprovalChainHandler,
      updateApprovalChainHandler,
      deleteApprovalChainHandler,
      getApprovalChainHandler,
      listApprovalChainsHandler,
      activateApprovalChainHandler,
      deactivateApprovalChainHandler
    );
    const workflowController = new WorkflowController(
      initiateWorkflowHandler,
      approveStepHandler,
      rejectStepHandler,
      delegateStepHandler,
      cancelWorkflowHandler,
      getWorkflowHandler,
      listPendingApprovalsHandler,
      listUserWorkflowsHandler
    );

    this.services.set('approvalChainController', approvalChainController);
    this.services.set('workflowController', workflowController);

    // ============================================
    // Notification Dispatch Module
    // ============================================

    // Repositories - Notification
    const notificationRepository = new NotificationRepositoryImpl(
      prisma,
      eventBus
    );
    const notificationTemplateRepository =
      new NotificationTemplateRepositoryImpl(prisma);

    // Repositories - Audit
    const auditRepository = new AuditLogRepositoryImpl(prisma, eventBus);
    this.services.set('auditLogRepository', auditRepository);
    const notificationPreferenceRepository =
      new NotificationPreferenceRepositoryImpl(prisma);

    this.services.set('notificationRepository', notificationRepository);
    this.services.set(
      'notificationTemplateRepository',
      notificationTemplateRepository
    );
    this.services.set(
      'notificationPreferenceRepository',
      notificationPreferenceRepository
    );

    // Services - Notification
    const recipientLookup = new PrismaRecipientLookupAdapter(userRepository);
    const notificationService = new NotificationService(
      notificationRepository,
      notificationTemplateRepository,
      notificationPreferenceRepository,
      recipientLookup
    );
    this.services.set('notificationService', notificationService);

    // Services - Audit
    const auditService = new AuditService(auditRepository);
    this.services.set('auditService', auditService);
    const templateService = new TemplateService(notificationTemplateRepository);
    const preferenceService = new PreferenceService(
      notificationPreferenceRepository
    );

    this.services.set('templateService', templateService);
    this.services.set('preferenceService', preferenceService);

    // Command & Query Handlers - Audit
    const createAuditLogHandler = new CreateAuditLogHandler(auditService);
    const purgeAuditLogsHandler = new PurgeAuditLogsHandler(auditService);
    const getAuditLogHandler = new GetAuditLogHandler(auditService);
    const listAuditLogsHandler = new ListAuditLogsHandler(auditService);
    const getEntityAuditHistoryHandler = new GetEntityAuditHistoryHandler(
      auditService
    );
    const getAuditSummaryHandler = new GetAuditSummaryHandler(auditService);

    // Controllers
    const notificationController = new NotificationController(
      new ListNotificationsHandler(notificationService),
      new GetUnreadCountHandler(notificationService),
      new GetUnreadNotificationsHandler(notificationService),
      new NotificationMarkAsReadHandler(notificationService),
      new NotificationMarkAllAsReadHandler(notificationService)
    );
    const templateController = new TemplateController(
      new CreateTemplateHandler(templateService),
      new GetTemplateByIdHandler(templateService),
      new NotificationGetActiveTemplateHandler(templateService),
      new NotificationUpdateTemplateHandler(templateService),
      new ActivateTemplateHandler(templateService),
      new DeactivateTemplateHandler(templateService)
    );
    const preferenceController = new PreferenceController(
      new NotificationGetPreferencesHandler(preferenceService),
      new NotificationUpdatePreferencesHandler(preferenceService),
      new UpdateTypePreferenceHandler(preferenceService),
      new CheckChannelEnabledHandler(preferenceService)
    );
    const auditLogController = new AuditLogController(
      createAuditLogHandler,
      purgeAuditLogsHandler,
      getAuditLogHandler,
      listAuditLogsHandler,
      getEntityAuditHistoryHandler,
      getAuditSummaryHandler
    );

    this.services.set('notificationController', notificationController);
    this.services.set('auditLogController', auditLogController);
    this.services.set('templateController', templateController);
    this.services.set('preferenceController', preferenceController);

    // Event Handlers & Subscriptions
    const notificationEventHandler = new NotificationEventHandler(
      notificationService
    );

    // --- Event Subscriptions ---

    // 1. Notification Subscriptions
    eventBus.subscribe(
      'UserCreated',
      notificationEventHandler.handleUserCreated
    );

    // 2. Audit Subscriptions (Global listener)
    const auditListener = new AuditEventListener(createAuditLogHandler);

    // Subscribe to all known critical events
    // Ideally we'd valid wildcard support, but manual for now
    eventBus.subscribe('UserCreated', auditListener);
    eventBus.subscribe('expense.created', auditListener);
    eventBus.subscribe('expense.approved', auditListener);
    eventBus.subscribe('expense.rejected', auditListener);
    eventBus.subscribe('expense.submitted', auditListener);
    eventBus.subscribe('budget.threshold_exceeded', auditListener);
    eventBus.subscribe('budget.updated', auditListener);
    eventBus.subscribe('receipt.uploaded', auditListener);
    eventBus.subscribe('WorkspaceCreated', auditListener);
    eventBus.subscribe('MemberJoinedWorkspace', auditListener);
    eventBus.subscribe('MemberRoleChanged', auditListener);
    eventBus.subscribe(
      'expense.status_changed',
      notificationEventHandler.handleExpenseStatusChanged
    );
    eventBus.subscribe(
      'budget.threshold_exceeded',
      notificationEventHandler.handleBudgetExceeded
    );
    eventBus.subscribe(
      'approval.workflow_started',
      notificationEventHandler.handleApprovalStarted
    );
    eventBus.subscribe(
      'approval.workflow_completed',
      notificationEventHandler.handleWorkflowCompleted
    );
    eventBus.subscribe(
      'approval.workflow_rejected',
      notificationEventHandler.handleWorkflowRejected
    );
    eventBus.subscribe(
      'approval.workflow_cancelled',
      notificationEventHandler.handleWorkflowCancelled
    );

    // Audit subscriptions for approval workflow events
    eventBus.subscribe('approval-chain.deleted', auditListener);
    eventBus.subscribe('approval.workflow_started', auditListener);
    eventBus.subscribe('approval.workflow_completed', auditListener);
    eventBus.subscribe('approval.workflow_rejected', auditListener);
    eventBus.subscribe('approval.workflow_cancelled', auditListener);

    console.log('[Container] Notification Event Handlers registered');

    // ============================================
    // Cost Allocation Module
    // ============================================

    // Repositories
    const departmentRepository = new DepartmentRepositoryImpl(prisma, eventBus);
    const costCenterRepository = new CostCenterRepositoryImpl(prisma, eventBus);
    const projectRepository = new ProjectRepositoryImpl(prisma, eventBus);
    const expenseAllocationRepository = new ExpenseAllocationRepositoryImpl(
      prisma,
      eventBus
    );

    this.services.set('departmentRepository', departmentRepository);
    this.services.set('costCenterRepository', costCenterRepository);
    this.services.set('projectRepository', projectRepository);
    this.services.set(
      'expenseAllocationRepository',
      expenseAllocationRepository
    );

    // Services
    const workspaceAccessAdapter = new PrismaWorkspaceAccessAdapter(prisma);
    const allocationManagementService = new AllocationManagementService(
      departmentRepository,
      costCenterRepository,
      projectRepository,
      workspaceAccessAdapter
    );
    const expenseLookupAdapter = new PrismaExpenseLookupAdapter(prisma);
    const allocationSummaryAdapter = new PrismaAllocationSummaryAdapter(prisma);
    const expenseAllocationService = new ExpenseAllocationService(
      expenseAllocationRepository,
      expenseLookupAdapter,
      allocationSummaryAdapter
    );

    this.services.set(
      'allocationManagementService',
      allocationManagementService
    );
    this.services.set('expenseAllocationService', expenseAllocationService);

    // Command Handlers
    const createDepartmentHandler = new CreateDepartmentHandler(
      allocationManagementService
    );
    const updateDepartmentHandler = new UpdateDepartmentHandler(
      allocationManagementService
    );
    const deleteDepartmentHandler = new DeleteDepartmentHandler(
      allocationManagementService
    );
    const activateDepartmentHandler = new ActivateDepartmentHandler(
      allocationManagementService
    );
    const createCostCenterHandler = new CreateCostCenterHandler(
      allocationManagementService
    );
    const updateCostCenterHandler = new UpdateCostCenterHandler(
      allocationManagementService
    );
    const deleteCostCenterHandler = new DeleteCostCenterHandler(
      allocationManagementService
    );
    const activateCostCenterHandler = new ActivateCostCenterHandler(
      allocationManagementService
    );
    const createProjectHandler = new CreateProjectHandler(
      allocationManagementService
    );
    const updateProjectHandler = new UpdateProjectHandler(
      allocationManagementService
    );
    const deleteProjectHandler = new DeleteProjectHandler(
      allocationManagementService
    );
    const activateProjectHandler = new ActivateProjectHandler(
      allocationManagementService
    );
    const allocateExpenseHandler = new AllocateExpenseHandler(
      expenseAllocationService
    );
    const deleteAllocationsHandler = new DeleteAllocationsHandler(
      expenseAllocationService
    );

    // Query Handlers
    const getDepartmentHandler = new GetDepartmentHandler(
      allocationManagementService
    );
    const listDepartmentsHandler = new ListDepartmentsHandler(
      allocationManagementService
    );
    const getCostCenterHandler = new GetCostCenterHandler(
      allocationManagementService
    );
    const listCostCentersHandler = new ListCostCentersHandler(
      allocationManagementService
    );
    const getProjectHandler = new GetProjectHandler(
      allocationManagementService
    );
    const listProjectsHandler = new ListProjectsHandler(
      allocationManagementService
    );
    const getExpenseAllocationsHandler = new GetExpenseAllocationsHandler(
      expenseAllocationService
    );
    const getAllocationSummaryHandler = new GetAllocationSummaryHandler(
      expenseAllocationService
    );

    // Controllers
    const allocationManagementController = new AllocationManagementController(
      createDepartmentHandler,
      updateDepartmentHandler,
      deleteDepartmentHandler,
      activateDepartmentHandler,
      getDepartmentHandler,
      listDepartmentsHandler,
      createCostCenterHandler,
      updateCostCenterHandler,
      deleteCostCenterHandler,
      activateCostCenterHandler,
      getCostCenterHandler,
      listCostCentersHandler,
      createProjectHandler,
      updateProjectHandler,
      deleteProjectHandler,
      activateProjectHandler,
      getProjectHandler,
      listProjectsHandler
    );
    const expenseAllocationController = new ExpenseAllocationController(
      allocateExpenseHandler,
      deleteAllocationsHandler,
      getExpenseAllocationsHandler,
      getAllocationSummaryHandler
    );

    this.services.set(
      'allocationManagementController',
      allocationManagementController
    );
    this.services.set(
      'expenseAllocationController',
      expenseAllocationController
    );

    // ============================================
    // Budget Planning Module
    // ============================================

    // Repositories
    const budgetPlanRepository = new BudgetPlanRepositoryImpl(prisma, eventBus);
    const forecastRepository = new ForecastRepositoryImpl(prisma, eventBus);
    const scenarioRepository = new ScenarioRepositoryImpl(prisma, eventBus);
    const forecastItemRepository = new ForecastItemRepositoryImpl(
      prisma,
      eventBus
    );

    // Adapters
    const workspaceAccessPlanning = new PrismaWorkspaceAccessAdapter(prisma);

    this.services.set('budgetPlanRepository', budgetPlanRepository);
    this.services.set('forecastRepository', forecastRepository);
    this.services.set('scenarioRepository', scenarioRepository);
    this.services.set('forecastItemRepository', forecastItemRepository);

    // Services
    const budgetPlanService = new BudgetPlanService(
      budgetPlanRepository,
      workspaceAccessPlanning
    );
    const forecastService = new ForecastService(
      forecastRepository,
      forecastItemRepository,
      budgetPlanRepository,
      workspaceAccessPlanning
    );
    const scenarioService = new ScenarioService(
      scenarioRepository,
      budgetPlanRepository,
      workspaceAccessPlanning
    );

    this.services.set('budgetPlanService', budgetPlanService);
    this.services.set('forecastService', forecastService);
    this.services.set('scenarioService', scenarioService);

    // Command Handlers
    const createBudgetPlanHandler = new CreateBudgetPlanHandler(
      budgetPlanService
    );
    const updateBudgetPlanHandler = new UpdateBudgetPlanHandler(
      budgetPlanService
    );
    const activateBudgetPlanHandler = new ActivateBudgetPlanHandler(
      budgetPlanService
    );
    const deleteBudgetPlanHandler = new DeleteBudgetPlanHandler(
      budgetPlanService
    );
    const createForecastHandler = new CreateForecastHandler(forecastService);
    const addForecastItemHandler = new AddForecastItemHandler(forecastService);
    const deleteForecastHandler = new DeleteForecastHandler(forecastService);
    const deleteForecastItemHandler = new DeleteForecastItemHandler(
      forecastService
    );
    const createScenarioHandler = new CreateScenarioHandler(scenarioService);
    const deleteScenarioHandler = new DeleteScenarioHandler(scenarioService);

    // Query Handlers
    const getBudgetPlanHandler = new GetBudgetPlanHandler(budgetPlanService);
    const listBudgetPlansHandler = new ListBudgetPlansHandler(
      budgetPlanService
    );
    const getForecastHandler = new GetForecastHandler(forecastService);
    const listForecastsHandler = new ListForecastsHandler(forecastService);
    const getForecastItemsHandler = new GetForecastItemsHandler(
      forecastService
    );
    const getScenarioHandler = new GetScenarioHandler(scenarioService);
    const listScenariosHandler = new ListScenariosHandler(scenarioService);

    // Controllers
    const budgetPlanController = new BudgetPlanController(
      createBudgetPlanHandler,
      updateBudgetPlanHandler,
      activateBudgetPlanHandler,
      deleteBudgetPlanHandler,
      getBudgetPlanHandler,
      listBudgetPlansHandler
    );

    const forecastController = new ForecastController(
      createForecastHandler,
      addForecastItemHandler,
      deleteForecastHandler,
      deleteForecastItemHandler,
      getForecastHandler,
      listForecastsHandler,
      getForecastItemsHandler
    );

    const scenarioController = new ScenarioController(
      createScenarioHandler,
      deleteScenarioHandler,
      getScenarioHandler,
      listScenariosHandler
    );

    this.services.set('budgetPlanController', budgetPlanController);
    this.services.set('forecastController', forecastController);
    this.services.set('scenarioController', scenarioController);

    // ============================================
    // Categorization Rules Module
    // ============================================

    // Repositories
    const categoryRuleRepository = new PrismaCategoryRuleRepository(
      prisma,
      eventBus
    );
    const ruleExecutionRepository = new PrismaRuleExecutionRepository(
      prisma,
      eventBus
    );
    const categorySuggestionRepository = new PrismaCategorySuggestionRepository(
      prisma,
      eventBus
    );

    this.services.set('categoryRuleRepository', categoryRuleRepository);
    this.services.set('ruleExecutionRepository', ruleExecutionRepository);
    this.services.set(
      'categorySuggestionRepository',
      categorySuggestionRepository
    );

    // Services
    const categoryRuleService = new CategoryRuleService(
      categoryRuleRepository,
      workspaceAccessPlanning
    );
    const ruleExecutionService = new RuleExecutionService(
      categoryRuleRepository,
      ruleExecutionRepository
    );
    const categorySuggestionService = new CategorySuggestionService(
      categorySuggestionRepository
    );

    this.services.set('categoryRuleService', categoryRuleService);
    this.services.set('ruleExecutionService', ruleExecutionService);
    this.services.set('categorySuggestionService', categorySuggestionService);

    // Command Handlers
    const createCategoryRuleHandler = new CreateCategoryRuleHandler(
      categoryRuleService
    );
    const updateCategoryRuleHandler = new UpdateCategoryRuleHandler(
      categoryRuleService
    );
    const deleteCategoryRuleHandler = new DeleteCategoryRuleHandler(
      categoryRuleService
    );
    const activateCategoryRuleHandler = new ActivateCategoryRuleHandler(
      categoryRuleService
    );
    const deactivateCategoryRuleHandler = new DeactivateCategoryRuleHandler(
      categoryRuleService
    );
    const evaluateRulesHandler = new EvaluateRulesHandler(ruleExecutionService);
    const createSuggestionHandler = new CreateSuggestionHandler(
      categorySuggestionService
    );
    const acceptSuggestionHandler = new AcceptSuggestionHandler(
      categorySuggestionService
    );
    const rejectSuggestionHandler = new RejectSuggestionHandler(
      categorySuggestionService
    );
    const deleteSuggestionHandler = new DeleteSuggestionHandler(
      categorySuggestionService
    );

    // Query Handlers
    const getRuleByIdHandler = new GetRuleByIdHandler(categoryRuleService);
    const getRulesByWorkspaceHandler = new GetRulesByWorkspaceHandler(
      categoryRuleService
    );
    const getActiveRulesByWorkspaceHandler =
      new GetActiveRulesByWorkspaceHandler(categoryRuleService);
    const getExecutionsByRuleHandler = new GetExecutionsByRuleHandler(
      ruleExecutionService
    );
    const getExecutionsByExpenseHandler = new GetExecutionsByExpenseHandler(
      ruleExecutionService
    );
    const getExecutionsByWorkspaceHandler = new GetExecutionsByWorkspaceHandler(
      ruleExecutionService
    );
    const getSuggestionByIdHandler = new GetSuggestionByIdHandler(
      categorySuggestionService
    );
    const getSuggestionsByExpenseHandler = new GetSuggestionsByExpenseHandler(
      categorySuggestionService
    );
    const getPendingSuggestionsByWorkspaceHandler =
      new GetPendingSuggestionsByWorkspaceHandler(categorySuggestionService);
    const getSuggestionsByWorkspaceHandler =
      new GetSuggestionsByWorkspaceHandler(categorySuggestionService);

    // Controllers
    const categoryRuleController = new CategoryRuleController(
      createCategoryRuleHandler,
      updateCategoryRuleHandler,
      deleteCategoryRuleHandler,
      activateCategoryRuleHandler,
      deactivateCategoryRuleHandler,
      getRuleByIdHandler,
      getRulesByWorkspaceHandler,
      getActiveRulesByWorkspaceHandler,
      getExecutionsByRuleHandler
    );
    const ruleExecutionController = new RuleExecutionController(
      evaluateRulesHandler,
      getExecutionsByExpenseHandler,
      getExecutionsByWorkspaceHandler
    );
    const categorySuggestionController = new CategorySuggestionController(
      createSuggestionHandler,
      acceptSuggestionHandler,
      rejectSuggestionHandler,
      deleteSuggestionHandler,
      getSuggestionByIdHandler,
      getSuggestionsByExpenseHandler,
      getPendingSuggestionsByWorkspaceHandler,
      getSuggestionsByWorkspaceHandler
    );

    this.services.set('categoryRuleController', categoryRuleController);
    this.services.set('ruleExecutionController', ruleExecutionController);
    this.services.set(
      'categorySuggestionController',
      categorySuggestionController
    );

    // ============================================
    // Policy Controls Module
    // ============================================

    // Repositories
    const policyRepository = new PrismaPolicyRepository(prisma, eventBus);
    const violationRepository = new PrismaViolationRepository(prisma, eventBus);
    const exemptionRepository = new PrismaExemptionRepository(prisma, eventBus);

    this.services.set('policyRepository', policyRepository);
    this.services.set('violationRepository', violationRepository);
    this.services.set('exemptionRepository', exemptionRepository);

    // Services
    const policyEvaluationService = new PolicyEvaluationService(
      policyRepository,
      violationRepository,
      exemptionRepository,
      cacheService
    );

    this.services.set('policyEvaluationService', policyEvaluationService);

    // Controllers
    const policyController = new PolicyController(
      new CreatePolicyHandler(policyRepository),
      new UpdatePolicyHandler(policyRepository),
      new ActivatePolicyHandler(policyRepository),
      new DeactivatePolicyHandler(policyRepository),
      new DeletePolicyHandler(policyRepository),
      new GetPolicyHandler(policyRepository),
      new ListPoliciesHandler(policyRepository)
    );
    const violationController = new ViolationController(
      new GetViolationHandler(violationRepository),
      new ListViolationsHandler(violationRepository),
      new GetViolationStatsHandler(violationRepository),
      new AcknowledgeViolationHandler(violationRepository),
      new ResolveViolationHandler(violationRepository),
      new ExemptViolationHandler(violationRepository),
      new OverrideViolationHandler(violationRepository)
    );
    const exemptionController = new ExemptionController(
      new RequestExemptionHandler(exemptionRepository, policyRepository),
      new ApproveExemptionHandler(exemptionRepository),
      new RejectExemptionHandler(exemptionRepository),
      new GetExemptionHandler(exemptionRepository),
      new ListExemptionsHandler(exemptionRepository),
      new CheckActiveExemptionHandler(exemptionRepository)
    );

    this.services.set('policyController', policyController);
    this.services.set('violationController', violationController);
    this.services.set('exemptionController', exemptionController);

    // ============================================
    // Bank Feed Sync Module
    // ============================================

    // Repositories
    const bankConnectionRepository = new PrismaBankConnectionRepository(
      prisma,
      eventBus
    );
    const syncSessionRepository = new PrismaSyncSessionRepository(
      prisma,
      eventBus
    );
    const bankTransactionRepository = new PrismaBankTransactionRepository(
      prisma,
      eventBus
    );

    this.services.set('bankConnectionRepository', bankConnectionRepository);
    this.services.set('syncSessionRepository', syncSessionRepository);
    this.services.set('bankTransactionRepository', bankTransactionRepository);

    // Stub Bank API Client (to be implemented with real bank API integration)
    const stubBankAPIClient = {
      async fetchTransactions(
        accessToken: string,
        fromDate: Date,
        toDate: Date
      ) {
        // Stub implementation - will be replaced with real bank API integration
        return [];
      },
    };

    // Services
    const transactionSyncService = new TransactionSyncService(
      bankConnectionRepository,
      syncSessionRepository,
      bankTransactionRepository,
      stubBankAPIClient
    );

    this.services.set('transactionSyncService', transactionSyncService);

    // Command Handlers
    const connectBankHandler = new ConnectBankHandler(bankConnectionRepository);
    const disconnectBankHandler = new DisconnectBankHandler(
      bankConnectionRepository
    );
    const updateConnectionTokenHandler = new UpdateConnectionTokenHandler(
      bankConnectionRepository
    );
    const deleteConnectionHandler = new DeleteConnectionHandler(
      bankConnectionRepository
    );
    const syncTransactionsHandler = new SyncTransactionsHandler(
      transactionSyncService
    );
    const processTransactionHandler = new ProcessTransactionHandler(
      bankTransactionRepository
    );

    // Query Handlers
    const getBankConnectionsHandler = new GetBankConnectionsHandler(
      bankConnectionRepository
    );
    const getBankConnectionHandler = new GetBankConnectionHandler(
      bankConnectionRepository
    );
    const getSyncHistoryHandler = new GetSyncHistoryHandler(
      syncSessionRepository
    );
    const getSyncSessionHandler = new GetSyncSessionHandler(
      syncSessionRepository
    );
    const getActiveSyncsHandler = new GetActiveSyncsHandler(
      syncSessionRepository
    );
    const getPendingTransactionsHandler = new GetPendingTransactionsHandler(
      bankTransactionRepository
    );
    const getBankTransactionHandler = new GetBankTransactionHandler(
      bankTransactionRepository
    );
    const getTransactionsByConnectionHandler =
      new GetTransactionsByConnectionHandler(bankTransactionRepository);

    // Controllers
    const bankConnectionController = new BankConnectionController(
      connectBankHandler,
      disconnectBankHandler,
      updateConnectionTokenHandler,
      deleteConnectionHandler,
      getBankConnectionsHandler,
      getBankConnectionHandler
    );
    const transactionSyncController = new TransactionSyncController(
      syncTransactionsHandler,
      getSyncHistoryHandler,
      getSyncSessionHandler,
      getActiveSyncsHandler
    );
    const bankTransactionController = new BankTransactionController(
      processTransactionHandler,
      getPendingTransactionsHandler,
      getBankTransactionHandler,
      getTransactionsByConnectionHandler
    );

    this.services.set('bankConnectionController', bankConnectionController);
    this.services.set('transactionSyncController', transactionSyncController);
    this.services.set('bankTransactionController', bankTransactionController);

    // ============================================
    // Event Outbox Module
    // ============================================

    // Repositories
    const outboxEventRepository: IOutboxEventRepository =
      new OutboxEventRepositoryImpl(prisma);
    this.services.set('outboxEventRepository', outboxEventRepository);

    // Services
    const outboxEventService = new OutboxEventService(
      outboxEventRepository,
      eventBus
    );
    this.services.set('outboxEventService', outboxEventService);

    // Command Handlers
    const storeOutboxEventHandler = new StoreOutboxEventHandler(
      outboxEventRepository
    );
    const processOutboxEventHandler = new ProcessOutboxEventHandler(
      outboxEventRepository,
      outboxEventService
    );
    const retryOutboxEventHandler = new RetryOutboxEventHandler(
      outboxEventService
    );
    const retryAllFailedEventsHandler = new RetryAllFailedEventsHandler(
      outboxEventService
    );
    const cleanupProcessedEventsHandler = new CleanupProcessedEventsHandler(
      outboxEventService
    );

    // Query Handlers
    const getPendingEventsHandler = new GetPendingEventsHandler(
      outboxEventRepository
    );
    const getFailedEventsHandler = new GetFailedEventsHandler(
      outboxEventRepository
    );
    const getDeadLetterCountHandler = new GetDeadLetterCountHandler(
      outboxEventService
    );

    // Controllers
    const outboxEventController = new OutboxEventController(
      storeOutboxEventHandler,
      processOutboxEventHandler,
      retryOutboxEventHandler,
      retryAllFailedEventsHandler,
      cleanupProcessedEventsHandler,
      getPendingEventsHandler,
      getFailedEventsHandler,
      getDeadLetterCountHandler
    );
    this.services.set('outboxEventController', outboxEventController);

    // Store Prisma for module route registration
    this.services.set('prisma', prisma);
  }

  /**
   * Get service by name
   */
  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }

  /**
   * Check if service exists
   */
  has(serviceName: string): boolean {
    return this.services.has(serviceName);
  }

  /**
   * Get all identity-workspace services for route registration
   */
  getIdentityWorkspaceServices() {
    return {
      authController: this.get<AuthController>('authController'),
      workspaceController: this.get<WorkspaceController>('workspaceController'),
      invitationController: this.get<InvitationController>(
        'invitationController'
      ),
      memberController: this.get<MemberController>('memberController'),
    };
  }

  /**
   * Get all expense-ledger services for route registration
   */
  getExpenseLedgerServices() {
    return {
      expenseController: this.get<ExpenseController>('expenseController'),
      categoryController: this.get<CategoryController>('categoryController'),
      tagController: this.get<TagController>('tagController'),
      attachmentController: this.get<AttachmentController>(
        'attachmentController'
      ),
      recurringExpenseController: this.get<RecurringExpenseController>(
        'recurringExpenseController'
      ),
      expenseSplitController: this.get<ExpenseSplitController>(
        'expenseSplitController'
      ),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  /**
   * Get all budget-management services for route registration
   */
  getBudgetManagementServices() {
    return {
      budgetController: this.get<BudgetController>('budgetController'),
      spendingLimitController: this.get<SpendingLimitController>(
        'spendingLimitController'
      ),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  /**
   * Get all receipt-vault services for route registration
   */
  getReceiptVaultServices() {
    return {
      receiptController: this.get<ReceiptController>('receiptController'),
      tagController: this.get<ReceiptTagController>('receiptTagController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  /**
   * Get all approval-workflow services for route registration
   */
  getApprovalWorkflowServices() {
    return {
      approvalChainController: this.get<ApprovalChainController>(
        'approvalChainController'
      ),
      workflowController: this.get<WorkflowController>('workflowController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  /**
   * Get all notification-dispatch services for route registration
   */
  getNotificationDispatchServices() {
    return {
      notificationController: this.get<NotificationController>(
        'notificationController'
      ),
      templateController: this.get<TemplateController>('templateController'),
      preferenceController: this.get<PreferenceController>(
        'preferenceController'
      ),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  /**
   * Get all cost-allocation services for route registration
   */
  getCostAllocationServices() {
    return {
      allocationManagementController: this.get<AllocationManagementController>(
        'allocationManagementController'
      ),
      expenseAllocationController: this.get<ExpenseAllocationController>(
        'expenseAllocationController'
      ),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  /**
   * Get all categorization-rules services for route registration
   */
  getCategorizationRulesServices() {
    return {
      categoryRuleController: this.get<CategoryRuleController>(
        'categoryRuleController'
      ),
      ruleExecutionController: this.get<RuleExecutionController>(
        'ruleExecutionController'
      ),
      categorySuggestionController: this.get<CategorySuggestionController>(
        'categorySuggestionController'
      ),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  /**
   * Get all budget-planning services for route registration
   */
  getBudgetPlanningServices() {
    return {
      budgetPlanController: this.get<BudgetPlanController>(
        'budgetPlanController'
      ),
      forecastController: this.get<ForecastController>('forecastController'),
      scenarioController: this.get<ScenarioController>('scenarioController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }
  /**
   * Get all audit-compliance services for route registration
   */
  getAuditComplianceServices() {
    return {
      auditLogController: this.get<AuditLogController>('auditLogController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  /**
   * Get all policy-controls services for route registration
   */
  getPolicyControlsServices() {
    return {
      policyController: this.get<PolicyController>('policyController'),
      violationController: this.get<ViolationController>('violationController'),
      exemptionController: this.get<ExemptionController>('exemptionController'),
      policyEvaluationService: this.get<PolicyEvaluationService>(
        'policyEvaluationService'
      ),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  /**
   * Get all bank-feed-sync services for route registration
   */
  getBankFeedSyncServices() {
    return {
      bankConnectionController: this.get<BankConnectionController>(
        'bankConnectionController'
      ),
      transactionSyncController: this.get<TransactionSyncController>(
        'transactionSyncController'
      ),
      bankTransactionController: this.get<BankTransactionController>(
        'bankTransactionController'
      ),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  /**
   * Get all event-outbox services for route registration
   */
  getEventOutboxServices() {
    return {
      outboxEventController: this.get<OutboxEventController>(
        'outboxEventController'
      ),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }
}

export const container = Container.getInstance();
