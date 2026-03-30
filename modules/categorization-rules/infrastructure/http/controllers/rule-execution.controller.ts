import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

interface EvaluateRulesBody {
  expenseId: string;
  expenseData: {
    merchant?: string;
    description?: string;
    amount: number;
    paymentMethod?: string;
  };
}

import { EvaluateRulesHandler } from '../../../application/commands/evaluate-rules.command';

import { GetExecutionsByExpenseHandler } from '../../../application/queries/get-executions-by-expense.query';
import { GetExecutionsByWorkspaceHandler } from '../../../application/queries/get-executions-by-workspace.query';

export class RuleExecutionController {
  constructor(
    private readonly evaluateRulesHandler: EvaluateRulesHandler,
    private readonly getExecutionsByExpenseHandler: GetExecutionsByExpenseHandler,
    private readonly getExecutionsByWorkspaceHandler: GetExecutionsByWorkspaceHandler
  ) {}

  async evaluateRules(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: EvaluateRulesBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;

      const result = await this.evaluateRulesHandler.handle({
        workspaceId,
        expenseId: request.body.expenseId,
        expenseData: request.body.expenseData,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Rules evaluated successfully',
        result.data
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getExecutionsByExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId, expenseId } = request.params;

      const result = await this.getExecutionsByExpenseHandler.handle({
        workspaceId,
        expenseId,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Executions retrieved successfully',
        result.data?.map((execution) => execution.toJSON())
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getExecutionsByWorkspace(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const userId = request.user.userId;
      const { workspaceId } = request.params;
      const limit = request.query.limit
        ? parseInt(request.query.limit)
        : undefined;
      const offset = request.query.offset
        ? parseInt(request.query.offset)
        : undefined;

      const result = await this.getExecutionsByWorkspaceHandler.handle({
        workspaceId,
        limit,
        offset,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Executions retrieved successfully',
        {
          items:
            result.data?.items.map((execution) => execution.toJSON()) || [],
          pagination: {
            total: result.data?.total || 0,
            limit: result.data?.limit || 10,
            offset: result.data?.offset || 0,
            hasMore: result.data?.hasMore || false,
          },
        }
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
