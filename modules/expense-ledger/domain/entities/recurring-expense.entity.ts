import { RecurrenceFrequency } from "../enums/recurrence-frequency";
import { RecurrenceStatus } from "../enums/recurrence-status";
import { ExpenseId } from "../value-objects/expense-id";
import { Money } from "../value-objects/money"; // Assuming Money is reusable or we use raw values in template
// We might need to handle the template structure carefully.
// For now, let's treat the template as a plain object or interface.

export interface ExpenseTemplate {
  title: string;
  description?: string;
  amount: number;
  currency: string;
  categoryId?: string;
  merchant?: string;
  paymentMethod?: string;
  isReimbursable?: boolean;
  tagIds?: string[];
}

export interface RecurringExpenseProps {
  id: string;
  workspaceId: string;
  userId: string;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: Date;
  endDate?: Date;
  nextRunDate: Date;
  status: RecurrenceStatus;
  template: ExpenseTemplate;
  createdAt: Date;
  updatedAt: Date;
}

export class RecurringExpense {
  private readonly props: RecurringExpenseProps;

  private constructor(props: RecurringExpenseProps) {
    this.props = props;
  }

  static create(
    props: Omit<
      RecurringExpenseProps,
      "id" | "createdAt" | "updatedAt" | "nextRunDate" | "status"
    > & { startDate: Date },
  ): RecurringExpense {
    const status = RecurrenceStatus.ACTIVE;
    // Initial nextRunDate is usually start date or calculated from it
    // If startDate is in the past, nextRunDate should probably be today or next interval
    // For simplicity, let's assume startDate is the first run date
    const nextRunDate = new Date(props.startDate);

    return new RecurringExpense({
      ...props,
      id: crypto.randomUUID(),
      nextRunDate,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: RecurringExpenseProps): RecurringExpense {
    return new RecurringExpense(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }
  get workspaceId(): string {
    return this.props.workspaceId;
  }
  get userId(): string {
    return this.props.userId;
  }
  get frequency(): RecurrenceFrequency {
    return this.props.frequency;
  }
  get interval(): number {
    return this.props.interval;
  }
  get startDate(): Date {
    return this.props.startDate;
  }
  get endDate(): Date | undefined {
    return this.props.endDate;
  }
  get nextRunDate(): Date {
    return this.props.nextRunDate;
  }
  get status(): RecurrenceStatus {
    return this.props.status;
  }
  get template(): ExpenseTemplate {
    return this.props.template;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Logic
  isDue(): boolean {
    const now = new Date();
    return (
      this.props.status === RecurrenceStatus.ACTIVE &&
      this.props.nextRunDate <= now
    );
  }

  markAsRun(): void {
    if (this.props.status !== RecurrenceStatus.ACTIVE) return;

    // Calculate next run date
    const nextDate = new Date(this.props.nextRunDate);

    switch (this.props.frequency) {
      case RecurrenceFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + this.props.interval);
        break;
      case RecurrenceFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7 * this.props.interval);
        break;
      case RecurrenceFrequency.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + this.props.interval);
        break;
      case RecurrenceFrequency.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + this.props.interval);
        break;
    }

    // Check if we passed end date
    if (this.props.endDate && nextDate > this.props.endDate) {
      this.props.status = RecurrenceStatus.COMPLETED;
      this.props.nextRunDate = nextDate; // Keep it for record, but status is completed
    } else {
      this.props.nextRunDate = nextDate;
    }

    this.props.updatedAt = new Date();
  }

  pause(): void {
    if (this.props.status === RecurrenceStatus.ACTIVE) {
      this.props.status = RecurrenceStatus.PAUSED;
      this.props.updatedAt = new Date();
    }
  }

  resume(): void {
    if (this.props.status === RecurrenceStatus.PAUSED) {
      this.props.status = RecurrenceStatus.ACTIVE;

      // If nextRunDate is in the past, we might want to skip missed runs or process them immediately
      // For this MVP, let's just make sure nextRunDate is at least today if it was way in the past?
      // Or we just let it be processed immediately. Let's start with simple logic.
      this.props.updatedAt = new Date();
    }
  }

  stop(): void {
    this.props.status = RecurrenceStatus.COMPLETED;
    this.props.updatedAt = new Date();
  }
}
