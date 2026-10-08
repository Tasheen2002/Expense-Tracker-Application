import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { CategoryId } from '../../domain/value-objects/category-id';
import { ICategoryRepository } from '../../domain/repositories/category.repository';
import {
  CategoryNotFoundError,
  ExpenseNotFoundError,
  UnauthorizedExpenseAccessError,
} from '../../domain/errors/expense.errors';
import { ExpenseService } from './expense.service';
import { AccessRequirement, OperationService } from './operation.service';

export async function getVisibleExpense(
  operations: OperationService,
  expenses: Pick<ExpenseService, 'getExpenseById'>,
  access: AccessRequirement & { expenseId: string; action: string }
): Promise<ExpenseDTO> {
  if (!access.actorId)
    throw new UnauthorizedExpenseAccessError(
      access.expenseId,
      'anonymous',
      access.action
    );
  const membership = await operations.authorize(access);
  const expense = await expenses.getExpenseById(
    access.expenseId,
    access.workspaceId
  );
  if (!expense)
    throw new ExpenseNotFoundError(access.expenseId, access.workspaceId);
  operations.authorizeExpenseVisibility(
    access.actorId,
    expense,
    membership.role
  );
  return expense;
}

export async function requireExpenseCategory(
  categories: Pick<ICategoryRepository, 'exists'>,
  categoryId: string | null | undefined,
  workspaceId: string
): Promise<void> {
  if (
    categoryId &&
    !(await categories.exists(CategoryId.fromString(categoryId), workspaceId))
  ) {
    throw new CategoryNotFoundError(categoryId, workspaceId);
  }
}
