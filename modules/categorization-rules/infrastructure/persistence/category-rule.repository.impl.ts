import { PrismaClient } from '@prisma/client'
import { CategoryRuleRepository } from '../../domain/repositories/category-rule.repository'
import { CategoryRule } from '../../domain/entities/category-rule.entity'
import { RuleId } from '../../domain/value-objects/rule-id'
import { WorkspaceId } from '../../../identity-workspace/domain/value-objects/workspace-id.vo'
import { RuleCondition } from '../../domain/value-objects/rule-condition'
import { RuleConditionType } from '../../domain/enums/rule-condition-type'
import { CategoryId } from '../../../expense-ledger/domain/value-objects/category-id'
import { UserId } from '../../../identity-workspace/domain/value-objects/user-id.vo'

export class PrismaCategoryRuleRepository implements CategoryRuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(rule: CategoryRule): Promise<void> {
    const data = {
      id: rule.getId().getValue(),
      workspaceId: rule.getWorkspaceId().getValue(),
      name: rule.getName(),
      description: rule.getDescription(),
      priority: rule.getPriority(),
      isActive: rule.getIsActive(),
      conditionType: rule.getCondition().getType(),
      conditionValue: rule.getCondition().getValue(),
      targetCategoryId: rule.getTargetCategoryId().getValue(),
      createdBy: rule.getCreatedBy().getValue(),
      createdAt: rule.getCreatedAt(),
      updatedAt: rule.getUpdatedAt(),
    }

    await this.prisma.categoryRule.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  }

  async findById(id: RuleId): Promise<CategoryRule | null> {
    const rule = await this.prisma.categoryRule.findUnique({
      where: { id: id.getValue() },
    })

    if (!rule) {
      return null
    }

    return this.toDomain(rule)
  }

  async findByWorkspaceId(workspaceId: WorkspaceId): Promise<CategoryRule[]> {
    const rules = await this.prisma.categoryRule.findMany({
      where: { workspaceId: workspaceId.getValue() },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    })

    return rules.map((rule) => this.toDomain(rule))
  }

  async findActiveByWorkspaceId(workspaceId: WorkspaceId): Promise<CategoryRule[]> {
    const rules = await this.prisma.categoryRule.findMany({
      where: {
        workspaceId: workspaceId.getValue(),
        isActive: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    })

    return rules.map((rule) => this.toDomain(rule))
  }

  async findByName(name: string, workspaceId: WorkspaceId): Promise<CategoryRule | null> {
    const rule = await this.prisma.categoryRule.findFirst({
      where: {
        name,
        workspaceId: workspaceId.getValue(),
      },
    })

    if (!rule) {
      return null
    }

    return this.toDomain(rule)
  }

  async delete(id: RuleId): Promise<void> {
    await this.prisma.categoryRule.delete({
      where: { id: id.getValue() },
    })
  }

  private toDomain(raw: any): CategoryRule {
    return CategoryRule.reconstitute({
      id: RuleId.fromString(raw.id),
      workspaceId: WorkspaceId.fromString(raw.workspaceId),
      name: raw.name,
      description: raw.description,
      priority: raw.priority,
      isActive: raw.isActive,
      condition: RuleCondition.create(
        raw.conditionType as RuleConditionType,
        raw.conditionValue
      ),
      targetCategoryId: CategoryId.fromString(raw.targetCategoryId),
      createdBy: UserId.fromString(raw.createdBy),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    })
  }
}
