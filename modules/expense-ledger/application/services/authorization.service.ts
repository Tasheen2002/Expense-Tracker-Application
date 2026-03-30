import { Expense } from "../../domain/entities/expense.entity";
import { UnauthorizedExpenseAccessError } from "../../domain/errors/expense.errors";

/**
 * Authorization Service for permission checks in command handlers
 * Centralizes authorization logic
 */
export class AuthorizationService {
  /**
   * Check if user owns the expense
   */
  requireExpenseOwnership(
    expense: Expense,
    userId: string,
    operation: string = "access",
  ): void {
    if (expense.userId !== userId) {
      throw new UnauthorizedExpenseAccessError(
        expense.id.getValue(),
        userId,
        operation,
      );
    }
  }

  /**
   * Check that user is NOT the expense owner (for approvals/rejections)
   */
  requireDifferentUser(
    expense: Expense,
    userId: string,
    operation: string = "perform this action on",
  ): void {
    if (expense.userId === userId) {
      throw new UnauthorizedExpenseAccessError(
        expense.id.getValue(),
        userId,
        `${operation} (self-action not allowed)`,
      );
    }
  }

  /**
   * Validate workspace access (can be extended with actual workspace membership checks)
   */
  async validateWorkspaceAccess(
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    // TODO: Implement actual workspace membership check
    // For now, this is a placeholder that allows all authenticated users
    // In production, this should check if user is a member of the workspace
  }
}
