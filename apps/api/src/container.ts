import { PrismaClient } from "@prisma/client";

// Identity-Workspace Module
import { UserRepositoryImpl } from "../../../modules/identity-workspace/infrastructure/persistence/user.repository.impl";
import { WorkspaceRepositoryImpl } from "../../../modules/identity-workspace/infrastructure/persistence/workspace.repository.impl";
import { WorkspaceMembershipRepositoryImpl } from "../../../modules/identity-workspace/infrastructure/persistence/workspace-membership.repository.impl";
import { WorkspaceInvitationRepositoryImpl } from "../../../modules/identity-workspace/infrastructure/persistence/workspace-invitation.repository.impl";
import { UserManagementService } from "../../../modules/identity-workspace/application/services/user-management.service";
import { WorkspaceManagementService } from "../../../modules/identity-workspace/application/services/workspace-management.service";
import { WorkspaceMembershipService } from "../../../modules/identity-workspace/application/services/workspace-membership.service";
import { WorkspaceInvitationService } from "../../../modules/identity-workspace/application/services/workspace-invitation.service";

// Expense-Ledger Module - Repositories
import { ExpenseRepositoryImpl } from "../../../modules/expense-ledger/infrastructure/persistence/expense.repository.impl";
import { CategoryRepositoryImpl } from "../../../modules/expense-ledger/infrastructure/persistence/category.repository.impl";
import { TagRepositoryImpl } from "../../../modules/expense-ledger/infrastructure/persistence/tag.repository.impl";
import { AttachmentRepositoryImpl } from "../../../modules/expense-ledger/infrastructure/persistence/attachment.repository.impl";

// Expense-Ledger Module - Services
import { ExpenseService } from "../../../modules/expense-ledger/application/services/expense.service";
import { CategoryService } from "../../../modules/expense-ledger/application/services/category.service";
import { TagService } from "../../../modules/expense-ledger/application/services/tag.service";
import { AttachmentService } from "../../../modules/expense-ledger/application/services/attachment.service";

// Expense-Ledger Module - Command Handlers
import { CreateExpenseHandler } from "../../../modules/expense-ledger/application/commands/create-expense.command";
import { UpdateExpenseHandler } from "../../../modules/expense-ledger/application/commands/update-expense.command";
import { DeleteExpenseHandler } from "../../../modules/expense-ledger/application/commands/delete-expense.command";
import { SubmitExpenseHandler } from "../../../modules/expense-ledger/application/commands/submit-expense.command";
import { ApproveExpenseHandler } from "../../../modules/expense-ledger/application/commands/approve-expense.command";
import { RejectExpenseHandler } from "../../../modules/expense-ledger/application/commands/reject-expense.command";
import { ReimburseExpenseHandler } from "../../../modules/expense-ledger/application/commands/reimburse-expense.command";
import { CreateCategoryHandler } from "../../../modules/expense-ledger/application/commands/create-category.command";
import { UpdateCategoryHandler } from "../../../modules/expense-ledger/application/commands/update-category.command";
import { DeleteCategoryHandler } from "../../../modules/expense-ledger/application/commands/delete-category.command";
import { CreateTagHandler } from "../../../modules/expense-ledger/application/commands/create-tag.command";
import { UpdateTagHandler } from "../../../modules/expense-ledger/application/commands/update-tag.command";
import { DeleteTagHandler } from "../../../modules/expense-ledger/application/commands/delete-tag.command";
import { CreateAttachmentHandler } from "../../../modules/expense-ledger/application/commands/create-attachment.command";
import { DeleteAttachmentHandler } from "../../../modules/expense-ledger/application/commands/delete-attachment.command";

// Expense-Ledger Module - Query Handlers
import { GetExpenseHandler } from "../../../modules/expense-ledger/application/queries/get-expense.query";
import { ListExpensesHandler } from "../../../modules/expense-ledger/application/queries/list-expenses.query";
import { FilterExpensesHandler } from "../../../modules/expense-ledger/application/queries/filter-expenses.query";
import { GetExpenseStatisticsHandler } from "../../../modules/expense-ledger/application/queries/get-expense-statistics.query";
import { GetCategoryHandler } from "../../../modules/expense-ledger/application/queries/get-category.query";
import { ListCategoriesHandler } from "../../../modules/expense-ledger/application/queries/list-categories.query";
import { GetTagHandler } from "../../../modules/expense-ledger/application/queries/get-tag.query";
import { ListTagsHandler } from "../../../modules/expense-ledger/application/queries/list-tags.query";
import { GetAttachmentHandler } from "../../../modules/expense-ledger/application/queries/get-attachment.query";
import { ListAttachmentsHandler } from "../../../modules/expense-ledger/application/queries/list-attachments.query";

