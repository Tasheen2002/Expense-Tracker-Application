import {
  PrismaClient,
  CategoryRule as PrismaCategoryRule,
  Prisma,
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
import { DuplicateRuleNameError, RuleWriteConflictError, InvalidRuleError } from '../../domain/errors/categorization-rules.errors';

export class PrismaCategoryRuleRepository
  extends PrismaRepository<CategoryRule>
  implements ICategoryRuleRepository
{
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async save(rule: CategoryRule): Promise<void> {
    if (rule.deletedAt) throw new InvalidRuleError('Use deletion persistence for deleted rules');
    const creating = rule.domainEvents.some(event => event.eventType === 'CategoryRuleCreated');
    if (!creating && rule.version === 2147483647) throw new RuleWriteConflictError();
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

    try {
      await this.persistWithEvents(rule, async tx => {
        if (creating) {
          await tx.categoryRule.create({ data: { ...data, version: rule.version } });
          return;
        }
        const result = await tx.categoryRule.updateMany({
          where: { id: data.id, workspaceId: data.workspaceId, deletedAt: null, version: rule.version },
          data: { ...data, version: { increment: 1 } },
        });
        if (result.count !== 1) throw new RuleWriteConflictError();
      });
      if (!creating) rule.acknowledgePersistence(rule.version + 1);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' &&
          Array.isArray(error.meta?.target) && error.meta.target.includes('name')) {
        throw new DuplicateRuleNameError(data.name);
      }
      throw error;
    }
  }

  async findById(id: RuleId, workspaceId: WorkspaceId): Promise<CategoryRule | null> {
    const rule = await this.prisma.categoryRule.findFirst({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(), deletedAt: null,
      },
    });

    if (!rule) {
      return null;
    }

    return this.toDomain(rule);
  }

  async findIncludingDeleted(id: RuleId, workspaceId: WorkspaceId): Promise<CategoryRule | null> {
    const row = await this.prisma.categoryRule.findFirst({ where: {
      id: id.getValue(), workspaceId: workspaceId.getValue(),
    } });
    return row ? this.toDomain(row) : null;
  }

  async findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CategoryRule>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.categoryRule,
      {
        where: { workspaceId: workspaceId.getValue(), deletedAt: null },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }, { id: "asc" }],
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
          workspaceId: workspaceId.getValue(), deletedAt: null,
          isActive: true,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }, { id: "asc" }],
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
        name: name.trim(),
        workspaceId: workspaceId.getValue(),
      },
    });

    if (!rule) {
      return null;
    }

    return this.toDomain(rule);
  }

  async delete(rule: CategoryRule): Promise<void> {
    if (!rule.deletedAt) throw new InvalidRuleError('Rule must be marked deleted before persistence');
    if (rule.version === 2147483647) throw new RuleWriteConflictError();
    await this.persistWithEvents(rule, async tx => {
      const result = await tx.categoryRule.updateMany({
        where: { id: rule.id.getValue(), workspaceId: rule.workspaceId.getValue(), deletedAt: null, version: rule.version },
        data: { deletedAt: rule.deletedAt, updatedAt: rule.updatedAt, isActive: false, version: { increment: 1 } },
      });
      if (result.count !== 1) throw new RuleWriteConflictError();
    });
    rule.acknowledgePersistence(rule.version + 1);
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
      deletedAt: raw.deletedAt,
      version: raw.version,
    });
  }
}
