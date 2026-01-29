import { Decimal } from "@prisma/client/runtime/library";

export interface ExpenseAllocationData {
  id: string;
  workspaceId: string;
  userId: string;
  amount: Decimal;
}

export interface IExpenseLookupPort {
  findExpenseForAllocation(
    expenseId: string,
  ): Promise<ExpenseAllocationData | null>;
}
