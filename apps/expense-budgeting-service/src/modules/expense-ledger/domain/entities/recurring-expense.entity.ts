import { RecurrenceFrequency } from '../enums/recurrence-frequency';
import { RecurrenceStatus } from '../enums/recurrence-status';
import { RecurringExpenseId } from '../value-objects/recurring-expense-id';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { EXPENSE_EVENTS } from '@shared/events/expense-events';
import { InvalidRecurrencePatternError } from '../errors/expense.errors';
import { Decimal } from 'decimal.js';
import { isValidPaymentMethod } from '../enums/payment-method';
import {
  MIN_RECURRENCE_INTERVAL,
  MAX_RECURRENCE_INTERVAL,
  MAX_RECURRENCE_END_DATE_YEARS,
  EXPENSE_TITLE_MIN_LENGTH,
  EXPENSE_TITLE_MAX_LENGTH,
  EXPENSE_DESCRIPTION_MAX_LENGTH,
  EXPENSE_MERCHANT_MAX_LENGTH,
  MIN_EXPENSE_AMOUNT,
  MAX_EXPENSE_AMOUNT,
} from '../constants/expense.constants';
import { VALID_CURRENCIES } from '../value-objects/money';

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
  lastFailureReason?: string;
  lastFailureAt?: string;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
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
  get eventType(): string { return EXPENSE_EVENTS.RECURRING_CREATED; }
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
  get eventType(): string { return EXPENSE_EVENTS.RECURRING_STATUS_CHANGED; }
  getPayload(): Record<string, unknown> {
    return { recurringExpenseId: this.recurringExpenseId, workspaceId: this.workspaceId, newStatus: this.newStatus };
  }
}

/**
 * Maximum consecutive failures before a recurring template is auto-paused.
 * After this many failures, the template transitions to PAUSED to prevent
 * indefinite silent skipping of occurrences.
 */
