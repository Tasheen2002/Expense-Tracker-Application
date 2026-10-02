import { ExpenseId } from '../value-objects/expense-id';
import { CategoryId } from '../value-objects/category-id';
import { TagId } from '../value-objects/tag-id';
import { AttachmentId } from '../value-objects/attachment-id';
import { Money } from '../value-objects/money';
import { ExpenseDate } from '../value-objects/expense-date';
import { PaymentMethod } from '../enums/payment-method';
import { ExpenseStatus, canTransitionTo } from '../enums/expense-status';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { EXPENSE_EVENTS } from '@shared/events/expense-events';
import {
  EXPENSE_TITLE_MAX_LENGTH,
  EXPENSE_DESCRIPTION_MAX_LENGTH,
  EXPENSE_MERCHANT_MAX_LENGTH,
  MIN_EXPENSE_AMOUNT,
  MAX_EXPENSE_AMOUNT,
} from '../constants/expense.constants';
import { ValueOutOfRangeError } from '@shared/domain/errors/domain-validation.errors';
import {
  ExpenseTitleRequiredError,
  ExpenseTitleTooLongError,
  ExpenseDescriptionTooLongError,
  MerchantNameTooLongError,
  InvalidExpenseStatusError,
  NonReimbursableError,
  ExpenseConcurrencyConflictError,
} from '../errors/expense.errors';

export interface ExpenseDTO {
  expenseId: string;
  workspaceId: string;
  userId: string;
  title: string;
  description?: string;
  amount: string;
  currency: string;
  expenseDate: string;
  categoryId?: string;
  merchant?: string;
  paymentMethod: PaymentMethod;
  isReimbursable: boolean;
  status: ExpenseStatus;
  version: number;
  tagIds: string[];
  attachmentIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Emitted when a new expense is created.
 */
export class ExpenseCreatedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly title: string
  ) {
    super(expenseId, 'Expense');
  }

  get eventType(): string {
    return EXPENSE_EVENTS.EXPENSE_CREATED;
  }

  getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      userId: this.userId,
      amount: this.amount,
      currency: this.currency,
      title: this.title,
    };
  }
}

/**
 * Emitted when an expense is submitted for approval.
 */
export class ExpenseSubmittedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly submittedBy: string,
    public readonly amount: number,
    public readonly currency: string
  ) {
    super(expenseId, 'Expense');
  }

  get eventType(): string {
    return EXPENSE_EVENTS.EXPENSE_SUBMITTED;
  }

  getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      submittedBy: this.submittedBy,
      amount: this.amount,
      currency: this.currency,
    };
  }
}

/**
 * Emitted when an expense is approved.
 */
export class ExpenseApprovedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly approvedBy: string,
    public readonly amount: number,
    public readonly currency: string
  ) {
    super(expenseId, 'Expense');
  }

  get eventType(): string {
    return EXPENSE_EVENTS.EXPENSE_APPROVED;
  }

  getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      approvedBy: this.approvedBy,
      amount: this.amount,
      currency: this.currency,
    };
  }
}

/**
 * Emitted when an expense is rejected.
 */
export class ExpenseRejectedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly rejectedBy: string,
    public readonly reason?: string
  ) {
    super(expenseId, 'Expense');
  }

  get eventType(): string {
    return EXPENSE_EVENTS.EXPENSE_REJECTED;
  }

  getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      rejectedBy: this.rejectedBy,
      reason: this.reason,
    };
  }
}

/**
 * Emitted when an expense is reimbursed.
 */
export class ExpenseReimbursedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly currency: string
  ) {
    super(expenseId, 'Expense');
  }

  get eventType(): string {
    return EXPENSE_EVENTS.EXPENSE_REIMBURSED;
  }

  getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      userId: this.userId,
      amount: this.amount,
      currency: this.currency,
    };
  }
}

/**
 * Emitted when an expense status changes.
 */
