import { FastifyRequest, FastifyReply } from "fastify";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";
import { AllocateExpenseBody } from "../validation/allocation.schema";

// Command Handlers
import {
  AllocateExpenseCommand,
  AllocateExpenseHandler,
} from "../../../application/commands/allocate-expense.command";
import {
  DeleteAllocationsCommand,
  DeleteAllocationsHandler,
} from "../../../application/commands/delete-allocations.command";

// Query Handlers
import {
  GetExpenseAllocationsQuery,
  GetExpenseAllocationsHandler,
} from "../../../application/queries/get-expense-allocations.query";
import {
  GetAllocationSummaryQuery,
  GetAllocationSummaryHandler,
} from "../../../application/queries/get-allocation-summary.query";

export class ExpenseAllocationController {
  constructor(
    private readonly allocateExpenseHandler: AllocateExpenseHandler,
    private readonly deleteAllocationsHandler: DeleteAllocationsHandler,
    private readonly getExpenseAllocationsHandler: GetExpenseAllocationsHandler,
    private readonly getAllocationSummaryHandler: GetAllocationSummaryHandler,
  ) {}

  async allocateExpense(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: AllocateExpenseBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId, expenseId } = request.params;
      const { allocations } = request.body;

      // Extract userId from authenticated user context
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const command = new AllocateExpenseCommand(
        workspaceId,
        expenseId,
        userId,
        allocations,
      );
      await this.allocateExpenseHandler.handle(command);

      return ResponseHelper.success(
        reply,
        200,
        "Expense allocated successfully",
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getAllocations(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const { workspaceId, expenseId } = request.params;
      const query = new GetExpenseAllocationsQuery(expenseId, workspaceId);
      const allocations = await this.getExpenseAllocationsHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Allocations retrieved successfully",
        allocations.map((a) => ({
          id: a.getId(),
          amount: a.getAmount().getValue(),
          percentage: a.getPercentage(),
          departmentId: a.getDepartmentId()?.getValue(),
          costCenterId: a.getCostCenterId()?.getValue(),
          projectId: a.getProjectId()?.getValue(),
          notes: a.getNotes(),
          createdBy: a.getCreatedBy().getValue(),
          createdAt: a.getCreatedAt(),
        })),
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteAllocations(
    request: FastifyRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const { workspaceId, expenseId } = request.params;
      const command = new DeleteAllocationsCommand(expenseId, workspaceId);
      await this.deleteAllocationsHandler.handle(command);

      return ResponseHelper.success(
        reply,
        200,
        "Allocations deleted successfully",
        null,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getAllocationSummary(
    request: FastifyRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: "User not authenticated",
        });
      }

      const { workspaceId } = request.params;
      const query = new GetAllocationSummaryQuery(workspaceId);
      const summary = await this.getAllocationSummaryHandler.handle(query);

      return ResponseHelper.success(
        reply,
        200,
        "Allocation summary retrieved successfully",
        summary,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