// Expense-Ledger Module - Controllers
import { ExpenseController } from "../../../modules/expense-ledger/infrastructure/http/controllers/expense.controller";
import { CategoryController } from "../../../modules/expense-ledger/infrastructure/http/controllers/category.controller";
import { TagController } from "../../../modules/expense-ledger/infrastructure/http/controllers/tag.controller";
import { AttachmentController } from "../../../modules/expense-ledger/infrastructure/http/controllers/attachment.controller";

// Recurring Expense
import { PrismaRecurringExpenseRepository } from "../../../modules/expense-ledger/infrastructure/persistence/recurring-expense.repository.impl";
import { RecurringExpenseService } from "../../../modules/expense-ledger/application/services/recurring-expense.service";
import { RecurringExpenseController } from "../../../modules/expense-ledger/infrastructure/http/controllers/recurring-expense.controller";

// Budget Management Module - Repositories
import { BudgetRepositoryImpl } from "../../../modules/budget-management/infrastructure/persistence/budget.repository.impl";
import { BudgetAllocationRepositoryImpl } from "../../../modules/budget-management/infrastructure/persistence/budget-allocation.repository.impl";
import { BudgetAlertRepositoryImpl } from "../../../modules/budget-management/infrastructure/persistence/budget-alert.repository.impl";
import { SpendingLimitRepositoryImpl } from "../../../modules/budget-management/infrastructure/persistence/spending-limit.repository.impl";

// Budget Management Module - Services
import { BudgetService } from "../../../modules/budget-management/application/services/budget.service";
import { SpendingLimitService } from "../../../modules/budget-management/application/services/spending-limit.service";

// Budget Management Module - Command Handlers
import { CreateBudgetHandler } from "../../../modules/budget-management/application/commands/create-budget.command";
import { UpdateBudgetHandler } from "../../../modules/budget-management/application/commands/update-budget.command";
import { DeleteBudgetHandler } from "../../../modules/budget-management/application/commands/delete-budget.command";
import { ActivateBudgetHandler } from "../../../modules/budget-management/application/commands/activate-budget.command";
import { ArchiveBudgetHandler } from "../../../modules/budget-management/application/commands/archive-budget.command";
import { AddAllocationHandler } from "../../../modules/budget-management/application/commands/add-allocation.command";
import { UpdateAllocationHandler } from "../../../modules/budget-management/application/commands/update-allocation.command";
import { DeleteAllocationHandler } from "../../../modules/budget-management/application/commands/delete-allocation.command";
import { CreateSpendingLimitHandler } from "../../../modules/budget-management/application/commands/create-spending-limit.command";
import { UpdateSpendingLimitHandler } from "../../../modules/budget-management/application/commands/update-spending-limit.command";
import { DeleteSpendingLimitHandler } from "../../../modules/budget-management/application/commands/delete-spending-limit.command";

// Budget Management Module - Query Handlers
import { GetBudgetHandler } from "../../../modules/budget-management/application/queries/get-budget.query";
import { ListBudgetsHandler } from "../../../modules/budget-management/application/queries/list-budgets.query";
import { GetAllocationsHandler } from "../../../modules/budget-management/application/queries/get-allocations.query";
import { GetUnreadAlertsHandler } from "../../../modules/budget-management/application/queries/get-unread-alerts.query";
import { ListSpendingLimitsHandler } from "../../../modules/budget-management/application/queries/list-spending-limits.query";

// Budget Management Module - Controllers
import { BudgetController } from "../../../modules/budget-management/infrastructure/http/controllers/budget.controller";
import { SpendingLimitController } from "../../../modules/budget-management/infrastructure/http/controllers/spending-limit.controller";

// Receipt Vault Module - Repositories
import { ReceiptRepositoryImpl } from "../../../modules/receipt-vault/infrastructure/persistence/receipt.repository.impl";
import { ReceiptMetadataRepositoryImpl } from "../../../modules/receipt-vault/infrastructure/persistence/receipt-metadata.repository.impl";
import { ReceiptTagDefinitionRepositoryImpl } from "../../../modules/receipt-vault/infrastructure/persistence/receipt-tag-definition.repository.impl";
import { ReceiptTagRepositoryImpl } from "../../../modules/receipt-vault/infrastructure/persistence/receipt-tag.repository.impl";

// Receipt Vault Module - Services
import { ReceiptService } from "../../../modules/receipt-vault/application/services/receipt.service";
import { TagService as ReceiptTagService } from "../../../modules/receipt-vault/application/services/tag.service";