export class ExpenseStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
    public readonly changedBy: string = 'system',
    public readonly expenseOwnerId: string
  ) {
    super(expenseId, 'Expense');
  }

  get eventType(): string {
    return EXPENSE_EVENTS.EXPENSE_STATUS_CHANGED;
  }

  getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      oldStatus: this.oldStatus,
      newStatus: this.newStatus,
      changedBy: this.changedBy,
      expenseOwnerId: this.expenseOwnerId,
    };
  }
}

/**
 * Emitted when an expense is deleted.
 */
export class ExpenseDeletedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string
  ) {
    super(expenseId, 'Expense');
  }

  get eventType(): string {
    return EXPENSE_EVENTS.EXPENSE_DELETED;
  }

  getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
    };
  }
}

/**
 * Emitted when an attachment is added to an expense.
 */
export class AttachmentAddedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly attachmentId: string
  ) {
    super(expenseId, 'Expense');
  }

  get eventType(): string {
    return EXPENSE_EVENTS.ATTACHMENT_ADDED;
  }

  getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      attachmentId: this.attachmentId,
    };
  }
}

/**
 * Emitted when an attachment is removed from an expense.
 */
export class AttachmentRemovedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly attachmentId: string
  ) {
    super(expenseId, 'Expense');
  }

  get eventType(): string {
    return EXPENSE_EVENTS.ATTACHMENT_REMOVED;
  }

  getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      attachmentId: this.attachmentId,
    };
  }
}

/**
 * Emitted when a settlement payment is recorded against an expense split.
 */
export class SettlementRecordedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly settlementId: string
  ) {
    super(expenseId, 'Expense');
  }

  get eventType(): string {
    return EXPENSE_EVENTS.SETTLEMENT_RECORDED;
  }

  getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      settlementId: this.settlementId,
    };
  }
}

/**
 * Emitted when one or more fields of an expense are updated.
 */
export class ExpenseUpdatedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly updatedFields: string[]
  ) {
    super(expenseId, 'Expense');
  }

  get eventType(): string {
    return EXPENSE_EVENTS.EXPENSE_UPDATED;
  }

  getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      updatedFields: this.updatedFields,
    };
  }
}

// ============================================================================
// ENTITY
// ============================================================================

export interface ExpenseProps {
  id: ExpenseId;
  workspaceId: string;
  userId: string;
  title: string;
  description?: string;
  amount: Money;
  expenseDate: ExpenseDate;
  categoryId?: CategoryId;
  merchant?: string;
  paymentMethod: PaymentMethod;
  isReimbursable: boolean;
  status: ExpenseStatus;
  version: number;
  tagIds: TagId[];
  attachmentIds: AttachmentId[];
  createdAt: Date;
  updatedAt: Date;
}



export type CreateExpenseProps = Omit<
  ExpenseProps,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'tagIds' | 'attachmentIds' | 'version'
> & {
  id?: ExpenseId;
  tagIds?: TagId[];
  attachmentIds?: AttachmentId[];
  version?: number;
};

export class Expense extends AggregateRoot {
  private readonly props: ExpenseProps;

  private constructor(props: ExpenseProps) {
    super();
    this.props = props;
  }

  static create(props: CreateExpenseProps): Expense {
    this.validateTitle(props.title);
    this.validateDescription(props.description);
    this.validateMerchant(props.merchant);
    this.validateAmount(props.amount);

    const expense = new Expense({
      ...props,
      tagIds: props.tagIds ? [...props.tagIds] : [],
      attachmentIds: props.attachmentIds ? [...props.attachmentIds] : [],
      id: props.id ?? ExpenseId.create(),
      status: ExpenseStatus.DRAFT,
      version: props.version ?? 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expense.addDomainEvent(
      new ExpenseCreatedEvent(
        expense.id.getValue(),
        expense.workspaceId,
        expense.userId,
        expense.amount.getAmount().toNumber(),
        expense.amount.getCurrency(),
        expense.title
      )
    );

    return expense;
  }

  static fromPersistence(props: ExpenseProps): Expense {
    return new Expense({
      ...props,
      version: props.version ?? 1,
      tagIds: props.tagIds ? [...props.tagIds] : [],
      attachmentIds: props.attachmentIds ? [...props.attachmentIds] : [],
    });
  }

  // Validation methods
  private static validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new ExpenseTitleRequiredError();
    }
    if (title.length > EXPENSE_TITLE_MAX_LENGTH) {
      throw new ExpenseTitleTooLongError(EXPENSE_TITLE_MAX_LENGTH);
    }
  }

