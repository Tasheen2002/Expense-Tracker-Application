import { PrismaClient } from '@prisma/client';
import { getEventBus, InMemoryEventBus } from '@expense-tracker/core';


// Expense-Ledger Repositories
import { ExpenseRepositoryImpl } from './modules/expense-ledger/infrastructure/persistence/expense.repository.impl';
import { CategoryRepositoryImpl } from './modules/expense-ledger/infrastructure/persistence/category.repository.impl';
import { TagRepositoryImpl } from './modules/expense-ledger/infrastructure/persistence/tag.repository.impl';
import { AttachmentRepositoryImpl } from './modules/expense-ledger/infrastructure/persistence/attachment.repository.impl';
import { PrismaRecurringExpenseRepository } from './modules/expense-ledger/infrastructure/persistence/recurring-expense.repository.impl';
import { ExpenseSplitRepositoryImpl } from './modules/expense-ledger/infrastructure/persistence/expense-split.repository.impl';
import { SplitSettlementRepositoryImpl } from './modules/expense-ledger/infrastructure/persistence/split-settlement.repository.impl';

// Expense-Ledger Services
import { ExpenseService } from './modules/expense-ledger/application/services/expense.service';
import { CategoryService } from './modules/expense-ledger/application/services/category.service';
import { TagService } from './modules/expense-ledger/application/services/tag.service';
import { AttachmentService } from './modules/expense-ledger/application/services/attachment.service';
import { RecurringExpenseService } from './modules/expense-ledger/application/services/recurring-expense.service';
import { ExpenseSplitService } from './modules/expense-ledger/application/services/expense-split.service';

// Expense-Ledger Command Handlers
import { CreateExpenseHandler } from './modules/expense-ledger/application/commands/create-expense.command';
import { UpdateExpenseHandler } from './modules/expense-ledger/application/commands/update-expense.command';
import { DeleteExpenseHandler } from './modules/expense-ledger/application/commands/delete-expense.command';
import { SubmitExpenseHandler } from './modules/expense-ledger/application/commands/submit-expense.command';
import { ApproveExpenseHandler } from './modules/expense-ledger/application/commands/approve-expense.command';
import { RejectExpenseHandler } from './modules/expense-ledger/application/commands/reject-expense.command';
import { ReimburseExpenseHandler } from './modules/expense-ledger/application/commands/reimburse-expense.command';
import { CreateCategoryHandler } from './modules/expense-ledger/application/commands/create-category.command';
import { UpdateCategoryHandler } from './modules/expense-ledger/application/commands/update-category.command';
import { DeleteCategoryHandler } from './modules/expense-ledger/application/commands/delete-category.command';
import { CreateTagHandler } from './modules/expense-ledger/application/commands/create-tag.command';
import { UpdateTagHandler } from './modules/expense-ledger/application/commands/update-tag.command';
import { DeleteTagHandler } from './modules/expense-ledger/application/commands/delete-tag.command';
import { CreateAttachmentHandler } from './modules/expense-ledger/application/commands/create-attachment.command';
import { DeleteAttachmentHandler } from './modules/expense-ledger/application/commands/delete-attachment.command';
import { CreateRecurringExpenseHandler } from './modules/expense-ledger/application/commands/create-recurring-expense.command';
import { PauseRecurringExpenseHandler } from './modules/expense-ledger/application/commands/pause-recurring-expense.command';
import { ResumeRecurringExpenseHandler } from './modules/expense-ledger/application/commands/resume-recurring-expense.command';
import { StopRecurringExpenseHandler } from './modules/expense-ledger/application/commands/stop-recurring-expense.command';
import { ProcessRecurringExpensesHandler } from './modules/expense-ledger/application/commands/process-recurring-expenses.command';
import { CreateSplitHandler } from './modules/expense-ledger/application/commands/create-split.command';
import { DeleteSplitHandler } from './modules/expense-ledger/application/commands/delete-split.command';
import { RecordPaymentHandler } from './modules/expense-ledger/application/commands/record-payment.command';

