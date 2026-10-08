/** Validates the current expense and category in the service that owns them. */
export interface ISuggestionAcceptancePort {
  validate(input: { workspaceId: string; expenseId: string; categoryId: string; userId: string }): Promise<{ expenseVersion: number }>;
}

export class SuggestionAcceptanceError extends Error {
  readonly code = 'SUGGESTION_ACCEPTANCE_FAILED';
  constructor(message: string, readonly statusCode: number) {
    super(message);
    this.name = 'SuggestionAcceptanceError';
  }
}
