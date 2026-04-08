export { registerCategorizationRulesRoutes } from './infrastructure/http/routes';

// Domain error types (used by cross-cutting error handlers)
export {
  CategorizationRuleDomainError,
  CategoryRuleNotFoundError,
  RuleExecutionNotFoundError,
  CategorySuggestionNotFoundError,
  SuggestionNotFoundError,
  DuplicateRuleNameError,
  SuggestionAlreadyRespondedError,
  InvalidRuleConditionError,
  InvalidConfidenceScoreError,
  InvalidSuggestionError,
  InvalidRuleError,
  UnauthorizedRuleAccessError,
} from './domain/errors/categorization-rules.errors';

// Domain enums
export { RuleConditionType, isValidRuleConditionType } from './domain/enums/rule-condition-type';

// DTOs
export type { CategoryRuleDTO } from './domain/entities/category-rule.entity';
export type { CategorySuggestionDTO } from './domain/entities/category-suggestion.entity';
export type { RuleExecutionDTO } from './domain/entities/rule-execution.entity';
