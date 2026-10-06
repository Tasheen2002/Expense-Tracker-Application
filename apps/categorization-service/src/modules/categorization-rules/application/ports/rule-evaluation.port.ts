import { CategoryRule } from '../../domain/entities/category-rule.entity';
import { CategorySuggestion } from '../../domain/entities/category-suggestion.entity';
import { RuleExecution } from '../../domain/entities/rule-execution.entity';

export interface IRuleEvaluationPort {
  /**
   * Atomically append the execution, suggestion and pending events after checking
   * the persisted rule is still active and matches the evaluated definition.
   * Clear events only after commit; preserve them if the transaction fails.
   */
  commit(execution: RuleExecution, suggestion: CategorySuggestion, rule: CategoryRule): Promise<void>;
}
