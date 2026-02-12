import { ExpenseId } from "../value-objects/expense-id";
import { CategoryId } from "../value-objects/category-id";
import { TagId } from "../value-objects/tag-id";
import { AttachmentId } from "../value-objects/attachment-id";
import { Money } from "../value-objects/money";
import { ExpenseDate } from "../value-objects/expense-date";
import { PaymentMethod } from "../enums/payment-method";
import { ExpenseStatus, canTransitionTo } from "../enums/expense-status";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";
import {
  ExpenseTitleRequiredError,
  ExpenseTitleTooLongError,
  ExpenseDescriptionTooLongError,
  MerchantNameTooLongError,
  InvalidExpenseStatusError,
  NonReimbursableError,
} from "../errors/expense.errors";

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
    public readonly title: string,
  ) {
    super(expenseId, "Expense");
  }

  get eventType(): string {
    return "expense.created";
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
    public readonly currency: string,
  ) {
    super(expenseId, "Expense");
  }

  get eventType(): string {
    return "expense.submitted";
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
    public readonly currency: string,
  ) {
    super(expenseId, "Expense");
  }

  get eventType(): string {
    return "expense.approved";
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
    public readonly reason?: string,
  ) {
    super(expenseId, "Expense");
  }

  get eventType(): string {
    return "expense.rejected";
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
    public readonly currency: string,
  ) {
    super(expenseId, "Expense");
  }

  get eventType(): string {
    return "expense.reimbursed";
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
    public readonly changedBy: string = "system",
    public readonly expenseOwnerId: string,
  ) {
    super(expenseId, "Expense");
  }

  get eventType(): string {
    return "expense.status_changed";
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
  tagIds: TagId[];
  attachmentIds: AttachmentId[];
  createdAt: Date;
  updatedAt: Date;
}

export class Expense extends AggregateRoot {
  private readonly props: ExpenseProps;

  private constructor(props: ExpenseProps) {
    super();
    this.props = props;
  }

  static create(
    props: Omit<ExpenseProps, "id" | "createdAt" | "updatedAt">,
  ): Expense {
    this.validateTitle(props.title);
    this.validateDescription(props.description);
    this.validateMerchant(props.merchant);

    const expense = new Expense({
      ...props,
      id: ExpenseId.create(),
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
        expense.title,
      ),
    );

    return expense;
  }

  static fromPersistence(props: ExpenseProps): Expense {
    return new Expense(props);
  }

  // Validation methods
  private static validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new ExpenseTitleRequiredError();
    }
    if (title.length > 255) {
      throw new ExpenseTitleTooLongError(255);
    }
  }

  private static validateDescription(description?: string): void {
    if (description && description.length > 5000) {
      throw new ExpenseDescriptionTooLongError(5000);
    }
  }

  private static validateMerchant(merchant?: string): void {
    if (merchant && merchant.length > 255) {
      throw new MerchantNameTooLongError(255);
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
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods
  updateTitle(title: string): void {
    Expense.validateTitle(title);
    this.props.title = title;
    this.props.updatedAt = new Date();
  }

  updateDescription(description?: string): void {
    Expense.validateDescription(description);
    this.props.description = description;
    this.props.updatedAt = new Date();
  }

  updateAmount(amount: Money): void {
    this.props.amount = amount;
    this.props.updatedAt = new Date();
  }

  updateExpenseDate(expenseDate: ExpenseDate): void {
    this.props.expenseDate = expenseDate;
    this.props.updatedAt = new Date();
  }

  updateCategory(categoryId?: CategoryId): void {
    this.props.categoryId = categoryId;
    this.props.updatedAt = new Date();
  }

  updateMerchant(merchant?: string): void {
    Expense.validateMerchant(merchant);
    this.props.merchant = merchant;
    this.props.updatedAt = new Date();
  }

  updatePaymentMethod(paymentMethod: PaymentMethod): void {
    this.props.paymentMethod = paymentMethod;
    this.props.updatedAt = new Date();
  }

  setReimbursable(isReimbursable: boolean): void {
    this.props.isReimbursable = isReimbursable;
    this.props.updatedAt = new Date();
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
    }
  }

  removeAttachment(attachmentId: AttachmentId): void {
    const index = this.props.attachmentIds.findIndex((id) =>
      id.equals(attachmentId),
    );
    if (index !== -1) {
      this.props.attachmentIds.splice(index, 1);
      this.props.updatedAt = new Date();
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
        `transition to ${newStatus}`,
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
        "submit",
      );
    }
    const oldStatus = this.props.status;
    this.transitionToStatus(ExpenseStatus.SUBMITTED);

    this.addDomainEvent(
      new ExpenseStatusChangedEvent(
        this.id.getValue(),
        this.workspaceId,
        oldStatus,
        ExpenseStatus.SUBMITTED,
        userId,
        this.props.userId,
      ),
    );
  }

  approve(userId: string): void {
    if (this.props.status !== ExpenseStatus.SUBMITTED) {
      throw new InvalidExpenseStatusError(
        this.id.getValue(),
        this.props.status,
        "approve",
      );
    }
    const oldStatus = this.props.status;
    this.transitionToStatus(ExpenseStatus.APPROVED);

    this.addDomainEvent(
      new ExpenseStatusChangedEvent(
        this.id.getValue(),
        this.workspaceId,
        oldStatus,
        ExpenseStatus.APPROVED,
        userId,
        this.props.userId,
      ),
    );
  }

  reject(userId: string, reason?: string): void {
    if (this.props.status !== ExpenseStatus.SUBMITTED) {
      throw new InvalidExpenseStatusError(
        this.id.getValue(),
        this.props.status,
        "reject",
      );
    }
    const oldStatus = this.props.status;
    this.transitionToStatus(ExpenseStatus.REJECTED);

    this.addDomainEvent(
      new ExpenseStatusChangedEvent(
        this.id.getValue(),
        this.workspaceId,
        oldStatus,
        ExpenseStatus.REJECTED,
        userId,
        this.props.userId,
      ),
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
        "revert to draft",
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
        this.props.userId,
      ),
    );
  }

  markAsReimbursed(userId: string): void {
    if (this.props.status !== ExpenseStatus.APPROVED) {
      throw new InvalidExpenseStatusError(
        this.id.getValue(),
        this.props.status,
        "mark as reimbursed",
      );
    }
    if (!this.props.isReimbursable) {
      throw new NonReimbursableError(this.id.getValue());
    }
    const oldStatus = this.props.status;
    this.transitionToStatus(ExpenseStatus.REIMBURSED);

    this.addDomainEvent(
      new ExpenseStatusChangedEvent(
        this.id.getValue(),
        this.workspaceId,
        oldStatus,
        ExpenseStatus.REIMBURSED,
        userId,
        this.props.userId,
      ),
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
}