// Expense-Ledger Query Handlers
import { GetExpenseHandler } from './modules/expense-ledger/application/queries/get-expense.query';
import { FilterExpensesHandler } from './modules/expense-ledger/application/queries/filter-expenses.query';
import { GetExpenseStatisticsHandler } from './modules/expense-ledger/application/queries/get-expense-statistics.query';
import { GetCategoryHandler } from './modules/expense-ledger/application/queries/get-category.query';
import { ListCategoriesHandler } from './modules/expense-ledger/application/queries/list-categories.query';
import { GetTagHandler } from './modules/expense-ledger/application/queries/get-tag.query';
import { ListTagsHandler } from './modules/expense-ledger/application/queries/list-tags.query';
import { GetAttachmentHandler } from './modules/expense-ledger/application/queries/get-attachment.query';
import { ListAttachmentsHandler } from './modules/expense-ledger/application/queries/list-attachments.query';
import { GetSplitByExpenseHandler } from './modules/expense-ledger/application/queries/get-split-by-expense.query';
import { GetSplitSettlementsHandler } from './modules/expense-ledger/application/queries/get-split-settlements.query';
import { GetSplitHandler } from './modules/expense-ledger/application/queries/get-split.query';
import { ListUserSplitsHandler } from './modules/expense-ledger/application/queries/list-user-splits.query';
import { ListUserSettlementsHandler } from './modules/expense-ledger/application/queries/list-user-settlements.query';

// Expense-Ledger Controllers
import { ExpenseController } from './modules/expense-ledger/infrastructure/http/controllers/expense.controller';
import { CategoryController } from './modules/expense-ledger/infrastructure/http/controllers/category.controller';
import { TagController } from './modules/expense-ledger/infrastructure/http/controllers/tag.controller';
import { AttachmentController } from './modules/expense-ledger/infrastructure/http/controllers/attachment.controller';
import { RecurringExpenseController } from './modules/expense-ledger/infrastructure/http/controllers/recurring-expense.controller';
import { ExpenseSplitController } from './modules/expense-ledger/infrastructure/http/controllers/expense-split.controller';

// Budget Management Module
import { BudgetRepositoryImpl } from './modules/budget-management/infrastructure/persistence/budget.repository.impl';
import { BudgetAllocationRepositoryImpl } from './modules/budget-management/infrastructure/persistence/budget-allocation.repository.impl';
import { BudgetAlertRepositoryImpl } from './modules/budget-management/infrastructure/persistence/budget-alert.repository.impl';
import { SpendingLimitRepositoryImpl } from './modules/budget-management/infrastructure/persistence/spending-limit.repository.impl';
import { BudgetService } from './modules/budget-management/application/services/budget.service';
import { SpendingLimitService } from './modules/budget-management/application/services/spending-limit.service';
import { CreateBudgetHandler } from './modules/budget-management/application/commands/create-budget.command';
import { UpdateBudgetHandler } from './modules/budget-management/application/commands/update-budget.command';
import { DeleteBudgetHandler } from './modules/budget-management/application/commands/delete-budget.command';
import { ActivateBudgetHandler } from './modules/budget-management/application/commands/activate-budget.command';
import { ArchiveBudgetHandler } from './modules/budget-management/application/commands/archive-budget.command';
import { AddAllocationHandler } from './modules/budget-management/application/commands/add-allocation.command';
import { UpdateAllocationHandler } from './modules/budget-management/application/commands/update-allocation.command';
import { DeleteAllocationHandler } from './modules/budget-management/application/commands/delete-allocation.command';
import { CreateSpendingLimitHandler } from './modules/budget-management/application/commands/create-spending-limit.command';
import { UpdateSpendingLimitHandler } from './modules/budget-management/application/commands/update-spending-limit.command';
import { DeleteSpendingLimitHandler } from './modules/budget-management/application/commands/delete-spending-limit.command';
import { GetBudgetHandler } from './modules/budget-management/application/queries/get-budget.query';
import { ListBudgetsHandler } from './modules/budget-management/application/queries/list-budgets.query';
import { GetAllocationsHandler } from './modules/budget-management/application/queries/get-allocations.query';
import { GetUnreadAlertsHandler } from './modules/budget-management/application/queries/get-unread-alerts.query';
import { GetSpendingLimitHandler } from './modules/budget-management/application/queries/get-spending-limit.query';
import { ListSpendingLimitsHandler } from './modules/budget-management/application/queries/list-spending-limits.query';
import { BudgetController } from './modules/budget-management/infrastructure/http/controllers/budget.controller';
import { SpendingLimitController } from './modules/budget-management/infrastructure/http/controllers/spending-limit.controller';

