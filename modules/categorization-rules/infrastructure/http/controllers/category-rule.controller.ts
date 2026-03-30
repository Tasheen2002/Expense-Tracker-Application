import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

interface CreateCategoryRuleBody {
  name: string;
  description?: string;
  priority?: number;
  conditionType: string;
  conditionValue: string;
  targetCategoryId: string;
}

interface UpdateCategoryRuleBody {
  name?: string;
  description?: string | null;
  priority?: number;
  conditionType?: string;
  conditionValue?: string;
  targetCategoryId?: string;
}

// Command Handlers
import { CreateCategoryRuleHandler } from '../../../application/commands/create-category-rule.command';
import { UpdateCategoryRuleHandler } from '../../../application/commands/update-category-rule.command';
import { DeleteCategoryRuleHandler } from '../../../application/commands/delete-category-rule.command';
import { ActivateCategoryRuleHandler } from '../../../application/commands/activate-category-rule.command';
import { DeactivateCategoryRuleHandler } from '../../../application/commands/deactivate-category-rule.command';

// Query Handlers
import { GetRuleByIdHandler } from '../../../application/queries/get-rule-by-id.query';
import { GetRulesByWorkspaceHandler } from '../../../application/queries/get-rules-by-workspace.query';
import { GetActiveRulesByWorkspaceHandler } from '../../../application/queries/get-active-rules-by-workspace.query';
import { GetExecutionsByRuleHandler } from '../../../application/queries/get-executions-by-rule.query';

export class CategoryRuleController {
  constructor(
    private readonly createRuleHandler: CreateCategoryRuleHandler,
    private readonly updateRuleHandler: UpdateCategoryRuleHandler,
    private readonly deleteRuleHandler: DeleteCategoryRuleHandler,
    private readonly activateRuleHandler: ActivateCategoryRuleHandler,
    private readonly deactivateRuleHandler: DeactivateCategoryRuleHandler,
    private readonly getRuleByIdHandler: GetRuleByIdHandler,
    private readonly getRulesByWorkspaceHandler: GetRulesByWorkspaceHandler,
    private readonly getActiveRulesByWorkspaceHandler: GetActiveRulesByWorkspaceHandler,
    private readonly getExecutionsByRuleHandler: GetExecutionsByRuleHandler
  ) {}

  async createRule(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: CreateCategoryRuleBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: 'User not authenticated',
          statusCode: 401,
        });
      }

      const result = await this.createRuleHandler.handle({
        workspaceId,
        name: request.body.name,
        description: request.body.description,
        priority: request.body.priority,
        conditionType: request.body.conditionType,
        conditionValue: request.body.conditionValue,
        targetCategoryId: request.body.targetCategoryId,
        createdBy: userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Category rule created successfully',
        result.data,
        201
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateRule(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; ruleId: string };
      Body: UpdateCategoryRuleBody;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { ruleId } = request.params;
      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: 'User not authenticated',
          statusCode: 401,
        });
      }

      const result = await this.updateRuleHandler.handle({
        ruleId,
        userId,
        name: request.body.name,
        description: request.body.description,
        priority: request.body.priority,
        conditionType: request.body.conditionType,
        conditionValue: request.body.conditionValue,
        targetCategoryId: request.body.targetCategoryId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Category rule updated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteRule(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { ruleId } = request.params;

      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: 'User not authenticated',
          statusCode: 401,
        });
      }

      const result = await this.deleteRuleHandler.handle({ ruleId, userId });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Category rule deleted successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateRule(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { ruleId } = request.params;

      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: 'User not authenticated',
          statusCode: 401,
        });
      }

      const result = await this.activateRuleHandler.handle({ ruleId, userId });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Category rule activated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deactivateRule(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { ruleId } = request.params;

      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: 'User not authenticated',
          statusCode: 401,
        });
      }

      const result = await this.deactivateRuleHandler.handle({
        ruleId,
        userId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Category rule deactivated successfully'
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getRuleById(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { ruleId } = request.params;

      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: 'User not authenticated',
          statusCode: 401,
        });
      }

      const result = await this.getRuleByIdHandler.handle({ ruleId, userId });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Category rule retrieved successfully',
        result.data?.toJSON()
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listRules(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { activeOnly?: string; limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { activeOnly, limit, offset } = request.query;

      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: 'User not authenticated',
          statusCode: 401,
        });
      }

      if (activeOnly === 'true') {
        const result = await this.getActiveRulesByWorkspaceHandler.handle({
          workspaceId,
          userId,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        });
        return ResponseHelper.fromQuery(
          reply,
          result,
          'Active category rules retrieved successfully',
          {
            items: result.data?.items.map((rule) => rule.toJSON()) || [],
            pagination: {
              total: result.data?.total || 0,
              limit: result.data?.limit || 10,
              offset: result.data?.offset || 0,
              hasMore: result.data?.hasMore || false,
            },
          }
        );
      } else {
        const result = await this.getRulesByWorkspaceHandler.handle({
          workspaceId,
          userId,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        });
        return ResponseHelper.fromQuery(
          reply,
          result,
          'Category rules retrieved successfully',
          {
            items: result.data?.items.map((rule) => rule.toJSON()) || [],
            pagination: {
              total: result.data?.total || 0,
              limit: result.data?.limit || 10,
              offset: result.data?.offset || 0,
              hasMore: result.data?.hasMore || false,
            },
          }
        );
      }
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getRuleExecutions(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; ruleId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { ruleId } = request.params;

      const userId = request.user.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: 'User not authenticated',
          statusCode: 401,
        });
      }

      const result = await this.getExecutionsByRuleHandler.handle({
        ruleId,
        limit: request.query.limit ? parseInt(request.query.limit) : undefined,
        offset: request.query.offset
          ? parseInt(request.query.offset)
          : undefined,
      });

      return ResponseHelper.fromQuery(
        reply,
        result,
        'Rule executions retrieved successfully',
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
