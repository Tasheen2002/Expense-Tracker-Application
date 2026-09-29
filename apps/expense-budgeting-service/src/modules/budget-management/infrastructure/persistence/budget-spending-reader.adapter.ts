import { PrismaClient } from '@prisma/client';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { IBudgetSpendingReader } from '../../application/ports/budget-spending-reader.port';
import { Budget } from '../../domain/entities/budget.entity';

export class PrismaBudgetSpendingReader implements IBudgetSpendingReader {
  constructor(private readonly prisma: PrismaClient) {}

  async total(budget: Budget, categoryId: string | null): Promise<string> {
    const result = await PrismaUnitOfWork.getClient(this.prisma).expense.aggregate({
      where: {
        workspaceId: budget.workspaceId,
        categoryId,
        currency: budget.currency,
        status: { in: ['APPROVED', 'REIMBURSED'] },
        expenseDate: { gte: budget.period.startDate, lte: budget.period.endDate },
      },
      _sum: { amount: true },
    });
    return result._sum.amount?.toString() ?? '0';
  }
}
