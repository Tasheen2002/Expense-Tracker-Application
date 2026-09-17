import {
  PrismaClient,
  CategoryRule as PrismaCategoryRule,
} from "@prisma/client";
import { ICategoryRuleRepository } from "../../domain/repositories/category-rule.repository";
import { CategoryRule } from "../../domain/entities/category-rule.entity";
import { RuleId } from "../../domain/value-objects/rule-id";
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import { RuleCondition } from "../../domain/value-objects/rule-condition";
import { RuleConditionType } from "../../domain/enums/rule-condition-type";
import {  CategoryId  } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';

export class PrismaCategoryRuleRepository
  extends PrismaRepository<CategoryRule>
  implements ICategoryRuleRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(rule: CategoryRule): Promise<void> {
    const data = {
      id: rule.id.getValue(),
      workspaceId: rule.workspaceId.getValue(),
      name: rule.name,
      description: rule.description,
      priority: rule.priority,
      isActive: rule.isActive,
      conditionType: rule.condition.getConditionType(),
      conditionValue: rule.condition.getConditionValue(),
      targetCategoryId: rule.targetCategoryId.getValue(),
      createdBy: rule.createdBy.getValue(),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };

    await this.prisma.categoryRule.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });

    await this.dispatchEvents(rule);
  }

  async findById(id: RuleId, workspaceId: WorkspaceId): Promise<CategoryRule | null> {
    const rule = await this.prisma.categoryRule.findFirst({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });

    if (!rule) {
      return null;
    }

    return this.toDomain(rule);
  }

  async findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CategoryRule>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.categoryRule,
      {
        where: { workspaceId: workspaceId.getValue() },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      },
      (rule) => this.toDomain(rule),
      options,
    );
  }

  async findActiveByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CategoryRule>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.categoryRule,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          isActive: true,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      },
      (rule) => this.toDomain(rule),
      options,
    );
  }

  async findByName(
    name: string,
    workspaceId: WorkspaceId,
  ): Promise<CategoryRule | null> {
    const rule = await this.prisma.categoryRule.findFirst({
      where: {
        name,
        workspaceId: workspaceId.getValue(),
      },
    });

    if (!rule) {
      return null;
    }

    return this.toDomain(rule);
  }

  async delete(id: RuleId): Promise<void> {
    await this.prisma.categoryRule.delete({
      where: { id: id.getValue() },
    });
  }

  private toDomain(raw: PrismaCategoryRule): CategoryRule {
    return CategoryRule.fromPersistence({
      id: RuleId.fromString(raw.id),
      workspaceId: WorkspaceId.fromString(raw.workspaceId),
      name: raw.name,
      description: raw.description,
      priority: raw.priority,
      isActive: raw.isActive,
      condition: RuleCondition.create(
        raw.conditionType as RuleConditionType,
        raw.conditionValue,
      ),
      targetCategoryId: CategoryId.fromString(raw.targetCategoryId),
      createdBy: UserId.fromString(raw.createdBy),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