// Budget Planning Module
import { BudgetPlanRepositoryImpl } from './modules/budget-planning/infrastructure/persistence/budget-plan.repository.impl';
import { ForecastRepositoryImpl } from './modules/budget-planning/infrastructure/persistence/forecast.repository.impl';
import { ScenarioRepositoryImpl } from './modules/budget-planning/infrastructure/persistence/scenario.repository.impl';
import { ForecastItemRepositoryImpl } from './modules/budget-planning/infrastructure/persistence/forecast-item.repository.impl';
import { BudgetPlanService } from './modules/budget-planning/application/services/budget-plan.service';
import { ForecastService } from './modules/budget-planning/application/services/forecast.service';
import { ScenarioService } from './modules/budget-planning/application/services/scenario.service';
import { CreateBudgetPlanHandler } from './modules/budget-planning/application/commands/create-budget-plan.command';
import { UpdateBudgetPlanHandler } from './modules/budget-planning/application/commands/update-budget-plan.command';
import { ActivateBudgetPlanHandler } from './modules/budget-planning/application/commands/activate-budget-plan.command';
import { CreateForecastHandler } from './modules/budget-planning/application/commands/create-forecast.command';
import { AddForecastItemHandler } from './modules/budget-planning/application/commands/add-forecast-item.command';
import { CreateScenarioHandler } from './modules/budget-planning/application/commands/create-scenario.command';
import { UpdateScenarioHandler } from './modules/budget-planning/application/commands/update-scenario.command';
import { DeleteBudgetPlanHandler } from './modules/budget-planning/application/commands/delete-budget-plan.command';
import { DeleteForecastHandler, DeleteForecastItemHandler } from './modules/budget-planning/application/commands/delete-forecast.command';
import { DeleteScenarioHandler } from './modules/budget-planning/application/commands/delete-scenario.command';
import { GetBudgetPlanHandler } from './modules/budget-planning/application/queries/get-budget-plan.query';
import { ListBudgetPlansHandler } from './modules/budget-planning/application/queries/list-budget-plans.query';
import { GetForecastHandler } from './modules/budget-planning/application/queries/get-forecast.query';
import { ListForecastsHandler } from './modules/budget-planning/application/queries/list-forecasts.query';
import { GetForecastItemsHandler } from './modules/budget-planning/application/queries/get-forecast-items.query';
import { GetScenarioHandler } from './modules/budget-planning/application/queries/get-scenario.query';
import { ListScenariosHandler } from './modules/budget-planning/application/queries/list-scenarios.query';
import { BudgetPlanController } from './modules/budget-planning/infrastructure/http/controllers/budget-plan.controller';
import { ForecastController } from './modules/budget-planning/infrastructure/http/controllers/forecast.controller';
import { ScenarioController } from './modules/budget-planning/infrastructure/http/controllers/scenario.controller';