  private static validateDescription(description?: string): void {
    if (description && description.length > EXPENSE_DESCRIPTION_MAX_LENGTH) {
      throw new ExpenseDescriptionTooLongError(EXPENSE_DESCRIPTION_MAX_LENGTH);
    }
  }

  private static validateMerchant(merchant?: string): void {
    if (merchant && merchant.length > EXPENSE_MERCHANT_MAX_LENGTH) {
      throw new MerchantNameTooLongError(EXPENSE_MERCHANT_MAX_LENGTH);
    }
  }

  private static validateAmount(amount: Money): void {
    const value = amount.getAmount().toNumber();
    if (value < MIN_EXPENSE_AMOUNT || value > MAX_EXPENSE_AMOUNT) {
      throw new ValueOutOfRangeError(
        'amount',
        `Expense amount must be between ${MIN_EXPENSE_AMOUNT} and ${MAX_EXPENSE_AMOUNT}, got ${value}`
      );
    }
  }

  // Getters
  get id(): ExpenseId {
    return this.props.id;
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get expenseDate(): ExpenseDate {
    return this.props.expenseDate;
  }

  get categoryId(): CategoryId | undefined {
    return this.props.categoryId;
  }

  get merchant(): string | undefined {
    return this.props.merchant;
  }

  get paymentMethod(): PaymentMethod {
    return this.props.paymentMethod;
  }

  get isReimbursable(): boolean {
    return this.props.isReimbursable;
  }

  get status(): ExpenseStatus {
    return this.props.status;
  }

  get tagIds(): TagId[] {
    return [...this.props.tagIds];
  }

  get attachmentIds(): AttachmentId[] {
    return [...this.props.attachmentIds];
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime());
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }

  get version(): number {
    return this.props.version;
  }

  synchronizeVersion(newVersion: number): void {
    if (
      !Number.isInteger(newVersion) ||
      newVersion !== this.props.version + 1
    ) {
      throw new ExpenseConcurrencyConflictError(this.id.getValue());
    }
    this.props.version = newVersion;
  }

