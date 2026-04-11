import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '@shared/response.helper';

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
      const { workspaceId, expenseId } = request.params;

      const executions = await this.getExecutionsByExpenseHandler.handle({
        workspaceId,
        expenseId,
      });

      return ResponseHelper.ok(reply, 'Executions retrieved successfully', executions);
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
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