// Receipt Vault Module - Command Handlers
import { UploadReceiptHandler } from "../../../modules/receipt-vault/application/commands/upload-receipt.command";
import { LinkReceiptToExpenseHandler } from "../../../modules/receipt-vault/application/commands/link-receipt-to-expense.command";
import { UnlinkReceiptFromExpenseHandler } from "../../../modules/receipt-vault/application/commands/unlink-receipt-from-expense.command";
import { ProcessReceiptHandler } from "../../../modules/receipt-vault/application/commands/process-receipt.command";
import { VerifyReceiptHandler } from "../../../modules/receipt-vault/application/commands/verify-receipt.command";
import { RejectReceiptHandler } from "../../../modules/receipt-vault/application/commands/reject-receipt.command";
import { DeleteReceiptHandler } from "../../../modules/receipt-vault/application/commands/delete-receipt.command";
import { AddReceiptMetadataHandler } from "../../../modules/receipt-vault/application/commands/add-receipt-metadata.command";
import { UpdateReceiptMetadataHandler } from "../../../modules/receipt-vault/application/commands/update-receipt-metadata.command";
import { AddReceiptTagHandler } from "../../../modules/receipt-vault/application/commands/add-receipt-tag.command";
import { RemoveReceiptTagHandler } from "../../../modules/receipt-vault/application/commands/remove-receipt-tag.command";
import { CreateTagHandler as CreateReceiptTagHandler } from "../../../modules/receipt-vault/application/commands/create-tag.command";
import { UpdateTagHandler as UpdateReceiptTagHandler } from "../../../modules/receipt-vault/application/commands/update-tag.command";
import { DeleteTagHandler as DeleteReceiptTagHandler } from "../../../modules/receipt-vault/application/commands/delete-tag.command";

// Receipt Vault Module - Query Handlers
import { GetReceiptHandler } from "../../../modules/receipt-vault/application/queries/get-receipt.query";
import { ListReceiptsHandler } from "../../../modules/receipt-vault/application/queries/list-receipts.query";
import { GetReceiptsByExpenseHandler } from "../../../modules/receipt-vault/application/queries/get-receipts-by-expense.query";
import { GetReceiptMetadataHandler } from "../../../modules/receipt-vault/application/queries/get-receipt-metadata.query";
import { GetReceiptStatsHandler } from "../../../modules/receipt-vault/application/queries/get-receipt-stats.query";
import { ListTagsHandler as ListReceiptTagsHandler } from "../../../modules/receipt-vault/application/queries/list-tags.query";

// Receipt Vault Module - Controllers
import { ReceiptController } from "../../../modules/receipt-vault/infrastructure/http/controllers/receipt.controller";
import { TagController as ReceiptTagController } from "../../../modules/receipt-vault/infrastructure/http/controllers/tag.controller";

// Approval Workflow Module - Repositories
import { PrismaApprovalChainRepository } from "../../../modules/approval-workflow/infrastructure/persistence/approval-chain.repository.impl";
import { PrismaExpenseWorkflowRepository } from "../../../modules/approval-workflow/infrastructure/persistence/expense-workflow.repository.impl";

// Approval Workflow Module - Services
import { ApprovalChainService } from "../../../modules/approval-workflow/application/services/approval-chain.service";
import { WorkflowService } from "../../../modules/approval-workflow/application/services/workflow.service";

// Approval Workflow Module - Controllers
import { ApprovalChainController } from "../../../modules/approval-workflow/infrastructure/http/controllers/approval-chain.controller";
import { WorkflowController } from "../../../modules/approval-workflow/infrastructure/http/controllers/workflow.controller";

// Notification Dispatch Module - Repositories
import { NotificationRepositoryImpl } from "../../../modules/notification-dispatch/infrastructure/persistence/notification.repository.impl";
import { NotificationTemplateRepositoryImpl } from "../../../modules/notification-dispatch/infrastructure/persistence/notification-template.repository.impl";
import { NotificationPreferenceRepositoryImpl } from "../../../modules/notification-dispatch/infrastructure/persistence/notification-preference.repository.impl";

// Notification Dispatch Module - Services
import { NotificationService } from "../../../modules/notification-dispatch/application/services/notification.service";
import { TemplateService } from "../../../modules/notification-dispatch/application/services/template.service";
import { PreferenceService } from "../../../modules/notification-dispatch/application/services/preference.service";

// Notification Dispatch Module - Controllers
import { NotificationController } from "../../../modules/notification-dispatch/infrastructure/http/controllers/notification.controller";
import { TemplateController } from "../../../modules/notification-dispatch/infrastructure/http/controllers/template.controller";
import { PreferenceController } from "../../../modules/notification-dispatch/infrastructure/http/controllers/preference.controller";