  // Business logic methods
  updateTitle(title: string): void {
    Expense.validateTitle(title);
    this.props.title = title;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ExpenseUpdatedEvent(this.id.getValue(), this.workspaceId, ['title']));
  }

  updateDescription(description?: string | null): void {
    if (description) {
      Expense.validateDescription(description);
    }
    this.props.description = description || undefined;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ExpenseUpdatedEvent(this.id.getValue(), this.workspaceId, ['description']));
  }

  updateAmount(amount: Money): void {
    Expense.validateAmount(amount);
    this.props.amount = amount;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ExpenseUpdatedEvent(this.id.getValue(), this.workspaceId, ['amount']));
  }

  updateExpenseDate(expenseDate: ExpenseDate): void {
    this.props.expenseDate = expenseDate;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ExpenseUpdatedEvent(this.id.getValue(), this.workspaceId, ['expenseDate']));
  }

  updateCategory(categoryId?: CategoryId): void {
    this.props.categoryId = categoryId;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ExpenseUpdatedEvent(this.id.getValue(), this.workspaceId, ['categoryId']));
  }

  updateMerchant(merchant?: string | null): void {
    if (merchant) {
      Expense.validateMerchant(merchant);
    }
    this.props.merchant = merchant || undefined;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ExpenseUpdatedEvent(this.id.getValue(), this.workspaceId, ['merchant']));
  }

  updatePaymentMethod(paymentMethod: PaymentMethod): void {
    this.props.paymentMethod = paymentMethod;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ExpenseUpdatedEvent(this.id.getValue(), this.workspaceId, ['paymentMethod']));
  }

  setReimbursable(isReimbursable: boolean): void {
    this.props.isReimbursable = isReimbursable;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ExpenseUpdatedEvent(this.id.getValue(), this.workspaceId, ['isReimbursable']));
  }

  // Tag management
  addTag(tagId: TagId): void {
    if (!this.hasTag(tagId)) {
      this.props.tagIds.push(tagId);
      this.props.updatedAt = new Date();
    }
  }

  removeTag(tagId: TagId): void {
    const index = this.props.tagIds.findIndex((id) => id.equals(tagId));
    if (index !== -1) {
      this.props.tagIds.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  hasTag(tagId: TagId): boolean {
    return this.props.tagIds.some((id) => id.equals(tagId));
  }

  // Attachment management
  addAttachment(attachmentId: AttachmentId): void {
    if (!this.hasAttachment(attachmentId)) {
      this.props.attachmentIds.push(attachmentId);
      this.props.updatedAt = new Date();
      this.addDomainEvent(
        new AttachmentAddedEvent(
          this.id.getValue(),
          this.workspaceId,
          attachmentId.getValue()
        )
      );
    }
  }

  removeAttachment(attachmentId: AttachmentId): void {
    const index = this.props.attachmentIds.findIndex((id) =>
      id.equals(attachmentId)
    );
    if (index !== -1) {
      this.props.attachmentIds.splice(index, 1);
      this.props.updatedAt = new Date();
      this.addDomainEvent(
        new AttachmentRemovedEvent(
          this.id.getValue(),
          this.workspaceId,
          attachmentId.getValue()
        )
      );
    }
  }

  hasAttachment(attachmentId: AttachmentId): boolean {
    return this.props.attachmentIds.some((id) => id.equals(attachmentId));
  }

  // Status transition methods
  canTransitionToStatus(newStatus: ExpenseStatus): boolean {
    return canTransitionTo(this.props.status, newStatus);
  }

  private transitionToStatus(newStatus: ExpenseStatus): void {
    if (!this.canTransitionToStatus(newStatus)) {
      throw new InvalidExpenseStatusError(
        this.id.getValue(),
        this.props.status,
        `transition to ${newStatus}`
      );
    }
    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  submit(userId: string): void {
    if (this.props.status !== ExpenseStatus.DRAFT) {
      throw new InvalidExpenseStatusError(
        this.id.getValue(),
        this.props.status,
        'submit'
      );
    }
    const oldStatus = this.props.status;
    this.transitionToStatus(ExpenseStatus.SUBMITTED);

    this.addDomainEvent(
      new ExpenseSubmittedEvent(
        this.id.getValue(),
        this.workspaceId,
        userId,
        this.props.amount.getAmount().toNumber(),
        this.props.amount.getCurrency()
      )
    );
    this.addDomainEvent(
      new ExpenseStatusChangedEvent(
        this.id.getValue(),
        this.workspaceId,
        oldStatus,
        ExpenseStatus.SUBMITTED,
        userId,
        this.props.userId
      )
    );
  }

  approve(userId: string): void {
    if (this.props.status !== ExpenseStatus.SUBMITTED) {
      throw new InvalidExpenseStatusError(
        this.id.getValue(),
        this.props.status,
        'approve'
      );
    }
    const oldStatus = this.props.status;
    this.transitionToStatus(ExpenseStatus.APPROVED);

    this.addDomainEvent(
      new ExpenseApprovedEvent(
        this.id.getValue(),
        this.workspaceId,
        userId,
        this.props.amount.getAmount().toNumber(),
        this.props.amount.getCurrency()
      )
    );
    this.addDomainEvent(
      new ExpenseStatusChangedEvent(
        this.id.getValue(),
        this.workspaceId,
        oldStatus,
        ExpenseStatus.APPROVED,
        userId,
        this.props.userId
      )
    );
  }

  reject(userId: string, reason?: string): void {
    if (this.props.status !== ExpenseStatus.SUBMITTED) {
      throw new InvalidExpenseStatusError(
        this.id.getValue(),
        this.props.status,
        'reject'
      );
    }
    const oldStatus = this.props.status;
    this.transitionToStatus(ExpenseStatus.REJECTED);

    this.addDomainEvent(
      new ExpenseRejectedEvent(
        this.id.getValue(),
        this.workspaceId,
        userId,
        reason
      )
    );
    this.addDomainEvent(
      new ExpenseStatusChangedEvent(
        this.id.getValue(),
        this.workspaceId,
        oldStatus,
        ExpenseStatus.REJECTED,
        userId,
        this.props.userId
      )
    );
  }

  revertToDraft(userId: string): void {
    if (
      this.props.status !== ExpenseStatus.SUBMITTED &&
      this.props.status !== ExpenseStatus.REJECTED
    ) {
      throw new InvalidExpenseStatusError(
        this.id.getValue(),
        this.props.status,
        'revert to draft'
      );
    }
    const oldStatus = this.props.status;
    this.transitionToStatus(ExpenseStatus.DRAFT);

    this.addDomainEvent(
      new ExpenseStatusChangedEvent(
        this.id.getValue(),
        this.workspaceId,
        oldStatus,
        ExpenseStatus.DRAFT,
        userId,
        this.props.userId
      )
    );
  }

  markAsReimbursed(userId: string): void {
    if (this.props.status !== ExpenseStatus.APPROVED) {
      throw new InvalidExpenseStatusError(
        this.id.getValue(),
        this.props.status,
        'mark as reimbursed'
      );
    }
    if (!this.props.isReimbursable) {
      throw new NonReimbursableError(this.id.getValue());
    }
    const oldStatus = this.props.status;
    this.transitionToStatus(ExpenseStatus.REIMBURSED);

    this.addDomainEvent(
      new ExpenseReimbursedEvent(
        this.id.getValue(),
        this.workspaceId,
        this.props.userId,
        this.props.amount.getAmount().toNumber(),
        this.props.amount.getCurrency()
      )
    );
    this.addDomainEvent(
      new ExpenseStatusChangedEvent(
        this.id.getValue(),
        this.workspaceId,
        oldStatus,
        ExpenseStatus.REIMBURSED,
        userId,
        this.props.userId
      )
    );
  }

  // Query methods
  isDraft(): boolean {
    return this.props.status === ExpenseStatus.DRAFT;
  }

  isSubmitted(): boolean {
    return this.props.status === ExpenseStatus.SUBMITTED;
  }

  isApproved(): boolean {
    return this.props.status === ExpenseStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.props.status === ExpenseStatus.REJECTED;
  }

  isReimbursed(): boolean {
    return this.props.status === ExpenseStatus.REIMBURSED;
  }

  canBeEdited(): boolean {
    return (
      this.props.status === ExpenseStatus.DRAFT ||
      this.props.status === ExpenseStatus.REJECTED
    );
  }

  canBeDeleted(): boolean {
    return (
      this.props.status === ExpenseStatus.DRAFT ||
      this.props.status === ExpenseStatus.REJECTED
    );
  }

  recordSettlement(settlementId: string): void {
    this.addDomainEvent(
      new SettlementRecordedEvent(
        this.id.getValue(),
        this.workspaceId,
        settlementId
      )
    );
  }

  markAsDeleted(): void {
    this.addDomainEvent(new ExpenseDeletedEvent(this.id.getValue(), this.workspaceId));
  }

  static toDTO(expense: Expense): ExpenseDTO {
    return {
      expenseId: expense.id.getValue(),
      workspaceId: expense.workspaceId,
      userId: expense.userId,
      title: expense.title,
      description: expense.description,
      amount: expense.amount.getAmount().toString(),
      currency: expense.amount.getCurrency(),
      expenseDate: expense.expenseDate.toDateString(),
      categoryId: expense.categoryId?.getValue(),
      merchant: expense.merchant,
      paymentMethod: expense.paymentMethod,
      isReimbursable: expense.isReimbursable,
      status: expense.status,
      version: expense.version,
      tagIds: expense.tagIds.map((id) => id.getValue()),
      attachmentIds: expense.attachmentIds.map((id) => id.getValue()),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }
}
