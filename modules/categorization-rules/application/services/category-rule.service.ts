import { CategoryRuleRepository } from "../../domain/repositories/category-rule.repository";
import { CategoryRule } from "../../domain/entities/category-rule.entity";
import { RuleId } from "../../domain/value-objects/rule-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { RuleCondition } from "../../domain/value-objects/rule-condition";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import {
  CategoryRuleNotFoundError,
  DuplicateRuleNameError,
  UnauthorizedRuleAccessError,
} from "../../domain/errors/categorization-rules.errors";

import { IWorkspaceAccessPort } from "../../domain/ports/workspace-access.port";

export class CategoryRuleService {
  constructor(
    private readonly ruleRepository: CategoryRuleRepository,
    private readonly workspaceAccess: IWorkspaceAccessPort,
  ) {}

  private async checkAccess(
    userId: string,
    workspaceId: string,
  ): Promise<boolean> {
    return this.workspaceAccess.isAdminOrOwner(userId, workspaceId);
  }

  async createRule(params: {
    workspaceId: WorkspaceId;
    name: string;
    description?: string;
    priority?: number;
    condition: RuleCondition;
    targetCategoryId: CategoryId;
    createdBy: UserId;
  }): Promise<CategoryRule> {
    const hasAccess = await this.checkAccess(
      params.createdBy.getValue(),
      params.workspaceId.getValue(),
    );

    if (!hasAccess) {
      throw new UnauthorizedRuleAccessError("create");
    }

    // Check for duplicate name
    const existingRule = await this.ruleRepository.findByName(
      params.name,
      params.workspaceId,
    );

    if (existingRule) {
      throw new DuplicateRuleNameError(params.name);
    }

    const rule = CategoryRule.create({
      workspaceId: params.workspaceId,
      name: params.name,
      description: params.description,
      priority: params.priority,
      condition: params.condition,
      targetCategoryId: params.targetCategoryId,
      createdBy: params.createdBy,
    });

    await this.ruleRepository.save(rule);
    return rule;
  }

  async updateRule(params: {
    ruleId: RuleId;
    userId: string;
    name?: string;
    description?: string | null;
    priority?: number;
    condition?: RuleCondition;
    targetCategoryId?: CategoryId;
  }): Promise<CategoryRule> {
    const rule = await this.ruleRepository.findById(params.ruleId);

    if (!rule) {
      throw new CategoryRuleNotFoundError(params.ruleId.getValue());
    }

    const isCreator = rule.getCreatedBy().getValue() === params.userId;
    const isAdminOrOwner = await this.checkAccess(
      params.userId,
      rule.getWorkspaceId().getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedRuleAccessError("update");
    }

    // Check for duplicate name if name is being changed
    if (params.name && params.name !== rule.getName()) {
      const existingRule = await this.ruleRepository.findByName(
        params.name,
        rule.getWorkspaceId(),
      );

      if (existingRule && !existingRule.getId().equals(params.ruleId)) {
        throw new DuplicateRuleNameError(params.name);
      }
    }

    if (params.name) {
      rule.updateName(params.name);
    }

    if (params.description !== undefined) {
      rule.updateDescription(params.description);
    }

    if (params.priority !== undefined) {
      rule.updatePriority(params.priority);
    }

    if (params.condition) {
      rule.updateCondition(params.condition);
    }

    if (params.targetCategoryId) {
      rule.updateTargetCategory(params.targetCategoryId);
    }

    await this.ruleRepository.save(rule);
    return rule;
  }

  async deleteRule(ruleId: RuleId, userId: string): Promise<void> {
    const rule = await this.ruleRepository.findById(ruleId);

    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }

    const isCreator = rule.getCreatedBy().getValue() === userId;
    const isAdminOrOwner = await this.checkAccess(
      userId,
      rule.getWorkspaceId().getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedRuleAccessError("delete");
    }

    await this.ruleRepository.delete(ruleId);
  }

  async activateRule(ruleId: RuleId, userId: string): Promise<CategoryRule> {
    const rule = await this.ruleRepository.findById(ruleId);

    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }

    const isCreator = rule.getCreatedBy().getValue() === userId;
    const isAdminOrOwner = await this.checkAccess(
      userId,
      rule.getWorkspaceId().getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedRuleAccessError("activate");
    }

    rule.activate();
    await this.ruleRepository.save(rule);
    return rule;
  }

  async deactivateRule(ruleId: RuleId, userId: string): Promise<CategoryRule> {
    const rule = await this.ruleRepository.findById(ruleId);

    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }

    const isCreator = rule.getCreatedBy().getValue() === userId;
    const isAdminOrOwner = await this.checkAccess(
      userId,
      rule.getWorkspaceId().getValue(),
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedRuleAccessError("deactivate");
    }

    rule.deactivate();
    await this.ruleRepository.save(rule);
    return rule;
  }

  async getRuleById(ruleId: RuleId, userId: string): Promise<CategoryRule> {
    const rule = await this.ruleRepository.findById(ruleId);
    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }

    const hasAccess = await this.checkAccess(
      userId,
      rule.getWorkspaceId().getValue(),
    );
    if (!hasAccess) {
      throw new UnauthorizedRuleAccessError("view");
    }

    return rule;
  }

  async getRulesByWorkspaceId(
    workspaceId: WorkspaceId,
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<
    import("../../../apps/api/src/shared/domain/interfaces/paginated-result.interface").PaginatedResult<CategoryRule>
  > {
    const hasAccess = await this.checkAccess(userId, workspaceId.getValue());
    if (!hasAccess) {
      throw new UnauthorizedRuleAccessError("list");
    }
    return this.ruleRepository.findByWorkspaceId(workspaceId, options);
  }

  async getActiveRulesByWorkspaceId(
    workspaceId: WorkspaceId,
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<
    import("../../../apps/api/src/shared/domain/interfaces/paginated-result.interface").PaginatedResult<CategoryRule>
  > {
    const hasAccess = await this.checkAccess(userId, workspaceId.getValue());
    if (!hasAccess) {
      throw new UnauthorizedRuleAccessError("list");
    }
    return this.ruleRepository.findActiveByWorkspaceId(workspaceId, options);
  }
}
