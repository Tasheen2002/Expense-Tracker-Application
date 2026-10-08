import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { ResponseHelper } from '@shared/response.helper';
import {
  EvaluateRulesHandler,
  GetExecutionsByExpenseHandler,
  GetExecutionsByWorkspaceHandler,
} from '../../../application';
import {
  WorkspaceParams,
  ExpenseParams,
  EvaluateRulesBody,
  ExecutionQuery,
} from '../validation/categorization-rules.schema';

export class RuleExecutionController {
  constructor(
    private readonly evaluateRulesHandler: EvaluateRulesHandler,
    private readonly getExecutionsByExpenseHandler: GetExecutionsByExpenseHandler,
    private readonly getExecutionsByWorkspaceHandler: GetExecutionsByWorkspaceHandler
  ) {}

  // ==================== READS / QUERIES ====================

  async getExecutionsByExpense(
    request: AuthenticatedRequest<{ Params: ExpenseParams; Querystring: ExecutionQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, expenseId } = request.params;

      const executions = await this.getExecutionsByExpenseHandler.handle({
        workspaceId,
        userId: request.user.userId,
        expenseId,
        limit: request.query.limit,
        offset: request.query.offset,
      });

      return ResponseHelper.ok(reply, 'Executions retrieved successfully', {
        items: executions.items,
        pagination: { total: executions.total, limit: executions.limit, offset: executions.offset, hasMore: executions.hasMore },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getExecutionsByWorkspace(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Querystring: ExecutionQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;

      const result = await this.getExecutionsByWorkspaceHandler.handle({
        workspaceId,
        userId: request.user.userId,
        limit,
        offset,
      });

      return ResponseHelper.ok(
        reply,
        'Executions retrieved successfully',
        {
          items: result.items,
          pagination: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.hasMore,
          },
        }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  // ==================== WRITES / COMMANDS ====================

  async evaluateRules(
    request: AuthenticatedRequest<{
      Params: WorkspaceParams;
      Body: EvaluateRulesBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;

      const result = await this.evaluateRulesHandler.handle({
        workspaceId,
        userId: request.user.userId,
        expenseId: request.body.expenseId,
        expenseData: request.body.expenseData,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Rules evaluated successfully',
        result.data
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
