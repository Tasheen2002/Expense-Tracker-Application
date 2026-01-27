import { RecurringExpenseRepository } from "../../domain/repositories/recurring-expense.repository";
import {
  RecurringExpense,
  ExpenseTemplate,
} from "../../domain/entities/recurring-expense.entity";
import { RecurrenceFrequency } from "../../domain/enums/recurrence-frequency";
import { RecurrenceStatus } from "../../domain/enums/recurrence-status";
import { ExpenseService } from "./expense.service";
import { PaymentMethod } from "../../domain/enums/payment-method";
import { RecurringExpenseNotFoundError } from "../../domain/errors/expense.errors";

export class RecurringExpenseService {
  constructor(
    private readonly recurringExpenseRepository: RecurringExpenseRepository,
    private readonly expenseService: ExpenseService,
  ) {}

  async createRecurringExpense(params: {
    workspaceId: string;
    userId: string;
    frequency: RecurrenceFrequency;
    interval: number;
    startDate: Date;
    endDate?: Date;
    template: ExpenseTemplate;
  }): Promise<RecurringExpense> {
    const expense = RecurringExpense.create({
      workspaceId: params.workspaceId,
      userId: params.userId,
      frequency: params.frequency,
      interval: params.interval,
      startDate: params.startDate,
      endDate: params.endDate,
      template: params.template,
    });

    await this.recurringExpenseRepository.save(expense);
    return expense;
  }

  async processDueExpenses(limit = 100): Promise<number> {
    const now = new Date();
    const dueExpenses =
      await this.recurringExpenseRepository.findDueExpenses(now);

    let processedCount = 0;

    for (const recurring of dueExpenses) {
      if (processedCount >= limit) break;

      try {
        // 1. Create the real expense
        await this.expenseService.createExpense({
          workspaceId: recurring.workspaceId,
          userId: recurring.userId,
          title: recurring.template.title,
          description: recurring.template.description,
          amount: recurring.template.amount,
          currency: recurring.template.currency,
          expenseDate: recurring.nextRunDate, // The expense date is the scheduled run date
          categoryId: recurring.template.categoryId,
          merchant: recurring.template.merchant,
          paymentMethod:
            (recurring.template.paymentMethod as PaymentMethod) ||
            PaymentMethod.CASH,
          isReimbursable: recurring.template.isReimbursable || false,
          tagIds: recurring.template.tagIds,
        });

        // 2. Advance the schedule
        recurring.markAsRun();

        // 3. Save the new state
        await this.recurringExpenseRepository.save(recurring);

        processedCount++;
      } catch (error) {
        console.error(
          `Failed to process recurring expense ${recurring.id}:`,
          error,
        );
        // Continue with next item, don't block the whole batch
      }
    }

    return processedCount;
  }

  async pauseRecurringExpense(id: string): Promise<void> {
    const expense = await this.recurringExpenseRepository.findById(id);
    if (!expense) throw new RecurringExpenseNotFoundError(id);

    expense.pause();
    await this.recurringExpenseRepository.save(expense);
  }

  async resumeRecurringExpense(id: string): Promise<void> {
    const expense = await this.recurringExpenseRepository.findById(id);
    if (!expense) throw new RecurringExpenseNotFoundError(id);

    expense.resume();
    await this.recurringExpenseRepository.save(expense);
  }

  async stopRecurringExpense(id: string): Promise<void> {
    const expense = await this.recurringExpenseRepository.findById(id);
    if (!expense) throw new RecurringExpenseNotFoundError(id);

    expense.stop();
    await this.recurringExpenseRepository.save(expense);
  }

  async getRecurringExpense(id: string): Promise<RecurringExpense | null> {
    return this.recurringExpenseRepository.findById(id);
  }
}
