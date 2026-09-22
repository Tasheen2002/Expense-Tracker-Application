import { PrismaClient } from "@prisma/client";
import {
  IExpenseLookupPort,
  ExpenseAllocationData,
} from "../../application/ports/expense-lookup.port";

/**
 * Prisma adapter for expense lookups.
 * Implements the port interface using PrismaClient.
 */
export class PrismaExpenseLookupAdapter implements IExpenseLookupPort {
  constructor(private readonly prisma: PrismaClient) {}

  async findExpenseForAllocation(
    expenseId: string,
  ): Promise<ExpenseAllocationData | null> {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true, amount: true, workspaceId: true, userId: true },
    });

    if (!expense) {
      return null;
    }

    return {
      id: expense.id,
      workspaceId: expense.workspaceId,
      userId: expense.userId,
      amount: expense.amount,
    };
  }
}
