import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateBudgetHandler } from '../../../application/commands/create-budget.command';
import { UpdateBudgetHandler } from '../../../application/commands/update-budget.command';
import { DeleteBudgetHandler } from '../../../application/commands/delete-budget.command';
import { ActivateBudgetHandler } from '../../../application/commands/activate-budget.command';
import { ArchiveBudgetHandler } from '../../../application/commands/archive-budget.command';
import { AddAllocationHandler } from '../../../application/commands/add-allocation.command';
import { UpdateAllocationHandler } from '../../../application/commands/update-allocation.command';
import { DeleteAllocationHandler } from '../../../application/commands/delete-allocation.command';
import { GetBudgetHandler } from '../../../application/queries/get-budget.query';
import { ListBudgetsHandler } from '../../../application/queries/list-budgets.query';
import { GetAllocationsHandler } from '../../../application/queries/get-allocations.query';
import { GetUnreadAlertsHandler } from '../../../application/queries/get-unread-alerts.query';
import { Budget } from '../../../domain/entities/budget.entity';
import { BudgetAllocation } from '../../../domain/entities/budget-allocation.entity';
import { BudgetAlert } from '../../../domain/entities/budget-alert.entity';
import { BudgetPeriodType } from '../../../domain/enums/budget-period-type';
import { BudgetStatus } from '../../../domain/enums/budget-status';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

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
    private readonly getUnreadAlertsHandler: GetUnreadAlertsHandler
  ) {}

  async createBudget(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        name: string;
        description?: string;
        totalAmount: number | string;
        currency: string;
        periodType: string;
        startDate: string;
        endDate?: string;
        isRecurring?: boolean;
        rolloverUnused?: boolean;
      };
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
      Params: { workspaceId: string; budgetId: string };
      Body: {
        name?: string;
        description?: string | null;
        totalAmount?: number | string;
      };
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
      Params: { workspaceId: string; budgetId: string };
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
      Params: { workspaceId: string; budgetId: string };
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
      Params: { workspaceId: string; budgetId: string };
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
        'Budget deleted successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getBudget(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; budgetId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, budgetId } = request.params;

      const result = await this.getBudgetHandler.handle({
        budgetId,
        workspaceId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Budget retrieved successfully',
        result.data ? Budget.toDTO(result.data) : undefined
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listBudgets(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        status?: string;
        isActive?: string;
        createdBy?: string;
        currency?: string;
        limit?: string;
        offset?: string;
      };
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
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Budgets retrieved successfully',
        {
          items: result.data?.items.map((budget) => Budget.toDTO(budget)) || [],
          pagination: {
            total: result.data?.total || 0,
            limit: result.data?.limit || 0,
            offset: result.data?.offset || 0,
            hasMore: result.data?.hasMore || false,
          },
        }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async addAllocation(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; budgetId: string };
      Body: {
        categoryId?: string;
        allocatedAmount: number | string;
        description?: string;
      };
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
      Params: { workspaceId: string; budgetId: string; allocationId: string };
      Body: {
        allocatedAmount?: number | string;
        description?: string | null;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, allocationId } = request.params;

      const result = await this.updateAllocationHandler.handle({
        allocationId,
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
      Params: { workspaceId: string; budgetId: string; allocationId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, allocationId } = request.params;

      const result = await this.deleteAllocationHandler.handle({
        allocationId,
        workspaceId,
        userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Allocation deleted successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getAllocations(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; budgetId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, budgetId } = request.params;

      const result = await this.getAllocationsHandler.handle({
        budgetId,
        workspaceId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Allocations retrieved successfully',
        {
          items:
            result.data?.items.map((allocation: BudgetAllocation) =>
              BudgetAllocation.toDTO(allocation)
            ) || [],
          pagination: {
            total: result.data?.total || 0,
            limit: result.data?.limit || 0,
            offset: result.data?.offset || 0,
            hasMore: result.data?.hasMore || false,
          },
        }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getUnreadAlerts(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;

      const result = await this.getUnreadAlertsHandler.handle({
        workspaceId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Alerts retrieved successfully',
        {
          items:
            result.data?.items.map((alert: BudgetAlert) =>
              BudgetAlert.toDTO(alert)
            ) || [],
          pagination: {
            total: result.data?.total || 0,
            limit: result.data?.limit || 0,
            offset: result.data?.offset || 0,
            hasMore: result.data?.hasMore || false,
          },
        }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
