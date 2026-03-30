export { registerCategorizationRoutes } from './infrastructure/http/routes';

// Domain error types (used by cross-cutting error handlers)
export {
  CategorizationRulesDomainError,
  CategorizationRuleNotFoundError,
  DuplicateRuleNameError,
  InvalidRuleConditionError,
  InvalidRuleActionError,
  RuleEvaluationError,
  UnauthorizedRuleAccessError,
  CategorizationHistoryNotFoundError,
  InvalidConfidenceScoreError,
} from './domain/errors/categorization-rules.errors';

// Domain enums (safe to share — value objects, not entities)
export { RuleStatus } from './domain/enums/rule-status.enum';
export { RuleType } from './domain/enums/rule-type.enum';
export { MatchType } from './domain/enums/match-type.enum';
export { ActionType } from './domain/enums/action-type.enum';
export { RulePriority } from './domain/enums/rule-priority.enum';
