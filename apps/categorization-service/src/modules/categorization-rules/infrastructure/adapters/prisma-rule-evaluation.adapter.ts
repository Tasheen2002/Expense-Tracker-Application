import { PrismaClient } from '@prisma/client';
import { IRuleEvaluationPort } from '../../application/ports/rule-evaluation.port';
import { CategoryRule } from '../../domain/entities/category-rule.entity';
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity';
import { RuleExecution } from '../../domain/entities/rule-execution.entity';
import { RuleCondition } from '../../domain/value-objects/rule-condition';
import { RuleConditionType } from '../../domain/enums';
import { InvalidRuleExecutionError, RuleEvaluationConflictError } from '../../domain/errors';
import { persistDomainEvents } from '@shared/infrastructure/persistence/prisma-repository.base';

export class PrismaRuleEvaluationAdapter implements IRuleEvaluationPort {
  constructor(private readonly prisma: PrismaClient) {}

  async commit(
    execution: RuleExecution,
    suggestion: CategorySuggestion,
    rule: CategoryRule
  ): Promise<void> {
    const executionData = {
      id: execution.id.getValue(),
      ruleId: execution.ruleId.getValue(),
      expenseId: execution.expenseId.getValue(),
      workspaceId: execution.workspaceId.getValue(),
      appliedCategoryId: execution.appliedCategoryId.getValue(),
      executedAt: execution.executedAt,
    };

    const suggestionData = {
      id: suggestion.id.getValue(),
      workspaceId: suggestion.workspaceId.getValue(),
      expenseId: suggestion.expenseId.getValue(),
      suggestedCategoryId: suggestion.suggestedCategoryId.getValue(),
      confidence: suggestion.confidence.getValue(),
      reason: suggestion.reason,
      isAccepted: suggestion.isAccepted,
      createdAt: suggestion.createdAt,
      respondedAt: suggestion.respondedAt,
    };

    if (!execution.workspaceId.equals(suggestion.workspaceId) ||
        !execution.workspaceId.equals(rule.workspaceId) || !execution.ruleId.equals(rule.id) ||
        !execution.expenseId.equals(suggestion.expenseId) ||
        !execution.appliedCategoryId.equals(suggestion.suggestedCategoryId) ||
        !execution.appliedCategoryId.equals(rule.targetCategoryId)) {
      throw new InvalidRuleExecutionError('Evaluation records must belong to the same rule, workspace, expense and category');
    }
    await this.prisma.$transaction(async tx => {
      // Serialize evaluation against deletion of its rule.
      await tx.$queryRaw`SELECT id FROM categorization_rules.category_rules WHERE id = ${rule.id.getValue()}::uuid AND workspace_id = ${rule.workspaceId.getValue()}::uuid FOR UPDATE`;
      const activeRule = await tx.categoryRule.findFirst({ where: {
        id: rule.id.getValue(), workspaceId: rule.workspaceId.getValue(), deletedAt: null, isActive: true,
      } });
      if (!activeRule) throw new RuleEvaluationConflictError('Rule is no longer active');
      if (activeRule.version !== rule.version || activeRule.targetCategoryId !== rule.targetCategoryId.getValue() || activeRule.priority !== rule.priority ||
          !RuleCondition.create(activeRule.conditionType as RuleConditionType, activeRule.conditionValue).equals(rule.condition)) {
        throw new RuleEvaluationConflictError('Rule changed during evaluation; evaluate again');
      }
      await tx.ruleExecution.create({
        data: executionData,
      });
      await tx.categorySuggestion.create({
        data: suggestionData,
      });
      await persistDomainEvents(tx, [...rule.domainEvents, ...suggestion.domainEvents]);
    });
    rule.clearDomainEvents();
    suggestion.clearDomainEvents();
  }

}
