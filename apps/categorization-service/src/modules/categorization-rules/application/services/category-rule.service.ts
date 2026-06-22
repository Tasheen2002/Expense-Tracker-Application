import { ICategoryRuleRepository } from "../../domain/repositories/category-rule.repository";
import { CategoryRule, CategoryRuleDTO } from "../../domain/entities/category-rule.entity";
import { RuleId } from "../../domain/value-objects/rule-id";
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import { RuleCondition } from "../../domain/value-objects/rule-condition";
import {  CategoryId  } from '@core/domain/value-objects';
import {
  CategoryRuleNotFoundError,
  DuplicateRuleNameError,
  UnauthorizedRuleAccessError,
} from "../../domain/errors/categorization-rules.errors";
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { IWorkspaceAccessPort } from "../../domain/ports/workspace-access.port";

export class CategoryRuleService {
  constructor(
    private readonly ruleRepository: ICategoryRuleRepository,
    private readonly workspaceAccess: IWorkspaceAccessPort,
  ) {}

  private async checkAccess(
    userId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<boolean> {
    return this.workspaceAccess.isAdminOrOwner(userId.getValue(), workspaceId.getValue());
  }

  async createRule(params: {
    workspaceId: WorkspaceId;
    name: string;
    description?: string;
    priority?: number;
    condition: RuleCondition;
    targetCategoryId: CategoryId;
    createdBy: UserId;
  }): Promise<CategoryRuleDTO> {
    const hasAccess = await this.checkAccess(
      params.createdBy,
      params.workspaceId,
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
    return CategoryRule.toDTO(rule);
  }

  async updateRule(params: {
    ruleId: RuleId;
    workspaceId: string;
    userId: string;
    name?: string;
    description?: string | null;
    priority?: number;
    condition?: RuleCondition;
    targetCategoryId?: CategoryId;
  }): Promise<CategoryRuleDTO> {
    const rule = await this.ruleRepository.findById(
      params.ruleId,
      WorkspaceId.fromString(params.workspaceId),
    );

    if (!rule) {
      throw new CategoryRuleNotFoundError(params.ruleId.getValue());
    }

    const userIdVO = UserId.fromString(params.userId);
    const isCreator = rule.createdBy.equals(userIdVO);
    const isAdminOrOwner = await this.checkAccess(
      userIdVO,
      rule.workspaceId,
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedRuleAccessError("update");
    }

    // Check for duplicate name if name is being changed
    if (params.name && params.name !== rule.name) {
      const existingRule = await this.ruleRepository.findByName(
        params.name,
        rule.workspaceId,
      );

      if (existingRule && !existingRule.id.equals(params.ruleId)) {
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
    return CategoryRule.toDTO(rule);
  }

  async deleteRule(ruleId: RuleId, workspaceId: string, userId: string): Promise<void> {
    const rule = await this.ruleRepository.findById(
      ruleId,
      WorkspaceId.fromString(workspaceId),
    );

    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }

    const userIdVO = UserId.fromString(userId);
    const isCreator = rule.createdBy.equals(userIdVO);
    const isAdminOrOwner = await this.checkAccess(
      userIdVO,
      rule.workspaceId,
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedRuleAccessError("delete");
    }

    rule.markAsDeleted();
    await this.ruleRepository.delete(ruleId);
  }

  async activateRule(ruleId: RuleId, workspaceId: string, userId: string): Promise<CategoryRuleDTO> {
    const rule = await this.ruleRepository.findById(
      ruleId,
      WorkspaceId.fromString(workspaceId),
    );

    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }

    const userIdVO = UserId.fromString(userId);
    const isCreator = rule.createdBy.equals(userIdVO);
    const isAdminOrOwner = await this.checkAccess(
      userIdVO,
      rule.workspaceId,
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedRuleAccessError("activate");
    }

    rule.activate();
    await this.ruleRepository.save(rule);
    return CategoryRule.toDTO(rule);
  }

  async deactivateRule(ruleId: RuleId, workspaceId: string, userId: string): Promise<CategoryRuleDTO> {
    const rule = await this.ruleRepository.findById(
      ruleId,
      WorkspaceId.fromString(workspaceId),
    );

    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }

    const userIdVO = UserId.fromString(userId);
    const isCreator = rule.createdBy.equals(userIdVO);
    const isAdminOrOwner = await this.checkAccess(
      userIdVO,
      rule.workspaceId,
    );

    if (!isCreator && !isAdminOrOwner) {
      throw new UnauthorizedRuleAccessError("deactivate");
    }

    rule.deactivate();
    await this.ruleRepository.save(rule);
    return CategoryRule.toDTO(rule);
  }

  async getRuleById(ruleId: RuleId, workspaceId: string, userId: string): Promise<CategoryRuleDTO> {
    const rule = await this.ruleRepository.findById(
      ruleId,
      WorkspaceId.fromString(workspaceId),
    );
    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }

    const userIdVO = UserId.fromString(userId);
    const hasAccess = await this.checkAccess(
      userIdVO,
      rule.workspaceId,
    );
    if (!hasAccess) {
      throw new UnauthorizedRuleAccessError("view");
    }

    return CategoryRule.toDTO(rule);
  }

  async getRulesByWorkspaceId(
    workspaceId: WorkspaceId,
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<PaginatedResult<CategoryRuleDTO>> {
    const hasAccess = await this.checkAccess(UserId.fromString(userId), workspaceId);
    if (!hasAccess) {
      throw new UnauthorizedRuleAccessError("list");
    }
    const result = await this.ruleRepository.findByWorkspaceId(workspaceId, options);
    return {
      items: result.items.map(CategoryRule.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }

  async getActiveRulesByWorkspaceId(
    workspaceId: WorkspaceId,
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<PaginatedResult<CategoryRuleDTO>> {
    const hasAccess = await this.checkAccess(UserId.fromString(userId), workspaceId);
    if (!hasAccess) {
      throw new UnauthorizedRuleAccessError("list");
    }
    const result = await this.ruleRepository.findActiveByWorkspaceId(workspaceId, options);
    return {
      items: result.items.map(CategoryRule.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }
}
