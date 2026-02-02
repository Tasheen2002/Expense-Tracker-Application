export class CategoryRuleNotFoundError extends Error {
  constructor(ruleId: string) {
    super(`Category rule with ID ${ruleId} not found`);
    this.name = "CategoryRuleNotFoundError";
  }
}

class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

// Rule Condition Errors
export class InvalidRuleConditionError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_RULE_CONDITION");
  }
}

// Confidence Score Errors
export class InvalidConfidenceScoreError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_CONFIDENCE_SCORE");
  }
}

// Category Suggestion Errors
export class InvalidSuggestionError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_SUGGESTION");
  }
}

// Category Rule Errors
export class InvalidRuleError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_RULE");
  }
}

export class DuplicateRuleNameError extends Error {
  constructor(name: string) {
    super(`A rule with name "${name}" already exists in this workspace`);
    this.name = "DuplicateRuleNameError";
  }
}

export class RuleExecutionNotFoundError extends Error {
  constructor(executionId: string) {
    super(`Rule execution with ID ${executionId} not found`);
    this.name = "RuleExecutionNotFoundError";
  }
}

export class CategorySuggestionNotFoundError extends Error {
  constructor(suggestionId: string) {
    super(`Category suggestion with ID ${suggestionId} not found`);
    this.name = "CategorySuggestionNotFoundError";
  }
}

export class SuggestionNotFoundError extends Error {
  constructor(suggestionId: string) {
    super(`Suggestion with ID ${suggestionId} not found`);
    this.name = "SuggestionNotFoundError";
  }
}

export class SuggestionAlreadyRespondedError extends Error {
  constructor(suggestionId: string) {
    super(`Suggestion ${suggestionId} has already been accepted or rejected`);
    this.name = "SuggestionAlreadyRespondedError";
  }
}

export class UnauthorizedRuleAccessError extends Error {
  constructor(action: string) {
    super(`You are not authorized to ${action} this rule`);
    this.name = "UnauthorizedRuleAccessError";
  }
}