export const MAX_CONSECUTIVE_FAILURES = 3;

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
  lastFailureReason?: string;
  lastFailureAt?: Date;
  consecutiveFailures?: number;
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
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'nextRunDate'
      | 'status'
      | 'consecutiveFailures'
      | 'lastFailureReason'
      | 'lastFailureAt'
    > & { startDate: Date }
  ): RecurringExpense {
    // Validate startDate
    if (!props.startDate || !(props.startDate instanceof Date) || Number.isNaN(props.startDate.getTime())) {
      throw new InvalidRecurrencePatternError('Start date must be a valid Date');
    }

    // Validate endDate if provided
    if (props.endDate !== undefined && props.endDate !== null) {
      if (!(props.endDate instanceof Date) || Number.isNaN(props.endDate.getTime())) {
        throw new InvalidRecurrencePatternError('End date must be a valid Date');
      }
    }

    // Validate interval
    if (!Number.isInteger(props.interval) || props.interval < MIN_RECURRENCE_INTERVAL || props.interval > MAX_RECURRENCE_INTERVAL) {
      throw new InvalidRecurrencePatternError(
        `Interval must be an integer between ${MIN_RECURRENCE_INTERVAL} and ${MAX_RECURRENCE_INTERVAL}, got ${props.interval}`
      );
    }

    // Validate start/end date ordering
    if (props.endDate && props.endDate <= props.startDate) {
      throw new InvalidRecurrencePatternError(
        'End date must be after start date'
      );
    }

    // Validate max recurrence duration
    if (props.endDate) {
      const maxEndDate = new Date(props.startDate);
      maxEndDate.setFullYear(maxEndDate.getFullYear() + MAX_RECURRENCE_END_DATE_YEARS);
      if (props.endDate > maxEndDate) {
        throw new InvalidRecurrencePatternError(
          `End date cannot exceed ${MAX_RECURRENCE_END_DATE_YEARS} years from start date`
        );
      }
    }

    // Validate template
    RecurringExpense.validateTemplate(props.template);

    const status = RecurrenceStatus.ACTIVE;
    const nextRunDate = new Date(props.startDate.getTime());

    const recurringExpense = new RecurringExpense({
      ...props,
      startDate: new Date(props.startDate.getTime()),
      endDate: props.endDate ? new Date(props.endDate.getTime()) : undefined,
      nextRunDate,
      template: {
        ...props.template,
        tagIds: props.template.tagIds ? [...props.template.tagIds] : undefined,
      },
      id: RecurringExpenseId.create(),
      status,
      lastFailureReason: undefined,
      lastFailureAt: undefined,
      consecutiveFailures: 0,
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

  private static validateTemplate(template: ExpenseTemplate): void {
    if (!template.title || template.title.trim().length < EXPENSE_TITLE_MIN_LENGTH) {
      throw new InvalidRecurrencePatternError('Template title is required');
    }
    if (template.title.length > EXPENSE_TITLE_MAX_LENGTH) {
      throw new InvalidRecurrencePatternError(
        `Template title cannot exceed ${EXPENSE_TITLE_MAX_LENGTH} characters`
      );
    }
    if (typeof template.amount !== 'number' || !isFinite(template.amount) || isNaN(template.amount)) {
      throw new InvalidRecurrencePatternError(
        'Template amount must be a positive finite number'
      );
    }
    if (template.amount < MIN_EXPENSE_AMOUNT || template.amount > MAX_EXPENSE_AMOUNT) {
      throw new InvalidRecurrencePatternError(
        `Template amount must be between ${MIN_EXPENSE_AMOUNT} and ${MAX_EXPENSE_AMOUNT}`
      );
    }
    const dec = new Decimal(template.amount);
    if (dec.decimalPlaces() > 2) {
      throw new InvalidRecurrencePatternError(
        'Template amount cannot have more than 2 decimal places'
      );
    }
    if (!template.currency || !VALID_CURRENCIES.includes(template.currency.toUpperCase())) {
      throw new InvalidRecurrencePatternError(
        `Template currency must be a valid ISO 4217 code`
      );
    }
    if (template.paymentMethod && !isValidPaymentMethod(template.paymentMethod)) {
      throw new InvalidRecurrencePatternError(
        `Invalid payment method: ${template.paymentMethod}`
      );
    }
    if (template.description && template.description.length > EXPENSE_DESCRIPTION_MAX_LENGTH) {
      throw new InvalidRecurrencePatternError(
        `Template description cannot exceed ${EXPENSE_DESCRIPTION_MAX_LENGTH} characters`
      );
    }
    if (template.merchant && template.merchant.length > EXPENSE_MERCHANT_MAX_LENGTH) {
      throw new InvalidRecurrencePatternError(
        `Template merchant cannot exceed ${EXPENSE_MERCHANT_MAX_LENGTH} characters`
      );
    }
  }

  static fromPersistence(props: RecurringExpenseProps): RecurringExpense {
    return new RecurringExpense({
      ...props,
      startDate: new Date(props.startDate.getTime()),
      endDate: props.endDate ? new Date(props.endDate.getTime()) : undefined,
      nextRunDate: new Date(props.nextRunDate.getTime()),
      template: {
        ...props.template,
        tagIds: props.template.tagIds ? [...props.template.tagIds] : undefined,
      },
      lastFailureReason: props.lastFailureReason,
      lastFailureAt: props.lastFailureAt ? new Date(props.lastFailureAt.getTime()) : undefined,
      consecutiveFailures: props.consecutiveFailures ?? 0,
      createdAt: new Date(props.createdAt.getTime()),
      updatedAt: new Date(props.updatedAt.getTime()),
    });
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
    return new Date(this.props.startDate.getTime());
  }
  get endDate(): Date | undefined {
    return this.props.endDate ? new Date(this.props.endDate.getTime()) : undefined;
  }
  get nextRunDate(): Date {
    return new Date(this.props.nextRunDate.getTime());
  }
  get status(): RecurrenceStatus {
    return this.props.status;
  }
  get template(): ExpenseTemplate {
    return {
      ...this.props.template,
      tagIds: this.props.template.tagIds ? [...this.props.template.tagIds] : undefined,
    };
  }
  get lastFailureReason(): string | undefined {
    return this.props.lastFailureReason;
  }
  get lastFailureAt(): Date | undefined {
    return this.props.lastFailureAt ? new Date(this.props.lastFailureAt.getTime()) : undefined;
  }
  get consecutiveFailures(): number {
    return this.props.consecutiveFailures ?? 0;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime());
  }
  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }

  // Logic
  isDue(): boolean {
    const now = new Date();
    return (
      this.props.status === RecurrenceStatus.ACTIVE &&
      this.props.nextRunDate <= now
    );
  }

  /**
   * Advances the schedule to the next run date.
   * Monthly and yearly frequencies clamp the day to the last valid day
   * of the target month to prevent date drift (e.g. Jan 31 → Feb 28, not Mar 3).
   */
  markAsRun(): void {
    if (this.props.status !== RecurrenceStatus.ACTIVE) return;

    const current = this.props.nextRunDate;
    let nextDate: Date;

    switch (this.props.frequency) {
      case RecurrenceFrequency.DAILY:
        nextDate = new Date(current);
        nextDate.setDate(nextDate.getDate() + this.props.interval);
        break;
      case RecurrenceFrequency.WEEKLY:
        nextDate = new Date(current);
        nextDate.setDate(nextDate.getDate() + 7 * this.props.interval);
        break;
      case RecurrenceFrequency.MONTHLY: {
        const targetMonth = current.getMonth() + this.props.interval;
        const targetYear = current.getFullYear() + Math.floor(targetMonth / 12);
        const targetMonthMod = targetMonth % 12;
        // Clamp day to last valid day of target month
        const originalDay = this.props.startDate.getDate();
        const lastDayOfTargetMonth = new Date(targetYear, targetMonthMod + 1, 0).getDate();
        const clampedDay = Math.min(originalDay, lastDayOfTargetMonth);
        nextDate = new Date(targetYear, targetMonthMod, clampedDay,
          current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
        break;
      }
      case RecurrenceFrequency.YEARLY: {
        const yearOffset = this.props.interval;
        const tgtYear = current.getFullYear() + yearOffset;
        const tgtMonth = current.getMonth();
        const origDay = this.props.startDate.getDate();
        const lastDay = new Date(tgtYear, tgtMonth + 1, 0).getDate();
        const clampDay = Math.min(origDay, lastDay);
        nextDate = new Date(tgtYear, tgtMonth, clampDay,
          current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
        break;
      }
    }

    // Clear failure tracking on successful run
    this.props.lastFailureReason = undefined;
    this.props.lastFailureAt = undefined;
    this.props.consecutiveFailures = 0;

    // Check if we passed end date
    if (this.props.endDate && nextDate > this.props.endDate) {
      (this.props as RecurringExpenseProps).status = RecurrenceStatus.COMPLETED;
      (this.props as RecurringExpenseProps).nextRunDate = nextDate;
      this.addDomainEvent(new RecurringExpenseStatusChangedEvent(this.id.getValue(), this.workspaceId, this.props.status));
    } else {
      (this.props as RecurringExpenseProps).nextRunDate = nextDate;
    }

    (this.props as RecurringExpenseProps).updatedAt = new Date();
  }

  /**
   * Records a processing failure for this recurring expense.
   * Advances the schedule (to prevent blocking the batch), records the failure reason
   * and timestamp for user visibility, and increments the consecutive failure counter.
   * After MAX_CONSECUTIVE_FAILURES, the template is auto-paused to prevent indefinite
   * silent skipping of occurrences.
   */
  recordFailure(reason: string): void {
    if (this.props.status !== RecurrenceStatus.ACTIVE) return;

    this.props.lastFailureReason = reason;
    this.props.lastFailureAt = new Date();
    this.props.consecutiveFailures = (this.props.consecutiveFailures || 0) + 1;

    // Advance the schedule so this occurrence doesn't block the batch
    this.advanceSchedule();

    // Auto-pause after too many consecutive failures to surface the problem
    if (this.props.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      this.props.status = RecurrenceStatus.PAUSED;
      this.addDomainEvent(
        new RecurringExpenseStatusChangedEvent(
          this.id.getValue(),
          this.workspaceId,
          this.props.status
        )
      );
    }

    this.props.updatedAt = new Date();
  }

  /**
   * Advances nextRunDate without clearing failure state.
   * Used internally by recordFailure() to move past the failed occurrence.
   */
  private advanceSchedule(): void {
    const current = this.props.nextRunDate;
    let nextDate: Date;

    switch (this.props.frequency) {
      case RecurrenceFrequency.DAILY:
        nextDate = new Date(current);
        nextDate.setDate(nextDate.getDate() + this.props.interval);
        break;
      case RecurrenceFrequency.WEEKLY:
        nextDate = new Date(current);
        nextDate.setDate(nextDate.getDate() + 7 * this.props.interval);
        break;
      case RecurrenceFrequency.MONTHLY: {
        const targetMonth = current.getMonth() + this.props.interval;
        const targetYear = current.getFullYear() + Math.floor(targetMonth / 12);
        const targetMonthMod = targetMonth % 12;
        const originalDay = this.props.startDate.getDate();
        const lastDayOfTargetMonth = new Date(targetYear, targetMonthMod + 1, 0).getDate();
        const clampedDay = Math.min(originalDay, lastDayOfTargetMonth);
        nextDate = new Date(targetYear, targetMonthMod, clampedDay,
          current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
        break;
      }
      case RecurrenceFrequency.YEARLY: {
        const yearOffset = this.props.interval;
        const tgtYear = current.getFullYear() + yearOffset;
        const tgtMonth = current.getMonth();
        const origDay = this.props.startDate.getDate();
        const lastDay = new Date(tgtYear, tgtMonth + 1, 0).getDate();
        const clampDay = Math.min(origDay, lastDay);
        nextDate = new Date(tgtYear, tgtMonth, clampDay,
          current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
        break;
      }
    }

    if (this.props.endDate && nextDate > this.props.endDate) {
      this.props.status = RecurrenceStatus.COMPLETED;
      this.props.nextRunDate = nextDate;
      this.addDomainEvent(
        new RecurringExpenseStatusChangedEvent(
          this.id.getValue(),
          this.workspaceId,
          this.props.status
        )
      );
    } else {
      this.props.nextRunDate = nextDate;
    }
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

  static toDTO(expense: RecurringExpense): RecurringExpenseDTO {
    return {
      id: expense.id.getValue(),
      workspaceId: expense.workspaceId,
      userId: expense.userId,
      frequency: expense.frequency,
      interval: expense.interval,
      startDate: expense.startDate.toISOString(),
      endDate: expense.endDate?.toISOString(),
      nextRunDate: expense.nextRunDate.toISOString(),
      status: expense.status,
      template: expense.template,
      lastFailureReason: expense.lastFailureReason,
      lastFailureAt: expense.lastFailureAt?.toISOString(),
      consecutiveFailures: expense.consecutiveFailures,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }
}
