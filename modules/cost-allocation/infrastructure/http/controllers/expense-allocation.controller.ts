import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

interface AllocateExpenseBody {
  allocations: Array<{
    amount: number;
    percentage?: number;
    departmentId?: string;
    costCenterId?: string;
    projectId?: string;
    notes?: string;
  }>;
}

// Command Handlers
import { AllocateExpenseHandler } from '../../../application/commands/allocate-expense.command';
import { DeleteAllocationsHandler } from '../../../application/commands/delete-allocations.command';

// Query Handlers
import { GetExpenseAllocationsHandler } from '../../../application/queries/get-expense-allocations.query';
import { GetAllocationSummaryHandler } from '../../../application/queries/get-allocation-summary.query';

export class ExpenseAllocationController {
  constructor(
    private readonly allocateExpenseHandler: AllocateExpenseHandler,
    private readonly deleteAllocationsHandler: DeleteAllocationsHandler,
    private readonly getExpenseAllocationsHandler: GetExpenseAllocationsHandler,
    private readonly getAllocationSummaryHandler: GetAllocationSummaryHandler
  ) {}

  async allocateExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: AllocateExpenseBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params;
      const { allocations } = request.body;

      // Extract userId from authenticated user context
      const userId = request.user.userId;

      const result = await this.allocateExpenseHandler.handle({
        workspaceId,
        expenseId,
        createdBy: userId,
        allocations,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Expense allocated successfully',
        undefined,
        200
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getAllocations(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, expenseId } = request.params;
      const result = await this.getExpenseAllocationsHandler.handle({
        expenseId,
        workspaceId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Allocations retrieved successfully',
        result.data?.map((a) => a.toJSON()) || []
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteAllocations(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId, expenseId } = request.params;
      const result = await this.deleteAllocationsHandler.handle({
        expenseId,
        workspaceId,
        userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Allocations deleted successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getAllocationSummary(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;

      const { workspaceId } = request.params;
      const result = await this.getAllocationSummaryHandler.handle({
        workspaceId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Allocation summary retrieved successfully',
        result.data
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
