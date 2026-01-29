export class CategoryRuleNotFoundError extends Error {
  constructor(ruleId: string) {
    super(`Category rule with ID ${ruleId} not found`);
    this.name = "CategoryRuleNotFoundError";
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

export class InvalidRuleConditionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRuleConditionError";
  }
}

export class InvalidConfidenceScoreError extends Error {
  constructor(value: number) {
    super(`Confidence score must be between 0 and 1, got ${value}`);
    this.name = "InvalidConfidenceScoreError";
  }
}

export class UnauthorizedRuleAccessError extends Error {
  constructor(action: string) {
    super(`You are not authorized to ${action} this rule`);
    this.name = "UnauthorizedRuleAccessError";
  }
}
