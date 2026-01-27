import { PrismaClient, Prisma } from "@prisma/client";
import { RecurringExpenseRepository } from "../../domain/repositories/recurring-expense.repository";
import {
  RecurringExpense,
  ExpenseTemplate,
} from "../../domain/entities/recurring-expense.entity";
import { RecurrenceFrequency } from "../../domain/enums/recurrence-frequency";
import { RecurrenceStatus } from "../../domain/enums/recurrence-status";

export class PrismaRecurringExpenseRepository implements RecurringExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

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
  }

  async findById(id: string): Promise<RecurringExpense | null> {
    const data = await this.prisma.recurringExpense.findUnique({
      where: { id },
    });

    if (!data) return null;

    return this.toDomain(data);
  }

  async findDueExpenses(beforeDate: Date): Promise<RecurringExpense[]> {
    const data = await this.prisma.recurringExpense.findMany({
      where: {
        status: RecurrenceStatus.ACTIVE,
        nextRunDate: {
          lte: beforeDate,
        },
      },
    });

    return data.map((item: any) => this.toDomain(item));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recurringExpense.delete({
      where: { id },
    });
  }

  private toDomain(data: any): RecurringExpense {
    const template: ExpenseTemplate =
      data.template as unknown as ExpenseTemplate;

    return RecurringExpense.fromPersistence({
      id: data.id,
      workspaceId: data.workspaceId,
      userId: data.userId,
      frequency: data.frequency as RecurrenceFrequency,
      interval: data.interval,
      startDate: data.startDate,
      endDate: data.endDate,
      nextRunDate: data.nextRunDate,
      status: data.status as RecurrenceStatus,
      template: template,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
