import { PrismaClient, Prisma } from "@prisma/client";
import { RecurringExpenseRepository } from "../../domain/repositories/recurring-expense.repository";
import {
  RecurringExpense,
  ExpenseTemplate,
} from "../../domain/entities/recurring-expense.entity";
import { RecurringExpenseId } from "../../domain/value-objects/recurring-expense-id";
import { RecurrenceFrequency } from "../../domain/enums/recurrence-frequency";
import { RecurrenceStatus } from "../../domain/enums/recurrence-status";
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class PrismaRecurringExpenseRepository
  extends PrismaRepository<RecurringExpense>
  implements RecurringExpenseRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(expense: RecurringExpense): Promise<void> {
    await this.prisma.recurringExpense.upsert({
      where: { id: expense.id.getValue() },
      update: {
        frequency: expense.frequency,
        interval: expense.interval,
        startDate: expense.startDate,
        endDate: expense.endDate,
        nextRunDate: expense.nextRunDate,
        status: expense.status,
        template: expense.template as unknown as Prisma.InputJsonValue,
        updatedAt: expense.updatedAt,
      },
      create: {
        id: expense.id.getValue(),
        workspaceId: expense.workspaceId,
        userId: expense.userId,
        frequency: expense.frequency,
        interval: expense.interval,
        startDate: expense.startDate,
        endDate: expense.endDate,
        nextRunDate: expense.nextRunDate,
        status: expense.status,
        template: expense.template as unknown as Prisma.InputJsonValue,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      },
    });

    await this.dispatchEvents(expense);
  }

  async findById(id: string): Promise<RecurringExpense | null> {
    const data = await this.prisma.recurringExpense.findUnique({
      where: { id },
    });

    if (!data) return null;

    return this.toDomain(data);
  }

  async findDueExpenses(
    beforeDate: Date,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<RecurringExpense>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.recurringExpense,
      {
        where: {
          status: RecurrenceStatus.ACTIVE,
          nextRunDate: {
            lte: beforeDate,
          },
        },
        orderBy: { nextRunDate: "asc" },
      },
      (expense) => this.toDomain(expense),
      options,
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recurringExpense.delete({
      where: { id },
    });
  }

  private toDomain(
    data: Prisma.RecurringExpenseGetPayload<{}>,
  ): RecurringExpense {
    const template: ExpenseTemplate =
      data.template as unknown as ExpenseTemplate;

    return RecurringExpense.fromPersistence({
      id: RecurringExpenseId.fromString(data.id),
      workspaceId: data.workspaceId,
      userId: data.userId,
      frequency: data.frequency as RecurrenceFrequency,
      interval: data.interval,
      startDate: data.startDate,
      endDate: data.endDate ?? undefined,
      nextRunDate: data.nextRunDate,
      status: data.status as RecurrenceStatus,
      template: template,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
