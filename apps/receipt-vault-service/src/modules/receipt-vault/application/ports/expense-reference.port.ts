export interface IExpenseReferencePort {
  assertInWorkspace(expenseId: string, workspaceId: string, actorId: string, authToken?: string): Promise<void>;
}