// Cost Allocation Module - Repositories
import { DepartmentRepositoryImpl } from "../../../modules/cost-allocation/infrastructure/persistence/department.repository.impl";
import { CostCenterRepositoryImpl } from "../../../modules/cost-allocation/infrastructure/persistence/cost-center.repository.impl";
import { ProjectRepositoryImpl } from "../../../modules/cost-allocation/infrastructure/persistence/project.repository.impl";
import { ExpenseAllocationRepositoryImpl } from "../../../modules/cost-allocation/infrastructure/persistence/expense-allocation.repository.impl";

// Cost Allocation Module - Services
import { AllocationManagementService } from "../../../modules/cost-allocation/application/services/allocation-management.service";
import { ExpenseAllocationService } from "../../../modules/cost-allocation/application/services/expense-allocation.service";

// Cost Allocation Module - Command Handlers
import { CreateDepartmentHandler } from "../../../modules/cost-allocation/application/commands/create-department.command";
import { UpdateDepartmentHandler } from "../../../modules/cost-allocation/application/commands/update-department.command";
import { DeleteDepartmentHandler } from "../../../modules/cost-allocation/application/commands/delete-department.command";
import { ActivateDepartmentHandler } from "../../../modules/cost-allocation/application/commands/activate-department.command";
import { CreateCostCenterHandler } from "../../../modules/cost-allocation/application/commands/create-cost-center.command";
import { UpdateCostCenterHandler } from "../../../modules/cost-allocation/application/commands/update-cost-center.command";
import { DeleteCostCenterHandler } from "../../../modules/cost-allocation/application/commands/delete-cost-center.command";
import { ActivateCostCenterHandler } from "../../../modules/cost-allocation/application/commands/activate-cost-center.command";
import { CreateProjectHandler } from "../../../modules/cost-allocation/application/commands/create-project.command";
import { UpdateProjectHandler } from "../../../modules/cost-allocation/application/commands/update-project.command";
import { DeleteProjectHandler } from "../../../modules/cost-allocation/application/commands/delete-project.command";
import { ActivateProjectHandler } from "../../../modules/cost-allocation/application/commands/activate-project.command";
import { AllocateExpenseHandler } from "../../../modules/cost-allocation/application/commands/allocate-expense.command";
import { DeleteAllocationsHandler } from "../../../modules/cost-allocation/application/commands/delete-allocations.command";

// Cost Allocation Module - Query Handlers
import { GetDepartmentHandler } from "../../../modules/cost-allocation/application/queries/get-department.query";
import { ListDepartmentsHandler } from "../../../modules/cost-allocation/application/queries/list-departments.query";
import { GetCostCenterHandler } from "../../../modules/cost-allocation/application/queries/get-cost-center.query";
import { ListCostCentersHandler } from "../../../modules/cost-allocation/application/queries/list-cost-centers.query";
import { GetProjectHandler } from "../../../modules/cost-allocation/application/queries/get-project.query";
import { ListProjectsHandler } from "../../../modules/cost-allocation/application/queries/list-projects.query";
import { GetExpenseAllocationsHandler } from "../../../modules/cost-allocation/application/queries/get-expense-allocations.query";
import { GetAllocationSummaryHandler } from "../../../modules/cost-allocation/application/queries/get-allocation-summary.query";

// Cost Allocation Module - Controllers
import { AllocationManagementController } from "../../../modules/cost-allocation/infrastructure/http/controllers/allocation-management.controller";
import { ExpenseAllocationController } from "../../../modules/cost-allocation/infrastructure/http/controllers/expense-allocation.controller";

/**
 * Dependency Injection Container
 * Following e-commerce pattern for service registration
 */
export class Container {
  private static instance: Container;
  private services: Map<string, any> = new Map();

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
    // ============================================
    // Identity-Workspace Module
    // ============================================

    // Repositories
    const userRepository = new UserRepositoryImpl(prisma);
    const workspaceRepository = new WorkspaceRepositoryImpl(prisma);
    const workspaceMembershipRepository = new WorkspaceMembershipRepositoryImpl(
      prisma,
    );
    const workspaceInvitationRepository = new WorkspaceInvitationRepositoryImpl(
      prisma,
    );

    this.services.set("userRepository", userRepository);
    this.services.set("workspaceRepository", workspaceRepository);
    this.services.set(
      "workspaceMembershipRepository",
      workspaceMembershipRepository,
    );
    this.services.set(
      "workspaceInvitationRepository",
      workspaceInvitationRepository,
    );

    // Services
    const userManagementService = new UserManagementService(userRepository);
    const workspaceManagementService = new WorkspaceManagementService(
      workspaceRepository,
      workspaceMembershipRepository,
    );
    const workspaceMembershipService = new WorkspaceMembershipService(
      workspaceMembershipRepository,
    );
    const workspaceInvitationService = new WorkspaceInvitationService(
      workspaceInvitationRepository,
      workspaceMembershipRepository,
      userRepository,
    );

