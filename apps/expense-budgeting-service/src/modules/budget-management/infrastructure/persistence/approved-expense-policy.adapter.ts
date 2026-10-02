import { Prisma, PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import { IApprovedExpensePolicy } from '../../../expense-ledger/application/ports/approved-expense-policy.port';
import { Expense } from '../../../expense-ledger/domain/entities/expense.entity';
import { ExpenseStatus } from '../../../expense-ledger/domain/enums/expense-status';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import { BudgetService } from '../../application/services/budget.service';
import { SpendingLimitService } from '../../application/services/spending-limit.service';
import { SpendingLimitExceededError } from '../../domain/errors/budget.errors';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';
import { BudgetStatus } from '../../domain/enums/budget-status';
import { IWorkspaceAccountingLock } from '../../application/ports/workspace-accounting-lock.port';

const countedStatuses = [ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED];

function periodBounds(date: Date, type: BudgetPeriodType): { start: Date; end: Date } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const firstMonth = type === BudgetPeriodType.YEARLY ? 0 :
    type === BudgetPeriodType.QUARTERLY ? Math.floor(month / 3) * 3 : month;
  const months = type === BudgetPeriodType.YEARLY ? 12 :
    type === BudgetPeriodType.QUARTERLY ? 3 : 1;
  return {
    start: new Date(Date.UTC(year, firstMonth, 1)),
    end: new Date(Date.UTC(year, firstMonth + months, 1)),
  };
}

/** Runs inside the same unit of work as the expense approval. */
export class ApprovedExpensePolicyAdapter implements IApprovedExpensePolicy {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly budgets: BudgetService,
    private readonly limits: SpendingLimitService,
    private readonly accountingLock: IWorkspaceAccountingLock
  ) {}

  private get client(): PrismaClient | Prisma.TransactionClient {
    return PrismaUnitOfWork.getClient(this.prisma);
  }

  async validate(expense: Expense): Promise<void> {
    await this.accountingLock.acquire(expense.workspaceId);
    const categoryId = expense.categoryId?.getValue();
    const applicable = await this.limits.getApplicableLimits(
      expense.workspaceId, expense.userId, categoryId
    );
    const matching = applicable.filter((limit) =>
      limit.currency === expense.amount.getCurrency() && limit.appliesTo(expense.userId, categoryId)
    ).sort((a, b) => a.id.getValue().localeCompare(b.id.getValue()));

    for (const limit of matching) {
      const { start, end } = periodBounds(expense.expenseDate.getValue(), limit.periodType);
      const aggregate = await this.client.expense.aggregate({
        where: {
          workspaceId: expense.workspaceId,
          currency: limit.currency,
          status: { in: countedStatuses },
          expenseDate: { gte: start, lt: end },
          ...(limit.userId ? { userId: limit.userId } : {}),
          ...(limit.categoryId ? { categoryId: limit.categoryId } : {}),
          id: { not: expense.id.getValue() },
        },
        _sum: { amount: true },
      });
      const proposed = new Decimal(aggregate._sum.amount?.toString() ?? '0')
        .add(expense.amount.getAmount().toString());
      if (proposed.greaterThan(limit.limitAmount)) {
        throw new SpendingLimitExceededError(limit.limitAmount.toNumber(), proposed.toNumber());
      }
    }
  }

  async synchronize(expense: Expense): Promise<void> {
    const date = expense.expenseDate.getValue();
    const budgets = await this.client.budget.findMany({
      where: {
        workspaceId: expense.workspaceId,
        currency: expense.amount.getCurrency(),
        status: { in: [BudgetStatus.ACTIVE, BudgetStatus.EXCEEDED] },
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: { id: true, startDate: true, endDate: true },
      orderBy: { id: 'asc' },
    });
    for (const budget of budgets) {
      const allocations = await this.client.budgetAllocation.findMany({
        where: { budgetId: budget.id, categoryId: expense.categoryId?.getValue() ?? null },
        select: { id: true, categoryId: true },
        orderBy: { id: 'asc' },
      });
      for (const allocation of allocations) {
        const total = await this.client.expense.aggregate({
          where: {
            workspaceId: expense.workspaceId,
            currency: expense.amount.getCurrency(),
            categoryId: allocation.categoryId,
            status: { in: countedStatuses },
            expenseDate: { gte: budget.startDate, lte: budget.endDate },
          },
          _sum: { amount: true },
        });
        await this.budgets.updateAllocationSpent(allocation.id, total._sum.amount?.toString() ?? '0');
      }
    }
  }
}
