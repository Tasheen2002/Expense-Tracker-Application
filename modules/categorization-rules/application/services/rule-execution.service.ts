import { CategoryRuleRepository } from "../../domain/repositories/category-rule.repository";
import { RuleExecutionRepository } from "../../domain/repositories/rule-execution.repository";
import { RuleExecution } from "../../domain/entities/rule-execution.entity";
import { CategoryRule } from "../../domain/entities/category-rule.entity";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { ExpenseId } from "../../../expense-ledger/domain/value-objects/expense-id";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import { RuleId } from "../../domain/value-objects/rule-id";
import { RuleExecutionId } from "../../domain/value-objects/rule-execution-id";
import { CategoryRuleNotFoundError } from "../../domain/errors/categorization-rules.errors";
import { CategorySuggestion } from "../../domain/entities/category-suggestion.entity";
import { ConfidenceScore } from "../../domain/value-objects/confidence-score";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class RuleExecutionService {
  constructor(
    private readonly ruleRepository: CategoryRuleRepository,
    private readonly executionRepository: RuleExecutionRepository,
  ) {}

  async evaluateAndApplyRules(params: {
    workspaceId: WorkspaceId;
    expenseId: ExpenseId;
    expenseData: {
      merchant?: string;
      description?: string;
      amount: number;
      paymentMethod?: string;
    };
  }): Promise<{
    appliedRule: CategoryRule | null;
    suggestedCategoryId: CategoryId | null;
    execution: RuleExecution | null;
    suggestion: CategorySuggestion | null;
  }> {
    // Get all active rules for the workspace, ordered by priority
    const activeRulesResult = await this.ruleRepository.findActiveByWorkspaceId(
      params.workspaceId,
    );

    // Find the first matching rule
    for (const rule of activeRulesResult.items) {
      if (rule.matches(params.expenseData)) {
        // Create execution record
        const execution = RuleExecution.create({
          ruleId: rule.getId(),
          expenseId: params.expenseId,
          workspaceId: params.workspaceId,
          appliedCategoryId: rule.getTargetCategoryId(),
        });

        // Create suggestion record (Atomic with execution)
        const suggestion = CategorySuggestion.create({
          workspaceId: params.workspaceId,
          expenseId: params.expenseId,
          suggestedCategoryId: rule.getTargetCategoryId(),
          confidence: ConfidenceScore.high(),
          reason: `Matched rule: ${rule.getName()}`,
        });

        await this.executionRepository.saveWithSuggestion(
          execution,
          suggestion,
        );

        return {
          appliedRule: rule,
          suggestedCategoryId: rule.getTargetCategoryId(),
          execution,
          suggestion,
        };
      }
    }

    // No matching rules found
    return {
      appliedRule: null,
      suggestedCategoryId: null,
      execution: null,
      suggestion: null,
    };
  }

  async getExecutionsByRuleId(
    ruleId: RuleId,
    options?: { limit?: number; offset?: number },
  ): Promise<PaginatedResult<RuleExecution>> {
    const rule = await this.ruleRepository.findById(ruleId);

    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }

    return this.executionRepository.findByRuleId(ruleId, options);
  }

  async getExecutionsByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId,
  ): Promise<RuleExecution[]> {
    return this.executionRepository.findByExpenseId(expenseId, workspaceId);
  }

  async getExecutionsByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: { limit?: number; offset?: number },
  ): Promise<PaginatedResult<RuleExecution>> {
    return this.executionRepository.findByWorkspaceId(workspaceId, options);
  }

  async getExecutionById(
    executionId: RuleExecutionId,
  ): Promise<RuleExecution | null> {
    return this.executionRepository.findById(executionId);
  }
}