// Cost Allocation Module
import { DepartmentRepositoryImpl } from './modules/cost-allocation/infrastructure/persistence/department.repository.impl';
import { CostCenterRepositoryImpl } from './modules/cost-allocation/infrastructure/persistence/cost-center.repository.impl';
import { ProjectRepositoryImpl } from './modules/cost-allocation/infrastructure/persistence/project.repository.impl';
import { ExpenseAllocationRepositoryImpl } from './modules/cost-allocation/infrastructure/persistence/expense-allocation.repository.impl';
import { AllocationManagementService } from './modules/cost-allocation/application/services/allocation-management.service';
import { ExpenseAllocationService } from './modules/cost-allocation/application/services/expense-allocation.service';
import { PrismaExpenseLookupAdapter } from './modules/cost-allocation/infrastructure/adapters/prisma-expense-lookup.adapter';
import { PrismaAllocationSummaryAdapter } from './modules/cost-allocation/infrastructure/adapters/prisma-allocation-summary.adapter';
import { PrismaWorkspaceAccessAdapter } from './modules/cost-allocation/infrastructure/adapters/prisma-workspace-access.adapter';
import { CreateDepartmentHandler } from './modules/cost-allocation/application/commands/create-department.command';
import { UpdateDepartmentHandler } from './modules/cost-allocation/application/commands/update-department.command';
import { DeleteDepartmentHandler } from './modules/cost-allocation/application/commands/delete-department.command';
import { ActivateDepartmentHandler } from './modules/cost-allocation/application/commands/activate-department.command';
import { CreateCostCenterHandler } from './modules/cost-allocation/application/commands/create-cost-center.command';
import { UpdateCostCenterHandler } from './modules/cost-allocation/application/commands/update-cost-center.command';
import { DeleteCostCenterHandler } from './modules/cost-allocation/application/commands/delete-cost-center.command';
import { ActivateCostCenterHandler } from './modules/cost-allocation/application/commands/activate-cost-center.command';
import { CreateProjectHandler } from './modules/cost-allocation/application/commands/create-project.command';
import { UpdateProjectHandler } from './modules/cost-allocation/application/commands/update-project.command';
import { DeleteProjectHandler } from './modules/cost-allocation/application/commands/delete-project.command';
import { ActivateProjectHandler } from './modules/cost-allocation/application/commands/activate-project.command';
import { AllocateExpenseHandler } from './modules/cost-allocation/application/commands/allocate-expense.command';
import { DeleteAllocationsHandler } from './modules/cost-allocation/application/commands/delete-allocations.command';
import { GetDepartmentHandler } from './modules/cost-allocation/application/queries/get-department.query';
import { ListDepartmentsHandler } from './modules/cost-allocation/application/queries/list-departments.query';
import { GetCostCenterHandler } from './modules/cost-allocation/application/queries/get-cost-center.query';
import { ListCostCentersHandler } from './modules/cost-allocation/application/queries/list-cost-centers.query';
import { GetProjectHandler } from './modules/cost-allocation/application/queries/get-project.query';
import { ListProjectsHandler } from './modules/cost-allocation/application/queries/list-projects.query';
import { GetExpenseAllocationsHandler } from './modules/cost-allocation/application/queries/get-expense-allocations.query';
import { GetAllocationSummaryHandler } from './modules/cost-allocation/application/queries/get-allocation-summary.query';
import { AllocationManagementController } from './modules/cost-allocation/infrastructure/http/controllers/allocation-management.controller';
import { ExpenseAllocationController } from './modules/cost-allocation/infrastructure/http/controllers/expense-allocation.controller';