    this.services.set("userManagementService", userManagementService);
    this.services.set("workspaceManagementService", workspaceManagementService);
    this.services.set("workspaceMembershipService", workspaceMembershipService);
    this.services.set("workspaceInvitationService", workspaceInvitationService);

    // ============================================
    // Expense-Ledger Module
    // ============================================

    // Repositories
    const expenseRepository = new ExpenseRepositoryImpl(prisma);
    const categoryRepository = new CategoryRepositoryImpl(prisma);
    const tagRepository = new TagRepositoryImpl(prisma);
    const attachmentRepository = new AttachmentRepositoryImpl(prisma);
    const recurringExpenseRepository = new PrismaRecurringExpenseRepository(
      prisma,
    );

    this.services.set("expenseRepository", expenseRepository);
    this.services.set("categoryRepository", categoryRepository);
    this.services.set("tagRepository", tagRepository);
    this.services.set("attachmentRepository", attachmentRepository);
    this.services.set("recurringExpenseRepository", recurringExpenseRepository);

    // Services
    const expenseService = new ExpenseService(
      expenseRepository,
      categoryRepository,
      tagRepository,
    );
    const categoryService = new CategoryService(categoryRepository);
    const tagService = new TagService(tagRepository);
    const attachmentService = new AttachmentService(
      attachmentRepository,
      expenseRepository,
    );
    const recurringExpenseService = new RecurringExpenseService(
      recurringExpenseRepository,
      expenseService,
    );

    this.services.set("expenseService", expenseService);
    this.services.set("categoryService", categoryService);
    this.services.set("tagService", tagService);
    this.services.set("attachmentService", attachmentService);
    this.services.set("recurringExpenseService", recurringExpenseService);

    // Command Handlers
    const createExpenseHandler = new CreateExpenseHandler(expenseService);
    const updateExpenseHandler = new UpdateExpenseHandler(expenseService);
    const deleteExpenseHandler = new DeleteExpenseHandler(expenseService);
    const submitExpenseHandler = new SubmitExpenseHandler(expenseService);
    const approveExpenseHandler = new ApproveExpenseHandler(expenseService);
    const rejectExpenseHandler = new RejectExpenseHandler(expenseService);
    const reimburseExpenseHandler = new ReimburseExpenseHandler(expenseService);

    const createCategoryHandler = new CreateCategoryHandler(categoryService);
    const updateCategoryHandler = new UpdateCategoryHandler(categoryService);
    const deleteCategoryHandler = new DeleteCategoryHandler(categoryService);

    const createTagHandler = new CreateTagHandler(tagService);
    const updateTagHandler = new UpdateTagHandler(tagService);
    const deleteTagHandler = new DeleteTagHandler(tagService);

    const createAttachmentHandler = new CreateAttachmentHandler(
      attachmentService,
    );
    const deleteAttachmentHandler = new DeleteAttachmentHandler(
      attachmentService,
    );

    // Query Handlers
    const getExpenseHandler = new GetExpenseHandler(expenseService);
    const listExpensesHandler = new ListExpensesHandler(expenseService);
    const filterExpensesHandler = new FilterExpensesHandler(expenseService);
    const getExpenseStatisticsHandler = new GetExpenseStatisticsHandler(
      expenseService,
    );

    const getCategoryHandler = new GetCategoryHandler(categoryService);
    const listCategoriesHandler = new ListCategoriesHandler(categoryService);

    const getTagHandler = new GetTagHandler(tagService);
    const listTagsHandler = new ListTagsHandler(tagService);

    const getAttachmentHandler = new GetAttachmentHandler(attachmentService);
    const listAttachmentsHandler = new ListAttachmentsHandler(
      attachmentService,
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
      listExpensesHandler,
      filterExpensesHandler,
      getExpenseStatisticsHandler,
    );

    const categoryController = new CategoryController(
      createCategoryHandler,
      updateCategoryHandler,
      deleteCategoryHandler,
      getCategoryHandler,
      listCategoriesHandler,
    );

    const tagController = new TagController(
      createTagHandler,
      updateTagHandler,
      deleteTagHandler,
      getTagHandler,
      listTagsHandler,
    );

    const attachmentController = new AttachmentController(
      createAttachmentHandler,
      deleteAttachmentHandler,
      getAttachmentHandler,
      listAttachmentsHandler,
    );

    const recurringExpenseController = new RecurringExpenseController(
      recurringExpenseService,
    );

    this.services.set("expenseController", expenseController);
    this.services.set("categoryController", categoryController);
    this.services.set("tagController", tagController);
    this.services.set("attachmentController", attachmentController);
    this.services.set("recurringExpenseController", recurringExpenseController);

