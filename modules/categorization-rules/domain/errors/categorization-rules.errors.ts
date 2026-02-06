// Base Domain Error with HTTP Status Code Support
class CategorizationRuleDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "CategorizationRuleDomainError";
  }
}

// NotFound Errors (404)
export class CategoryRuleNotFoundError extends CategorizationRuleDomainError {
  constructor(ruleId: string) {
    super(
      `Category rule with ID ${ruleId} not found`,
      "CATEGORY_RULE_NOT_FOUND",
      404,
    );
    this.name = "CategoryRuleNotFoundError";
  }
}

export class RuleExecutionNotFoundError extends CategorizationRuleDomainError {
  constructor(executionId: string) {
    super(
      `Rule execution with ID ${executionId} not found`,
      "RULE_EXECUTION_NOT_FOUND",
      404,
    );
    this.name = "RuleExecutionNotFoundError";
  }
}

export class CategorySuggestionNotFoundError extends CategorizationRuleDomainError {
  constructor(suggestionId: string) {
    super(
      `Category suggestion with ID ${suggestionId} not found`,
      "CATEGORY_SUGGESTION_NOT_FOUND",
      404,
    );
    this.name = "CategorySuggestionNotFoundError";
  }
}

export class SuggestionNotFoundError extends CategorizationRuleDomainError {
  constructor(suggestionId: string) {
    super(
      `Suggestion with ID ${suggestionId} not found`,
      "SUGGESTION_NOT_FOUND",
      404,
    );
    this.name = "SuggestionNotFoundError";
  }
}

// Conflict Errors (409)
export class DuplicateRuleNameError extends CategorizationRuleDomainError {
  constructor(name: string) {
    super(
      `A rule with name "${name}" already exists in this workspace`,
      "DUPLICATE_RULE_NAME",
      409,
    );
    this.name = "DuplicateRuleNameError";
  }
}

export class SuggestionAlreadyRespondedError extends CategorizationRuleDomainError {
  constructor(suggestionId: string) {
    super(
      `Suggestion ${suggestionId} has already been accepted or rejected`,
      "SUGGESTION_ALREADY_RESPONDED",
      409,
    );
    this.name = "SuggestionAlreadyRespondedError";
  }
}

// Validation Errors (400)
export class InvalidRuleConditionError extends CategorizationRuleDomainError {
  constructor(message: string) {
    super(message, "INVALID_RULE_CONDITION", 400);
    this.name = "InvalidRuleConditionError";
  }
}

export class InvalidConfidenceScoreError extends CategorizationRuleDomainError {
  constructor(message: string) {
    super(message, "INVALID_CONFIDENCE_SCORE", 400);
    this.name = "InvalidConfidenceScoreError";
  }
}

export class InvalidSuggestionError extends CategorizationRuleDomainError {
  constructor(message: string) {
    super(message, "INVALID_SUGGESTION", 400);
    this.name = "InvalidSuggestionError";
  }
}

export class InvalidRuleError extends CategorizationRuleDomainError {
  constructor(message: string) {
    super(message, "INVALID_RULE", 400);
    this.name = "InvalidRuleError";
  }
}

// Authorization Errors (403)
export class UnauthorizedRuleAccessError extends CategorizationRuleDomainError {
  constructor(action: string) {
    super(
      `You are not authorized to ${action} this rule`,
      "UNAUTHORIZED_RULE_ACCESS",
      403,
    );
    this.name = "UnauthorizedRuleAccessError";
  }
}