// Inventory Management Module
import { SupplierRepositoryImpl } from './modules/inventory-management/infrastructure/persistence/supplier.repository.impl';
import { LocationRepositoryImpl } from './modules/inventory-management/infrastructure/persistence/location.repository.impl';
import { PurchaseOrderRepositoryImpl } from './modules/inventory-management/infrastructure/persistence/purchase-order.repository.impl';
import { StockRepositoryImpl } from './modules/inventory-management/infrastructure/persistence/stock.repository.impl';
import { InventoryTransactionRepositoryImpl } from './modules/inventory-management/infrastructure/persistence/inventory-transaction.repository.impl';
import { SupplierService } from './modules/inventory-management/application/services/supplier.service';
import { LocationService } from './modules/inventory-management/application/services/location.service';
import { PurchaseOrderService } from './modules/inventory-management/application/services/purchase-order.service';
import { StockService } from './modules/inventory-management/application/services/stock.service';
import { CreateSupplierHandler } from './modules/inventory-management/application/commands/create-supplier.command';
import { UpdateSupplierHandler } from './modules/inventory-management/application/commands/update-supplier.command';
import { DeleteSupplierHandler } from './modules/inventory-management/application/commands/delete-supplier.command';
import { CreateLocationHandler } from './modules/inventory-management/application/commands/create-location.command';
import { UpdateLocationHandler } from './modules/inventory-management/application/commands/update-location.command';
import { DeleteLocationHandler } from './modules/inventory-management/application/commands/delete-location.command';
import { CreatePurchaseOrderHandler } from './modules/inventory-management/application/commands/create-purchase-order.command';
import { UpdatePurchaseOrderHandler } from './modules/inventory-management/application/commands/update-purchase-order.command';
import { DeletePurchaseOrderHandler } from './modules/inventory-management/application/commands/delete-purchase-order.command';
import { SubmitPurchaseOrderHandler } from './modules/inventory-management/application/commands/submit-purchase-order.command';
import { ApprovePurchaseOrderHandler } from './modules/inventory-management/application/commands/approve-purchase-order.command';
import { ReceivePurchaseOrderHandler } from './modules/inventory-management/application/commands/receive-purchase-order.command';
import { CancelPurchaseOrderHandler } from './modules/inventory-management/application/commands/cancel-purchase-order.command';
import { AddPurchaseOrderItemHandler } from './modules/inventory-management/application/commands/add-purchase-order-item.command';
import { RemovePurchaseOrderItemHandler } from './modules/inventory-management/application/commands/remove-purchase-order-item.command';
import { AdjustStockHandler } from './modules/inventory-management/application/commands/adjust-stock.command';
import { GetSupplierHandler } from './modules/inventory-management/application/queries/get-supplier.query';
import { ListSuppliersHandler } from './modules/inventory-management/application/queries/list-suppliers.query';
import { GetLocationHandler } from './modules/inventory-management/application/queries/get-location.query';
import { ListLocationsHandler } from './modules/inventory-management/application/queries/list-locations.query';
import { GetPurchaseOrderHandler } from './modules/inventory-management/application/queries/get-purchase-order.query';
import { ListPurchaseOrdersHandler } from './modules/inventory-management/application/queries/list-purchase-orders.query';
import { GetStockHandler } from './modules/inventory-management/application/queries/get-stock.query';
import { ListTransactionsHandler } from './modules/inventory-management/application/queries/list-transactions.query';
import { SupplierController } from './modules/inventory-management/infrastructure/http/controllers/supplier.controller';
import { LocationController } from './modules/inventory-management/infrastructure/http/controllers/location.controller';
import { PurchaseOrderController } from './modules/inventory-management/infrastructure/http/controllers/purchase-order.controller';
import { StockController } from './modules/inventory-management/infrastructure/http/controllers/stock.controller';

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

  register(prisma: PrismaClient): void {
    const eventBus = getEventBus() as InMemoryEventBus;


    // ============================================
    // Expense-Ledger Module
    // ============================================
    const expenseRepository = new ExpenseRepositoryImpl(prisma, eventBus);
    const categoryRepository = new CategoryRepositoryImpl(prisma, eventBus);
    const tagRepository = new TagRepositoryImpl(prisma, eventBus);
    const attachmentRepository = new AttachmentRepositoryImpl(prisma);
    const recurringExpenseRepository = new PrismaRecurringExpenseRepository(prisma, eventBus);
    const expenseSplitRepository = new ExpenseSplitRepositoryImpl(prisma, eventBus);
    const splitSettlementRepository = new SplitSettlementRepositoryImpl(prisma);

    const expenseService = new ExpenseService(
      expenseRepository,
      tagRepository
    );
    // No-op in-memory cache service — proper Redis cache can be wired in production
    const noOpCacheService = {
      async get<T>(_key: string): Promise<T | null> { return null; },
      async set<T>(_key: string, _value: T, _ttl?: number): Promise<void> {},
      async delete(_key: string): Promise<void> {},
      async deletePattern(_pattern: string): Promise<void> {},
      async exists(_key: string): Promise<boolean> { return false; },
      async clear(): Promise<void> {},
      async getOrSet<T>(_key: string, factory: () => Promise<T>): Promise<T> { return factory(); },
    };
    const categoryService = new CategoryService(categoryRepository, noOpCacheService);
    const tagService = new TagService(tagRepository);
    const attachmentService = new AttachmentService(attachmentRepository);
    const recurringExpenseService = new RecurringExpenseService(
      recurringExpenseRepository,
      expenseService
    );
    const expenseSplitService = new ExpenseSplitService(
      expenseSplitRepository,
      splitSettlementRepository,
      expenseRepository
    );

    const expenseController = new ExpenseController(
      new CreateExpenseHandler(expenseService, categoryRepository, tagRepository),
      new UpdateExpenseHandler(expenseService, categoryRepository),
      new DeleteExpenseHandler(expenseService),
      new SubmitExpenseHandler(expenseService),
      new ApproveExpenseHandler(expenseService),
      new RejectExpenseHandler(expenseService),
      new ReimburseExpenseHandler(expenseService),
      new GetExpenseHandler(expenseService),
      new FilterExpensesHandler(expenseService),
      new GetExpenseStatisticsHandler(expenseService)
    );

    const categoryController = new CategoryController(
      new CreateCategoryHandler(categoryService),
      new UpdateCategoryHandler(categoryService),
      new DeleteCategoryHandler(categoryService, expenseRepository),
      new GetCategoryHandler(categoryService),
      new ListCategoriesHandler(categoryService)
    );

    const tagController = new TagController(
      new CreateTagHandler(tagService),
      new UpdateTagHandler(tagService),
      new DeleteTagHandler(tagService),
      new GetTagHandler(tagService),
      new ListTagsHandler(tagService)
    );

    const attachmentController = new AttachmentController(
      new CreateAttachmentHandler(attachmentService, expenseService),
      new DeleteAttachmentHandler(attachmentService, expenseService),
      new GetAttachmentHandler(attachmentService),
      new ListAttachmentsHandler(attachmentService)
    );

    const recurringExpenseController = new RecurringExpenseController(
      new CreateRecurringExpenseHandler(recurringExpenseService),
      new PauseRecurringExpenseHandler(recurringExpenseService),
      new ResumeRecurringExpenseHandler(recurringExpenseService),
      new StopRecurringExpenseHandler(recurringExpenseService),
      new ProcessRecurringExpensesHandler(recurringExpenseService)
    );

    const expenseSplitController = new ExpenseSplitController(
      new CreateSplitHandler(expenseSplitService, expenseService),
      new DeleteSplitHandler(expenseSplitService),
      new RecordPaymentHandler(expenseSplitService),
      new GetSplitHandler(expenseSplitService),
      new GetSplitByExpenseHandler(expenseSplitService),
      new ListUserSplitsHandler(expenseSplitService),
      new ListUserSettlementsHandler(expenseSplitService),
      new GetSplitSettlementsHandler(expenseSplitService)
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
    const budgetRepository = new BudgetRepositoryImpl(prisma, eventBus);
    const budgetAllocationRepository = new BudgetAllocationRepositoryImpl(prisma);
    const budgetAlertRepository = new BudgetAlertRepositoryImpl(prisma);
    const spendingLimitRepository = new SpendingLimitRepositoryImpl(prisma, eventBus);

    const budgetService = new BudgetService(
      budgetRepository,
      budgetAllocationRepository,
      budgetAlertRepository
    );
    const spendingLimitService = new SpendingLimitService(spendingLimitRepository);

    const budgetController = new BudgetController(
      new CreateBudgetHandler(budgetService),
      new UpdateBudgetHandler(budgetService),
      new DeleteBudgetHandler(budgetService),
      new ActivateBudgetHandler(budgetService),
      new ArchiveBudgetHandler(budgetService),
      new AddAllocationHandler(budgetService),
      new UpdateAllocationHandler(budgetService),
      new DeleteAllocationHandler(budgetService),
      new GetBudgetHandler(budgetService),
      new ListBudgetsHandler(budgetService),
      new GetAllocationsHandler(budgetService),
      new GetUnreadAlertsHandler(budgetService)
    );

    const spendingLimitController = new SpendingLimitController(
      new CreateSpendingLimitHandler(spendingLimitService),
      new UpdateSpendingLimitHandler(spendingLimitService),
      new DeleteSpendingLimitHandler(spendingLimitService),
      new GetSpendingLimitHandler(spendingLimitService),
      new ListSpendingLimitsHandler(spendingLimitService)
    );

    this.services.set('budgetController', budgetController);
    this.services.set('spendingLimitController', spendingLimitController);

    // ============================================
    // Budget Planning Module
    // ============================================
    const budgetPlanRepository = new BudgetPlanRepositoryImpl(prisma, eventBus);
    const forecastRepository = new ForecastRepositoryImpl(prisma);
    const scenarioRepository = new ScenarioRepositoryImpl(prisma);
    const forecastItemRepository = new ForecastItemRepositoryImpl(prisma);

    const workspaceAccessPlanning = new PrismaWorkspaceAccessAdapter();

    const budgetPlanService = new BudgetPlanService(budgetPlanRepository, workspaceAccessPlanning);
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

    const budgetPlanController = new BudgetPlanController(
      new CreateBudgetPlanHandler(budgetPlanService),
      new UpdateBudgetPlanHandler(budgetPlanService),
      new ActivateBudgetPlanHandler(budgetPlanService),
      new DeleteBudgetPlanHandler(budgetPlanService),
      new GetBudgetPlanHandler(budgetPlanService),
      new ListBudgetPlansHandler(budgetPlanService)
    );

    const forecastController = new ForecastController(
      new CreateForecastHandler(forecastService),
      new AddForecastItemHandler(forecastService),
      new DeleteForecastHandler(forecastService),
      new DeleteForecastItemHandler(forecastService),
      new GetForecastHandler(forecastService),
      new ListForecastsHandler(forecastService),
      new GetForecastItemsHandler(forecastService)
    );

    const scenarioController = new ScenarioController(
      new CreateScenarioHandler(scenarioService),
      new UpdateScenarioHandler(scenarioService),
      new DeleteScenarioHandler(scenarioService),
      new GetScenarioHandler(scenarioService),
      new ListScenariosHandler(scenarioService)
    );

    this.services.set('budgetPlanController', budgetPlanController);
    this.services.set('forecastController', forecastController);
    this.services.set('scenarioController', scenarioController);

    // ============================================
    // Cost Allocation Module
    // ============================================
    const departmentRepository = new DepartmentRepositoryImpl(prisma, eventBus);
    const costCenterRepository = new CostCenterRepositoryImpl(prisma, eventBus);
    const projectRepository = new ProjectRepositoryImpl(prisma, eventBus);
    const expenseAllocationRepository = new ExpenseAllocationRepositoryImpl(prisma, eventBus);

    const expenseLookupAdapter = new PrismaExpenseLookupAdapter(prisma);
    const allocationSummaryAdapter = new PrismaAllocationSummaryAdapter(prisma);
    const workspaceAccessAdapter = new PrismaWorkspaceAccessAdapter();

    const allocationManagementService = new AllocationManagementService(
      departmentRepository,
      costCenterRepository,
      projectRepository,
      workspaceAccessAdapter
    );
    const expenseAllocationService = new ExpenseAllocationService(
      expenseAllocationRepository,
      expenseLookupAdapter,
      allocationSummaryAdapter
    );

    const allocationManagementController = new AllocationManagementController(
      new CreateDepartmentHandler(allocationManagementService),
      new UpdateDepartmentHandler(allocationManagementService),
      new DeleteDepartmentHandler(allocationManagementService),
      new ActivateDepartmentHandler(allocationManagementService),
      new GetDepartmentHandler(allocationManagementService),
      new ListDepartmentsHandler(allocationManagementService),
      new CreateCostCenterHandler(allocationManagementService),
      new UpdateCostCenterHandler(allocationManagementService),
      new DeleteCostCenterHandler(allocationManagementService),
      new ActivateCostCenterHandler(allocationManagementService),
      new GetCostCenterHandler(allocationManagementService),
      new ListCostCentersHandler(allocationManagementService),
      new CreateProjectHandler(allocationManagementService),
      new UpdateProjectHandler(allocationManagementService),
      new DeleteProjectHandler(allocationManagementService),
      new ActivateProjectHandler(allocationManagementService),
      new GetProjectHandler(allocationManagementService),
      new ListProjectsHandler(allocationManagementService)
    );

    const expenseAllocationController = new ExpenseAllocationController(
      new AllocateExpenseHandler(expenseAllocationService),
      new DeleteAllocationsHandler(expenseAllocationService),
      new GetExpenseAllocationsHandler(expenseAllocationService),
      new GetAllocationSummaryHandler(expenseAllocationService)
    );

    this.services.set('allocationManagementController', allocationManagementController);
    this.services.set('expenseAllocationController', expenseAllocationController);

    // ============================================
    // Inventory Management Module
    // ============================================
    const supplierRepository = new SupplierRepositoryImpl(prisma, eventBus);
    const inventoryLocationRepository = new LocationRepositoryImpl(prisma, eventBus);
    const purchaseOrderRepository = new PurchaseOrderRepositoryImpl(prisma, eventBus);
    const stockRepository = new StockRepositoryImpl(prisma, eventBus);
    const inventoryTransactionRepository = new InventoryTransactionRepositoryImpl(prisma);

    const supplierService = new SupplierService(supplierRepository);
    const inventoryLocationService = new LocationService(inventoryLocationRepository);
    const purchaseOrderService = new PurchaseOrderService(
      purchaseOrderRepository,
      supplierRepository
    );
    const stockService = new StockService(
      stockRepository,
      inventoryTransactionRepository,
      inventoryLocationRepository
    );

    const supplierController = new SupplierController(
      new CreateSupplierHandler(supplierService),
      new UpdateSupplierHandler(supplierService),
      new DeleteSupplierHandler(supplierService),
      new GetSupplierHandler(supplierService),
      new ListSuppliersHandler(supplierService)
    );

    const inventoryLocationController = new LocationController(
      new CreateLocationHandler(inventoryLocationService),
      new UpdateLocationHandler(inventoryLocationService),
      new DeleteLocationHandler(inventoryLocationService),
      new GetLocationHandler(inventoryLocationService),
      new ListLocationsHandler(inventoryLocationService)
    );

    const purchaseOrderController = new PurchaseOrderController(
      new CreatePurchaseOrderHandler(purchaseOrderService),
      new UpdatePurchaseOrderHandler(purchaseOrderService),
      new DeletePurchaseOrderHandler(purchaseOrderService),
      new SubmitPurchaseOrderHandler(purchaseOrderService),
      new ApprovePurchaseOrderHandler(purchaseOrderService),
      new ReceivePurchaseOrderHandler(purchaseOrderService),
      new CancelPurchaseOrderHandler(purchaseOrderService),
      new AddPurchaseOrderItemHandler(purchaseOrderService),
      new RemovePurchaseOrderItemHandler(purchaseOrderService),
      new GetPurchaseOrderHandler(purchaseOrderService),
      new ListPurchaseOrdersHandler(purchaseOrderService)
    );

    const stockController = new StockController(
      new AdjustStockHandler(stockService),
      new GetStockHandler(stockService),
      new ListTransactionsHandler(stockService)
    );

    this.services.set('supplierController', supplierController);
    this.services.set('inventoryLocationController', inventoryLocationController);
    this.services.set('purchaseOrderController', purchaseOrderController);
    this.services.set('stockController', stockController);

    // Save prisma
    this.services.set('prisma', prisma);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }

  getExpenseLedgerServices() {
    return {
      expenseController: this.get<ExpenseController>('expenseController'),
      categoryController: this.get<CategoryController>('categoryController'),
      tagController: this.get<TagController>('tagController'),
      attachmentController: this.get<AttachmentController>('attachmentController'),
      recurringExpenseController: this.get<RecurringExpenseController>('recurringExpenseController'),
      expenseSplitController: this.get<ExpenseSplitController>('expenseSplitController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  getBudgetManagementServices() {
    return {
      budgetController: this.get<BudgetController>('budgetController'),
      spendingLimitController: this.get<SpendingLimitController>('spendingLimitController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  getBudgetPlanningServices() {
    return {
      budgetPlanController: this.get<BudgetPlanController>('budgetPlanController'),
      forecastController: this.get<ForecastController>('forecastController'),
      scenarioController: this.get<ScenarioController>('scenarioController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  getCostAllocationServices() {
    return {
      allocationManagementController: this.get<AllocationManagementController>('allocationManagementController'),
      expenseAllocationController: this.get<ExpenseAllocationController>('expenseAllocationController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }

  getInventoryManagementServices() {
    return {
      supplierController: this.get<SupplierController>('supplierController'),
      locationController: this.get<LocationController>('inventoryLocationController'),
      purchaseOrderController: this.get<PurchaseOrderController>('purchaseOrderController'),
      stockController: this.get<StockController>('stockController'),
      prisma: this.get<PrismaClient>('prisma'),
    };
  }
}

export const container = Container.getInstance();
