import { RecurrenceFrequency } from '../enums/recurrence-frequency';
import { RecurrenceStatus } from '../enums/recurrence-status';
import { RecurringExpenseId } from '../value-objects/recurring-expense-id';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../apps/api/src/shared/domain/events';

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

export class RecurringExpenseCreatedEvent extends DomainEvent {
  constructor(
    public readonly recurringExpenseId: string,
    public readonly workspaceId: string,
    public readonly frequency: string,
    public readonly templateTitle: string
  ) {
    super(recurringExpenseId, 'RecurringExpense');
  }
  get eventType(): string { return 'recurring_expense.created'; }
  getPayload(): Record<string, unknown> {
    return { recurringExpenseId: this.recurringExpenseId, workspaceId: this.workspaceId, frequency: this.frequency, templateTitle: this.templateTitle };
  }
}

export class RecurringExpenseStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly recurringExpenseId: string,
    public readonly workspaceId: string,
    public readonly newStatus: string
  ) {
    super(recurringExpenseId, 'RecurringExpense');
  }
  get eventType(): string { return 'recurring_expense.status_changed'; }
  getPayload(): Record<string, unknown> {
    return { recurringExpenseId: this.recurringExpenseId, workspaceId: this.workspaceId, newStatus: this.newStatus };
  }
}

export interface RecurringExpenseProps {
  id: RecurringExpenseId;
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

export class RecurringExpense extends AggregateRoot {
  private readonly props: RecurringExpenseProps;

  private constructor(props: RecurringExpenseProps) {
    super();
    this.props = props;
  }

  static create(
    props: Omit<
      RecurringExpenseProps,
      'id' | 'createdAt' | 'updatedAt' | 'nextRunDate' | 'status'
    > & { startDate: Date }
  ): RecurringExpense {
    const status = RecurrenceStatus.ACTIVE;
    const nextRunDate = new Date(props.startDate);

    const recurringExpense = new RecurringExpense({
      ...props,
      id: RecurringExpenseId.create(),
      nextRunDate,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    recurringExpense.addDomainEvent(
      new RecurringExpenseCreatedEvent(
        recurringExpense.id.getValue(),
        recurringExpense.workspaceId,
        recurringExpense.frequency,
        recurringExpense.template.title
      )
    );

    return recurringExpense;
  }

  static fromPersistence(props: RecurringExpenseProps): RecurringExpense {
    return new RecurringExpense(props);
  }

  // Getters
  get id(): RecurringExpenseId {
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
      this.addDomainEvent(new RecurringExpenseStatusChangedEvent(this.id.getValue(), this.workspaceId, this.props.status));
    }
  }

  resume(): void {
    if (this.props.status === RecurrenceStatus.PAUSED) {
      this.props.status = RecurrenceStatus.ACTIVE;
      this.props.updatedAt = new Date();
      this.addDomainEvent(new RecurringExpenseStatusChangedEvent(this.id.getValue(), this.workspaceId, this.props.status));
    }
  }

  stop(): void {
    this.props.status = RecurrenceStatus.COMPLETED;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new RecurringExpenseStatusChangedEvent(this.id.getValue(), this.workspaceId, this.props.status));
  }

  toJSON(): RecurringExpenseDTO {
    return {
      id: this.id.getValue(),
      workspaceId: this.workspaceId,
      userId: this.userId,
      frequency: this.frequency,
      interval: this.interval,
      startDate: this.startDate.toISOString(),
      endDate: this.endDate?.toISOString(),
      nextRunDate: this.nextRunDate.toISOString(),
      status: this.status,
      template: this.template,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

export interface RecurringExpenseDTO {
  id: string;
  workspaceId: string;
  userId: string;
  frequency: string;
  interval: number;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  status: string;
  template: ExpenseTemplate;
  createdAt: string;
  updatedAt: string;
}
