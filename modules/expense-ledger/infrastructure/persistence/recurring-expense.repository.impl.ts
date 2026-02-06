import { PrismaClient, Prisma } from "@prisma/client";
import { RecurringExpenseRepository } from "../../domain/repositories/recurring-expense.repository";
import {
  RecurringExpense,
  ExpenseTemplate,
} from "../../domain/entities/recurring-expense.entity";
import { RecurrenceFrequency } from "../../domain/enums/recurrence-frequency";
import { RecurrenceStatus } from "../../domain/enums/recurrence-status";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

export class PrismaRecurringExpenseRepository implements RecurringExpenseRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: IEventBus,
  ) {}

  async save(expense: RecurringExpense): Promise<void> {
    await this.prisma.recurringExpense.upsert({
      where: { id: expense.id },
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
        id: expense.id,
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

    // NOTE: RecurringExpense does not extend AggregateRoot - no domain events to dispatch
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
      id: data.id,
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
