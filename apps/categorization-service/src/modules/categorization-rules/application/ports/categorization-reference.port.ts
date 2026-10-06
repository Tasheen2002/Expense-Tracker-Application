export interface ICategorizationReferencePort {
  readExpense(input: { workspaceId: string; expenseId: string; userId: string }): Promise<{
    expenseOwnerId: string;
    expenseData: { amount: number; merchant?: string; description?: string; paymentMethod?: string };
  }>;
  ensureCategory(input: { workspaceId: string; categoryId: string; userId: string }): Promise<void>;
}
