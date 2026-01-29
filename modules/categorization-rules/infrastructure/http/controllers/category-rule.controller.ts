import { FastifyRequest, FastifyReply } from "fastify";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";
import {
  CreateCategoryRuleBody,
  UpdateCategoryRuleBody,
} from "../validation/category-rule.schema";

// Command Handlers
import {
  CreateCategoryRuleCommand,
  CreateCategoryRuleHandler,
} from "../../../application/commands/create-category-rule.command";
import {
  UpdateCategoryRuleCommand,
  UpdateCategoryRuleHandler,
} from "../../../application/commands/update-category-rule.command";
import {
  DeleteCategoryRuleCommand,
  DeleteCategoryRuleHandler,
} from "../../../application/commands/delete-category-rule.command";
import {
  ActivateCategoryRuleCommand,
  ActivateCategoryRuleHandler,
} from "../../../application/commands/activate-category-rule.command";
import {
  DeactivateCategoryRuleCommand,
  DeactivateCategoryRuleHandler,
} from "../../../application/commands/deactivate-category-rule.command";

// Query Handlers
import {
  GetRuleByIdQuery,
  GetRuleByIdHandler,
} from "../../../application/queries/get-rule-by-id.query";
import {
  GetRulesByWorkspaceQuery,
  GetRulesByWorkspaceHandler,
} from "../../../application/queries/get-rules-by-workspace.query";
import {
  GetActiveRulesByWorkspaceQuery,
  GetActiveRulesByWorkspaceHandler,
} from "../../../application/queries/get-active-rules-by-workspace.query";
import {
  GetExecutionsByRuleQuery,
  GetExecutionsByRuleHandler,
} from "../../../application/queries/get-executions-by-rule.query";

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
    private readonly getExecutionsByRuleHandler: GetExecutionsByRuleHandler,
  ) {}

  async createRule(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Body: CreateCategoryRuleBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const userId = (request as any).user?.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const command: CreateCategoryRuleCommand = {
        workspaceId,
        name: request.body.name,
        description: request.body.description,
        priority: request.body.priority,
        conditionType: request.body.conditionType,
        conditionValue: request.body.conditionValue,
        targetCategoryId: request.body.targetCategoryId,
        createdBy: userId,
      };

      const rule = await this.createRuleHandler.execute(command);

      return ResponseHelper.success(
        reply,
        201,
        "Category rule created successfully",
        rule,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateRule(
    request: FastifyRequest<{
      Params: { workspaceId: string; ruleId: string };
      Body: UpdateCategoryRuleBody;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { ruleId } = request.params;
      const userId = (request as any).user?.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const command: UpdateCategoryRuleCommand = {
        ruleId,
        userId,
        name: request.body.name,
        description: request.body.description,
        priority: request.body.priority,
        conditionType: request.body.conditionType,
        conditionValue: request.body.conditionValue,
        targetCategoryId: request.body.targetCategoryId,
      };

      const rule = await this.updateRuleHandler.execute(command);

      return ResponseHelper.success(
        reply,
        200,
        "Category rule updated successfully",
        rule,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteRule(
    request: FastifyRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { ruleId } = request.params;

      const userId = (request as any).user?.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const command: DeleteCategoryRuleCommand = { ruleId, userId };
      await this.deleteRuleHandler.execute(command);

      return ResponseHelper.success(
        reply,
        200,
        "Category rule deleted successfully",
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async activateRule(
    request: FastifyRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { ruleId } = request.params;

      const userId = (request as any).user?.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const command: ActivateCategoryRuleCommand = { ruleId, userId };
      const rule = await this.activateRuleHandler.execute(command);

      return ResponseHelper.success(
        reply,
        200,
        "Category rule activated successfully",
        rule,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deactivateRule(
    request: FastifyRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { ruleId } = request.params;

      const userId = (request as any).user?.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const command: DeactivateCategoryRuleCommand = { ruleId, userId };
      const rule = await this.deactivateRuleHandler.execute(command);

      return ResponseHelper.success(
        reply,
        200,
        "Category rule deactivated successfully",
        rule,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getRuleById(
    request: FastifyRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { ruleId } = request.params;

      const userId = (request as any).user?.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const query: GetRuleByIdQuery = { ruleId };
      const rule = await this.getRuleByIdHandler.execute(query);

      return ResponseHelper.success(
        reply,
        200,
        "Category rule retrieved successfully",
        rule,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listRules(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Querystring: { activeOnly?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { workspaceId } = request.params;
      const { activeOnly } = request.query;

      const userId = (request as any).user?.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      if (activeOnly === "true") {
        const query: GetActiveRulesByWorkspaceQuery = { workspaceId };
        const rules =
          await this.getActiveRulesByWorkspaceHandler.execute(query);
        return ResponseHelper.success(
          reply,
          200,
          "Active category rules retrieved successfully",
          rules,
        );
      } else {
        const query: GetRulesByWorkspaceQuery = { workspaceId };
        const rules = await this.getRulesByWorkspaceHandler.execute(query);
        return ResponseHelper.success(
          reply,
          200,
          "Category rules retrieved successfully",
          rules,
        );
      }
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getRuleExecutions(
    request: FastifyRequest<{
      Params: { workspaceId: string; ruleId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { ruleId } = request.params;

      const userId = (request as any).user?.userId;
      if (!userId) {
        return ResponseHelper.error(reply, {
          message: "User not authenticated",
          statusCode: 401,
        });
      }

      const query: GetExecutionsByRuleQuery = { ruleId };
      const executions = await this.getExecutionsByRuleHandler.execute(query);

      return ResponseHelper.success(
        reply,
        200,
        "Rule executions retrieved successfully",
        executions,
      );
    } catch (error) {
      return ResponseHelper.error(reply, error);
    }
  }
}
