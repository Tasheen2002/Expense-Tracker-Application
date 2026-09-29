import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import {
  CreateBudgetHandler,
  UpdateBudgetHandler,
  DeleteBudgetHandler,
  ActivateBudgetHandler,
  ArchiveBudgetHandler,
  AddAllocationHandler,
  UpdateAllocationHandler,
  DeleteAllocationHandler,
  GetBudgetHandler,
  ListBudgetsHandler,
  GetAllocationsHandler,
  GetUnreadAlertsHandler,
  MarkAlertReadHandler,
} from '../../../application';
import { BudgetPeriodType } from '../../../domain/enums/budget-period-type';
import { BudgetStatus } from '../../../domain/enums/budget-status';
import { ResponseHelper } from '@shared/response.helper';
import {
  WorkspaceParams,
  AlertParams,
  BudgetParams,
  AllocationParams,
  CreateBudgetBody,
  UpdateBudgetBody,
  AddAllocationBody,
  UpdateAllocationBody,
  ListBudgetsQuery,
  PaginationQuery,
} from '../validation/budget.schema';

export class BudgetController {
  constructor(
    private readonly createBudgetHandler: CreateBudgetHandler,
    private readonly updateBudgetHandler: UpdateBudgetHandler,
    private readonly deleteBudgetHandler: DeleteBudgetHandler,
    private readonly activateBudgetHandler: ActivateBudgetHandler,
    private readonly archiveBudgetHandler: ArchiveBudgetHandler,
    private readonly addAllocationHandler: AddAllocationHandler,
    private readonly updateAllocationHandler: UpdateAllocationHandler,
    private readonly deleteAllocationHandler: DeleteAllocationHandler,
    private readonly getBudgetHandler: GetBudgetHandler,
    private readonly listBudgetsHandler: ListBudgetsHandler,
    private readonly getAllocationsHandler: GetAllocationsHandler,
    private readonly getUnreadAlertsHandler: GetUnreadAlertsHandler,
    private readonly markAlertReadHandler: MarkAlertReadHandler
  ) {}

  async getBudget(
    request: AuthenticatedRequest<{
      Params: BudgetParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, budgetId } = request.params;

      const budget = await this.getBudgetHandler.handle({
        budgetId,
        workspaceId,
      });

      return ResponseHelper.ok(reply, 'Budget retrieved successfully', budget);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listBudgets(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: ListBudgetsQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { status, isActive, createdBy, currency, limit, offset } =
        request.query;

      const result = await this.listBudgetsHandler.handle({
        workspaceId,
        status: status as BudgetStatus | undefined,
        isActive:
          isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        createdBy,
        currency,
        limit,
        offset,
      });

      return ResponseHelper.ok(reply, 'Budgets retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getAllocations(
    request: AuthenticatedRequest<{
      Params: BudgetParams;
      Querystring: PaginationQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, budgetId } = request.params;
      const { limit, offset } = (request.query as PaginationQuery) || {};

      const result = await this.getAllocationsHandler.handle({
        budgetId,
        workspaceId,
        limit,
        offset,
      });

      return ResponseHelper.ok(reply, 'Allocations retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getUnreadAlerts(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: PaginationQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = (request.query as PaginationQuery) || {};

      const result = await this.getUnreadAlertsHandler.handle({
        workspaceId,
        limit,
        offset,
      });

      return ResponseHelper.ok(reply, 'Alerts retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async markAlertRead(
    request: AuthenticatedRequest<{ Params: AlertParams }>,
    reply: FastifyReply
  ) {
    try {
      const result = await this.markAlertReadHandler.handle(request.params);
      return ResponseHelper.ok(reply, 'Alert marked as read', result.data);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async createBudget(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Body: CreateBudgetBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;

      const result = await this.createBudgetHandler.handle({
        workspaceId,
        name: request.body.name,
        description: request.body.description,
        totalAmount: request.body.totalAmount,
        currency: request.body.currency,
        periodType: request.body.periodType as BudgetPeriodType,
        startDate: new Date(request.body.startDate),
        endDate: request.body.endDate
          ? new Date(request.body.endDate)
          : undefined,
        createdBy: userId,
        isRecurring: request.body.isRecurring,
        rolloverUnused: request.body.rolloverUnused,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateBudget(
    request: AuthenticatedRequest<{
      Params: BudgetParams;
      Body: UpdateBudgetBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId, budgetId } = request.params;

      const result = await this.updateBudgetHandler.handle({
        budgetId,
        workspaceId,
        userId,
        name: request.body.name,
        description: request.body.description,
        totalAmount: request.body.totalAmount,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget updated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateBudget(
    request: AuthenticatedRequest<{
      Params: BudgetParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId, budgetId } = request.params;

      const result = await this.activateBudgetHandler.handle({
        budgetId,
        workspaceId,
        userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget activated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async archiveBudget(
    request: AuthenticatedRequest<{
      Params: BudgetParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId, budgetId } = request.params;

      const result = await this.archiveBudgetHandler.handle({
        budgetId,
        workspaceId,
        userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget archived successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteBudget(
    request: AuthenticatedRequest<{
      Params: BudgetParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId, budgetId } = request.params;

      const result = await this.deleteBudgetHandler.handle({
        budgetId,
        workspaceId,
        userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Budget deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addAllocation(
    request: AuthenticatedRequest<{
      Params: BudgetParams;
      Body: AddAllocationBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId, budgetId } = request.params;

      const result = await this.addAllocationHandler.handle({
        budgetId,
        workspaceId,
        userId,
        categoryId: request.body.categoryId,
        allocatedAmount: request.body.allocatedAmount,
        description: request.body.description,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Allocation added successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateAllocation(
    request: AuthenticatedRequest<{
      Params: AllocationParams;
      Body: UpdateAllocationBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId, budgetId, allocationId } = request.params;

      const result = await this.updateAllocationHandler.handle({
        allocationId,
        budgetId,
        workspaceId,
        userId,
        allocatedAmount: request.body.allocatedAmount,
        description: request.body.description,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Allocation updated successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteAllocation(
    request: AuthenticatedRequest<{
      Params: AllocationParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId, budgetId, allocationId } = request.params;

      const result = await this.deleteAllocationHandler.handle({
        allocationId,
        budgetId,
        workspaceId,
        userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Allocation deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