    // ============================================
    // Budget Management Module
    // ============================================

    // Repositories
    const budgetRepository = new BudgetRepositoryImpl(prisma);
    const budgetAllocationRepository = new BudgetAllocationRepositoryImpl(
      prisma,
    );
    const budgetAlertRepository = new BudgetAlertRepositoryImpl(prisma);
    const spendingLimitRepository = new SpendingLimitRepositoryImpl(prisma);

    this.services.set("budgetRepository", budgetRepository);
    this.services.set("budgetAllocationRepository", budgetAllocationRepository);
    this.services.set("budgetAlertRepository", budgetAlertRepository);
    this.services.set("spendingLimitRepository", spendingLimitRepository);

    // Services
    const budgetService = new BudgetService(
      budgetRepository,
      budgetAllocationRepository,
      budgetAlertRepository,
    );
    const spendingLimitService = new SpendingLimitService(
      spendingLimitRepository,
    );

    this.services.set("budgetService", budgetService);
    this.services.set("spendingLimitService", spendingLimitService);

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
      spendingLimitService,
    );
    const updateSpendingLimitHandler = new UpdateSpendingLimitHandler(
      spendingLimitService,
    );
    const deleteSpendingLimitHandler = new DeleteSpendingLimitHandler(
      spendingLimitService,
    );

    // Query Handlers
    const getBudgetHandler = new GetBudgetHandler(budgetService);
    const listBudgetsHandler = new ListBudgetsHandler(budgetService);
    const getAllocationsHandler = new GetAllocationsHandler(budgetService);
    const getUnreadAlertsHandler = new GetUnreadAlertsHandler(budgetService);
    const listSpendingLimitsHandler = new ListSpendingLimitsHandler(
      spendingLimitService,
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
      getUnreadAlertsHandler,
    );

    const spendingLimitController = new SpendingLimitController(
      createSpendingLimitHandler,
      updateSpendingLimitHandler,
      deleteSpendingLimitHandler,
      listSpendingLimitsHandler,
    );

    this.services.set("budgetController", budgetController);
    this.services.set("spendingLimitController", spendingLimitController);

    // ============================================
    // Receipt Vault Module
    // ============================================

    // Repositories
    const receiptRepository = new ReceiptRepositoryImpl(prisma);
    const receiptMetadataRepository = new ReceiptMetadataRepositoryImpl(prisma);
    const receiptTagDefinitionRepository =
      new ReceiptTagDefinitionRepositoryImpl(prisma);
    const receiptTagRepository = new ReceiptTagRepositoryImpl(prisma);

    this.services.set("receiptRepository", receiptRepository);
    this.services.set("receiptMetadataRepository", receiptMetadataRepository);
    this.services.set(
      "receiptTagDefinitionRepository",
      receiptTagDefinitionRepository,
    );
    this.services.set("receiptTagRepository", receiptTagRepository);

    // Services
    const receiptService = new ReceiptService(
      receiptRepository,
      receiptMetadataRepository,
      receiptTagRepository,
    );
    const receiptTagService = new ReceiptTagService(
      receiptTagDefinitionRepository,
      receiptTagRepository,
    );

    this.services.set("receiptService", receiptService);
    this.services.set("receiptTagService", receiptTagService);

    // Command Handlers
    const uploadReceiptHandler = new UploadReceiptHandler(receiptService);
    const linkReceiptToExpenseHandler = new LinkReceiptToExpenseHandler(
      receiptService,
    );
    const unlinkReceiptFromExpenseHandler = new UnlinkReceiptFromExpenseHandler(
      receiptService,
    );
    const processReceiptHandler = new ProcessReceiptHandler(receiptService);
    const verifyReceiptHandler = new VerifyReceiptHandler(receiptService);
    const rejectReceiptHandler = new RejectReceiptHandler(receiptService);
    const deleteReceiptHandler = new DeleteReceiptHandler(receiptService);
    const addReceiptMetadataHandler = new AddReceiptMetadataHandler(
      receiptService,
    );
    const updateReceiptMetadataHandler = new UpdateReceiptMetadataHandler(
      receiptService,
    );
    const addReceiptTagHandler = new AddReceiptTagHandler(receiptService);
    const removeReceiptTagHandler = new RemoveReceiptTagHandler(receiptService);
    const createReceiptTagHandler = new CreateReceiptTagHandler(
      receiptTagService,
    );
    const updateReceiptTagHandler = new UpdateReceiptTagHandler(
      receiptTagService,
    );
    const deleteReceiptTagHandler = new DeleteReceiptTagHandler(
      receiptTagService,
    );

    // Query Handlers
    const getReceiptHandler = new GetReceiptHandler(receiptService);
    const listReceiptsHandler = new ListReceiptsHandler(receiptService);
    const getReceiptsByExpenseHandler = new GetReceiptsByExpenseHandler(
      receiptService,
    );
    const getReceiptMetadataHandler = new GetReceiptMetadataHandler(
      receiptService,
    );
    const getReceiptStatsHandler = new GetReceiptStatsHandler(receiptService);
    const listReceiptTagsHandler = new ListReceiptTagsHandler(
      receiptTagService,
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
      getReceiptStatsHandler,
    );

    const receiptTagController = new ReceiptTagController(
      createReceiptTagHandler,
      updateReceiptTagHandler,
      deleteReceiptTagHandler,
      listReceiptTagsHandler,
    );

    this.services.set("receiptController", receiptController);
    this.services.set("receiptTagController", receiptTagController);

    // ============================================
    // Approval Workflow Module
    // ============================================

    // Repositories
    const approvalChainRepository = new PrismaApprovalChainRepository(prisma);
    const expenseWorkflowRepository = new PrismaExpenseWorkflowRepository(
      prisma,
    );

    this.services.set("approvalChainRepository", approvalChainRepository);
    this.services.set("expenseWorkflowRepository", expenseWorkflowRepository);

    // Services
    const approvalChainService = new ApprovalChainService(
      approvalChainRepository,
    );
    const workflowService = new WorkflowService(
      expenseWorkflowRepository,
      approvalChainRepository,
    );

    this.services.set("approvalChainService", approvalChainService);
    this.services.set("workflowService", workflowService);

    // Controllers
    const approvalChainController = new ApprovalChainController(
      approvalChainService,
    );
    const workflowController = new WorkflowController(workflowService);

    this.services.set("approvalChainController", approvalChainController);
    this.services.set("workflowController", workflowController);

    // ============================================
    // Notification Dispatch Module
    // ============================================

    // Repositories
    const notificationRepository = new NotificationRepositoryImpl(prisma);
    const notificationTemplateRepository =
      new NotificationTemplateRepositoryImpl(prisma);
    const notificationPreferenceRepository =
      new NotificationPreferenceRepositoryImpl(prisma);

    this.services.set("notificationRepository", notificationRepository);
    this.services.set(
      "notificationTemplateRepository",
      notificationTemplateRepository,
    );
    this.services.set(
      "notificationPreferenceRepository",
      notificationPreferenceRepository,
    );

    // Services
    const notificationService = new NotificationService(
      notificationRepository,
      notificationTemplateRepository,
      notificationPreferenceRepository,
    );
    const templateService = new TemplateService(notificationTemplateRepository);
    const preferenceService = new PreferenceService(
      notificationPreferenceRepository,
    );

    this.services.set("notificationService", notificationService);
    this.services.set("templateService", templateService);
    this.services.set("preferenceService", preferenceService);

    // Controllers
    const notificationController = new NotificationController(
      notificationService,
    );
    const templateController = new TemplateController(templateService);
    const preferenceController = new PreferenceController(preferenceService);

    this.services.set("notificationController", notificationController);
    this.services.set("templateController", templateController);
    this.services.set("preferenceController", preferenceController);

    // ============================================
    // Cost Allocation Module
    // ============================================

    // Repositories
    const departmentRepository = new DepartmentRepositoryImpl(prisma);
    const costCenterRepository = new CostCenterRepositoryImpl(prisma);
    const projectRepository = new ProjectRepositoryImpl(prisma);
    const expenseAllocationRepository = new ExpenseAllocationRepositoryImpl(prisma);

    this.services.set("departmentRepository", departmentRepository);
    this.services.set("costCenterRepository", costCenterRepository);
    this.services.set("projectRepository", projectRepository);
    this.services.set("expenseAllocationRepository", expenseAllocationRepository);

    // Services
    const allocationManagementService = new AllocationManagementService(
      departmentRepository,
      costCenterRepository,
      projectRepository,
    );
    const expenseAllocationService = new ExpenseAllocationService(
      expenseAllocationRepository,
      prisma,
    );

    this.services.set("allocationManagementService", allocationManagementService);
    this.services.set("expenseAllocationService", expenseAllocationService);

    // Command Handlers
    const createDepartmentHandler = new CreateDepartmentHandler(allocationManagementService);
    const updateDepartmentHandler = new UpdateDepartmentHandler(allocationManagementService);
    const deleteDepartmentHandler = new DeleteDepartmentHandler(allocationManagementService);
    const activateDepartmentHandler = new ActivateDepartmentHandler(allocationManagementService);
    const createCostCenterHandler = new CreateCostCenterHandler(allocationManagementService);
    const updateCostCenterHandler = new UpdateCostCenterHandler(allocationManagementService);
    const deleteCostCenterHandler = new DeleteCostCenterHandler(allocationManagementService);
    const activateCostCenterHandler = new ActivateCostCenterHandler(allocationManagementService);
    const createProjectHandler = new CreateProjectHandler(allocationManagementService);
    const updateProjectHandler = new UpdateProjectHandler(allocationManagementService);
    const deleteProjectHandler = new DeleteProjectHandler(allocationManagementService);
    const activateProjectHandler = new ActivateProjectHandler(allocationManagementService);
    const allocateExpenseHandler = new AllocateExpenseHandler(expenseAllocationService);
    const deleteAllocationsHandler = new DeleteAllocationsHandler(expenseAllocationService);

    // Query Handlers
    const getDepartmentHandler = new GetDepartmentHandler(allocationManagementService);
    const listDepartmentsHandler = new ListDepartmentsHandler(allocationManagementService);
    const getCostCenterHandler = new GetCostCenterHandler(allocationManagementService);
    const listCostCentersHandler = new ListCostCentersHandler(allocationManagementService);
    const getProjectHandler = new GetProjectHandler(allocationManagementService);
    const listProjectsHandler = new ListProjectsHandler(allocationManagementService);
    const getExpenseAllocationsHandler = new GetExpenseAllocationsHandler(expenseAllocationService);
    const getAllocationSummaryHandler = new GetAllocationSummaryHandler(expenseAllocationService);

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
      listProjectsHandler,
    );
    const expenseAllocationController = new ExpenseAllocationController(
      allocateExpenseHandler,
      deleteAllocationsHandler,
      getExpenseAllocationsHandler,
      getAllocationSummaryHandler,
    );

    this.services.set("allocationManagementController", allocationManagementController);
    this.services.set("expenseAllocationController", expenseAllocationController);

    // Store Prisma for module route registration
    this.services.set("prisma", prisma);
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
      userManagementService: this.get<UserManagementService>(
        "userManagementService",
      ),
      workspaceManagementService: this.get<WorkspaceManagementService>(
        "workspaceManagementService",
      ),
      workspaceMembershipService: this.get<WorkspaceMembershipService>(
        "workspaceMembershipService",
      ),
      workspaceInvitationService: this.get<WorkspaceInvitationService>(
        "workspaceInvitationService",
      ),
      prisma: this.get<PrismaClient>("prisma"),
    };
  }

  /**
   * Get all expense-ledger services for route registration
   */
  getExpenseLedgerServices() {
    return {
      expenseController: this.get<ExpenseController>("expenseController"),
      categoryController: this.get<CategoryController>("categoryController"),
      tagController: this.get<TagController>("tagController"),
      attachmentController: this.get<AttachmentController>(
        "attachmentController",
      ),
      recurringExpenseController: this.get<RecurringExpenseController>(
        "recurringExpenseController",
      ),
      prisma: this.get<PrismaClient>("prisma"),
    };
  }

  /**
   * Get all budget-management services for route registration
   */
  getBudgetManagementServices() {
    return {
      budgetController: this.get<BudgetController>("budgetController"),
      spendingLimitController: this.get<SpendingLimitController>(
        "spendingLimitController",
      ),
      prisma: this.get<PrismaClient>("prisma"),
    };
  }

  /**
   * Get all receipt-vault services for route registration
   */
  getReceiptVaultServices() {
    return {
      receiptController: this.get<ReceiptController>("receiptController"),
      tagController: this.get<ReceiptTagController>("receiptTagController"),
      prisma: this.get<PrismaClient>("prisma"),
    };
  }

  /**
   * Get all approval-workflow services for route registration
   */
  getApprovalWorkflowServices() {
    return {
      approvalChainController: this.get<ApprovalChainController>(
        "approvalChainController",
      ),
      workflowController: this.get<WorkflowController>("workflowController"),
      prisma: this.get<PrismaClient>("prisma"),
    };
  }

  /**
   * Get all notification-dispatch services for route registration
   */
  getNotificationDispatchServices() {
    return {
      notificationController: this.get<NotificationController>(
        "notificationController",
      ),
      templateController: this.get<TemplateController>("templateController"),
      preferenceController: this.get<PreferenceController>(
        "preferenceController",
      ),
      prisma: this.get<PrismaClient>("prisma"),
    };
  }

  /**
   * Get all cost-allocation services for route registration
   */
  getCostAllocationServices() {
    return {
      allocationManagementController: this.get<AllocationManagementController>(
        "allocationManagementController",
      ),
      expenseAllocationController: this.get<ExpenseAllocationController>(
        "expenseAllocationController",
      ),
      prisma: this.get<PrismaClient>("prisma"),
    };
  }
}

export const container = Container.getInstance();
