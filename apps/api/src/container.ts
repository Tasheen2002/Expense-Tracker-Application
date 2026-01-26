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
    const budgetAllocationRepository = new BudgetAllocationRepositoryImpl(prisma);
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
      budgetAlertRepository
    );
    const spendingLimitService = new SpendingLimitService(spendingLimitRepository);

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
    const createSpendingLimitHandler = new CreateSpendingLimitHandler(spendingLimitService);
    const updateSpendingLimitHandler = new UpdateSpendingLimitHandler(spendingLimitService);
    const deleteSpendingLimitHandler = new DeleteSpendingLimitHandler(spendingLimitService);

    // Query Handlers
    const getBudgetHandler = new GetBudgetHandler(budgetService);
    const listBudgetsHandler = new ListBudgetsHandler(budgetService);
    const getAllocationsHandler = new GetAllocationsHandler(budgetService);
    const getUnreadAlertsHandler = new GetUnreadAlertsHandler(budgetService);
    const listSpendingLimitsHandler = new ListSpendingLimitsHandler(spendingLimitService);

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

    this.services.set("budgetController", budgetController);
    this.services.set("spendingLimitController", spendingLimitController);

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
}

export const container = Container.getInstance();
