import { ICategoryRuleRepository } from "../../domain/repositories/category-rule.repository";
import { IRuleExecutionRepository } from "../../domain/repositories/rule-execution.repository";
import { RuleExecution, RuleExecutionDTO } from "../../domain/entities/rule-execution.entity";
import { CategoryRule, CategoryRuleDTO } from "../../domain/entities/category-rule.entity";
import { CategorySuggestion, CategorySuggestionDTO } from "../../domain/entities/category-suggestion.entity";
import { WorkspaceId } from "../../../identity-workspace";
import { ExpenseId, CategoryId } from "../../../expense-ledger";
import { RuleId } from "../../domain/value-objects/rule-id";
import { RuleExecutionId } from "../../domain/value-objects/rule-execution-id";
import { CategoryRuleNotFoundError } from "../../domain/errors/categorization-rules.errors";
import { ConfidenceScore } from "../../domain/value-objects/confidence-score";
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';

export interface EvaluationResult {
  appliedRule: CategoryRuleDTO | null;
  suggestedCategoryId: string | null;
  execution: RuleExecutionDTO | null;
  suggestion: CategorySuggestionDTO | null;
}

export class RuleExecutionService {
  constructor(
    private readonly ruleRepository: ICategoryRuleRepository,
    private readonly executionRepository: IRuleExecutionRepository,
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
  }): Promise<EvaluationResult> {
    // Get all active rules for the workspace, ordered by priority
    const activeRulesResult = await this.ruleRepository.findActiveByWorkspaceId(
      params.workspaceId,
    );

    // Find the first matching rule
    for (const rule of activeRulesResult.items) {
      if (rule.matches(params.expenseData)) {
        // Create execution record
        const execution = RuleExecution.create({
          ruleId: rule.id,
          expenseId: params.expenseId,
          workspaceId: params.workspaceId,
          appliedCategoryId: rule.targetCategoryId,
        });

        // Create suggestion record (Atomic with execution)
        const suggestion = CategorySuggestion.create({
          workspaceId: params.workspaceId,
          expenseId: params.expenseId,
          suggestedCategoryId: rule.targetCategoryId,
          confidence: ConfidenceScore.high(),
          reason: `Matched rule: ${rule.name}`,
        });

        await this.executionRepository.saveWithSuggestion(
          execution,
          suggestion,
        );

        // Emit RuleExecutedEvent from the CategoryRule aggregate root
        rule.recordExecution(
          execution.id.getValue(),
          params.expenseId.getValue(),
          true,
        );
        await this.ruleRepository.save(rule);

        return {
          appliedRule: CategoryRule.toDTO(rule),
          suggestedCategoryId: rule.targetCategoryId.getValue(),
          execution: RuleExecution.toDTO(execution),
          suggestion: CategorySuggestion.toDTO(suggestion),
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
    workspaceId: WorkspaceId,
    options?: { limit?: number; offset?: number },
  ): Promise<PaginatedResult<RuleExecutionDTO>> {
    const rule = await this.ruleRepository.findById(ruleId, workspaceId);

    if (!rule) {
      throw new CategoryRuleNotFoundError(ruleId.getValue());
    }

    const result = await this.executionRepository.findByRuleId(ruleId, options);
    return {
      items: result.items.map(RuleExecution.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }

  async getExecutionsByExpenseId(
    expenseId: ExpenseId,
    workspaceId: WorkspaceId,
  ): Promise<PaginatedResult<RuleExecutionDTO>> {
    const result = await this.executionRepository.findByExpenseId(expenseId, workspaceId);
    return {
      items: result.items.map(RuleExecution.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }

  async getExecutionsByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: { limit?: number; offset?: number },
  ): Promise<PaginatedResult<RuleExecutionDTO>> {
    const result = await this.executionRepository.findByWorkspaceId(workspaceId, options);
    return {
      items: result.items.map(RuleExecution.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    };
  }

  async getExecutionById(
    executionId: RuleExecutionId,
    workspaceId: WorkspaceId,
  ): Promise<RuleExecutionDTO | null> {
    const execution = await this.executionRepository.findById(executionId, workspaceId);
    return execution ? RuleExecution.toDTO(execution) : null;
  }
}
