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
import { IWorkspaceAccessPort } from "../ports/workspace-access.port";
import { ICategorizationReferencePort } from '../ports/categorization-reference.port';

export class CategoryRuleService {
  constructor(
    private readonly ruleRepository: ICategoryRuleRepository,
    private readonly workspaceAccess: IWorkspaceAccessPort,
    private readonly references: Pick<ICategorizationReferencePort, 'ensureCategory'>,
  ) {}

  private async checkAccess(
    userId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<boolean> {
    return this.workspaceAccess.isAdminOrOwner(userId, workspaceId);
  }

  private async requireWriteAccess(workspaceId: string, userId: string, action: string): Promise<WorkspaceId> {
    const workspace = WorkspaceId.fromString(workspaceId);
    if (!await this.checkAccess(UserId.fromString(userId), workspace)) {
      throw new UnauthorizedRuleAccessError(action);
    }
    return workspace;
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
    await this.references.ensureCategory({ workspaceId: params.workspaceId.getValue(), categoryId: params.targetCategoryId.getValue(), userId: params.createdBy.getValue() });

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

    if (rule.domainEvents.length > 0) await this.ruleRepository.save(rule);
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
    const authorizedWorkspace = await this.requireWriteAccess(params.workspaceId, params.userId, 'update');
    const rule = await this.ruleRepository.findById(
      params.ruleId,
      authorizedWorkspace,
    );

    if (!rule) {
      throw new CategoryRuleNotFoundError(params.ruleId.getValue());
    }
    if (params.targetCategoryId && !params.targetCategoryId.equals(rule.targetCategoryId)) {
      await this.references.ensureCategory({ workspaceId: authorizedWorkspace.getValue(), categoryId: params.targetCategoryId.getValue(), userId: params.userId });
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

    rule.updateDetails({ name: params.name, description: params.description, priority: params.priority });

    if (params.condition) {
      rule.updateCondition(params.condition);
    }

    if (params.targetCategoryId) {
      rule.updateTargetCategory(params.targetCategoryId);
    }

    if (rule.domainEvents.length > 0) await this.ruleRepository.save(rule);
    return CategoryRule.toDTO(rule);
  }

  async deleteRule(ruleId: RuleId, workspaceId: string, userId: string): Promise<void> {
    const authorizedWorkspace = await this.requireWriteAccess(workspaceId, userId, 'delete');
    const rule = await this.ruleRepository.findById(
      ruleId,
      authorizedWorkspace,
    );

    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }


    rule.markAsDeleted();
    await this.ruleRepository.delete(rule);
  }

  async activateRule(ruleId: RuleId, workspaceId: string, userId: string): Promise<CategoryRuleDTO> {
    const authorizedWorkspace = await this.requireWriteAccess(workspaceId, userId, 'activate');
    const rule = await this.ruleRepository.findById(
      ruleId,
      authorizedWorkspace,
    );

    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }


    rule.activate();
    if (rule.domainEvents.length > 0) await this.ruleRepository.save(rule);
    return CategoryRule.toDTO(rule);
  }

  async deactivateRule(ruleId: RuleId, workspaceId: string, userId: string): Promise<CategoryRuleDTO> {
    const authorizedWorkspace = await this.requireWriteAccess(workspaceId, userId, 'deactivate');
    const rule = await this.ruleRepository.findById(
      ruleId,
      authorizedWorkspace,
    );

    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }


    rule.deactivate();
    if (rule.domainEvents.length > 0) await this.ruleRepository.save(rule);
    return CategoryRule.toDTO(rule);
  }

  async getRuleById(ruleId: RuleId, workspaceId: string, userId: string): Promise<CategoryRuleDTO> {
    const workspace = WorkspaceId.fromString(workspaceId);
    if (!await this.workspaceAccess.isMember(UserId.fromString(userId), workspace)) {
      throw new UnauthorizedRuleAccessError('view');
    }
    const rule = await this.ruleRepository.findById(
      ruleId,
      workspace,
    );
    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }

    return CategoryRule.toDTO(rule);
  }

  async getRulesByWorkspaceId(
    workspaceId: WorkspaceId,
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<PaginatedResult<CategoryRuleDTO>> {
    const hasAccess = await this.workspaceAccess.isMember(UserId.fromString(userId), workspaceId);
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
    const hasAccess = await this.workspaceAccess.isMember(UserId.fromString(userId), workspaceId);
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
