import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';
import {
  AllocateExpenseHandler,
  DeleteAllocationsHandler,
  GetExpenseAllocationsHandler,
  GetAllocationSummaryHandler,
} from '../../../application';
import {
  ExpenseParamsInput,
  WorkspaceParamsInput,
  AllocateExpenseInput,
} from '../validation/cost-allocation.schema';

export class ExpenseAllocationController {
  constructor(
    private readonly allocateExpenseHandler: AllocateExpenseHandler,
    private readonly deleteAllocationsHandler: DeleteAllocationsHandler,
    private readonly getExpenseAllocationsHandler: GetExpenseAllocationsHandler,
    private readonly getAllocationSummaryHandler: GetAllocationSummaryHandler
  ) {}

  // ==========================================================================
  // Reads (Queries)
  // ==========================================================================

  async getAllocations(
    request: AuthenticatedRequest<{
      Params: ExpenseParamsInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params;
      const allocations = await this.getExpenseAllocationsHandler.handle({
        expenseId,
        workspaceId,
      });

      return ResponseHelper.ok(reply, 'Allocations retrieved successfully', allocations);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getAllocationSummary(
    request: AuthenticatedRequest<{
      Params: WorkspaceParamsInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const summary = await this.getAllocationSummaryHandler.handle({
        workspaceId,
      });

      return ResponseHelper.ok(reply, 'Allocation summary retrieved successfully', summary);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  // ==========================================================================
  // Writes (Commands)
  // ==========================================================================

  async allocateExpense(
    request: AuthenticatedRequest<{
      Params: ExpenseParamsInput;
      Body: AllocateExpenseInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params;
      const { allocations } = request.body;

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
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteAllocations(
    request: AuthenticatedRequest<{
      Params: ExpenseParamsInput;
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

      if (!result.success) {
        return ResponseHelper.fromCommand(reply, result, 'Allocations deletion failed');
      }

      return reply.status(204).send();
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
