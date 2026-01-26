import { ExpenseId } from '../value-objects/expense-id'
import { CategoryId } from '../value-objects/category-id'
import { TagId } from '../value-objects/tag-id'
import { AttachmentId } from '../value-objects/attachment-id'
import { Money } from '../value-objects/money'
import { ExpenseDate } from '../value-objects/expense-date'
import { PaymentMethod } from '../enums/payment-method'
import { ExpenseStatus, canTransitionTo } from '../enums/expense-status'

export interface ExpenseProps {
  id: ExpenseId
  workspaceId: string
  userId: string
  title: string
  description?: string
  amount: Money
  expenseDate: ExpenseDate
  categoryId?: CategoryId
  merchant?: string
  paymentMethod: PaymentMethod
  isReimbursable: boolean
  status: ExpenseStatus
  tagIds: TagId[]
  attachmentIds: AttachmentId[]
  createdAt: Date
  updatedAt: Date
}

export class Expense {
  private readonly props: ExpenseProps

  private constructor(props: ExpenseProps) {
    this.props = props
  }

  static create(props: Omit<ExpenseProps, 'id' | 'createdAt' | 'updatedAt'>): Expense {
    this.validateTitle(props.title)
    this.validateDescription(props.description)
    this.validateMerchant(props.merchant)

    return new Expense({
      ...props,
      id: ExpenseId.create(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromPersistence(props: ExpenseProps): Expense {
    return new Expense(props)
  }

  // Validation methods
  private static validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Expense title is required')
    }
    if (title.length > 255) {
      throw new Error('Expense title cannot exceed 255 characters')
    }
  }

  private static validateDescription(description?: string): void {
    if (description && description.length > 5000) {
      throw new Error('Expense description cannot exceed 5000 characters')
    }
  }

  private static validateMerchant(merchant?: string): void {
    if (merchant && merchant.length > 255) {
      throw new Error('Merchant name cannot exceed 255 characters')
    }
  }

  // Getters
  get id(): ExpenseId {
    return this.props.id
  }

  get workspaceId(): string {
    return this.props.workspaceId
  }

  get userId(): string {
    return this.props.userId
  }

  get title(): string {
    return this.props.title
  }

  get description(): string | undefined {
    return this.props.description
  }

  get amount(): Money {
    return this.props.amount
  }

  get expenseDate(): ExpenseDate {
    return this.props.expenseDate
  }

  get categoryId(): CategoryId | undefined {
    return this.props.categoryId
  }

  get merchant(): string | undefined {
    return this.props.merchant
  }

  get paymentMethod(): PaymentMethod {
    return this.props.paymentMethod
  }

  get isReimbursable(): boolean {
    return this.props.isReimbursable
  }

  get status(): ExpenseStatus {
    return this.props.status
  }

  get tagIds(): TagId[] {
    return [...this.props.tagIds]
  }

  get attachmentIds(): AttachmentId[] {
    return [...this.props.attachmentIds]
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  // Business logic methods
  updateTitle(title: string): void {
    Expense.validateTitle(title)
    this.props.title = title
    this.props.updatedAt = new Date()
  }

  updateDescription(description?: string): void {
    Expense.validateDescription(description)
    this.props.description = description
    this.props.updatedAt = new Date()
  }

  updateAmount(amount: Money): void {
    this.props.amount = amount
    this.props.updatedAt = new Date()
  }

  updateExpenseDate(expenseDate: ExpenseDate): void {
    this.props.expenseDate = expenseDate
    this.props.updatedAt = new Date()
  }

  updateCategory(categoryId?: CategoryId): void {
    this.props.categoryId = categoryId
    this.props.updatedAt = new Date()
  }

  updateMerchant(merchant?: string): void {
    Expense.validateMerchant(merchant)
    this.props.merchant = merchant
    this.props.updatedAt = new Date()
  }

  updatePaymentMethod(paymentMethod: PaymentMethod): void {
    this.props.paymentMethod = paymentMethod
    this.props.updatedAt = new Date()
  }

  setReimbursable(isReimbursable: boolean): void {
    this.props.isReimbursable = isReimbursable
    this.props.updatedAt = new Date()
  }

  // Tag management
  addTag(tagId: TagId): void {
    if (!this.hasTag(tagId)) {
      this.props.tagIds.push(tagId)
      this.props.updatedAt = new Date()
    }
  }

  removeTag(tagId: TagId): void {
    const index = this.props.tagIds.findIndex((id) => id.equals(tagId))
    if (index !== -1) {
      this.props.tagIds.splice(index, 1)
      this.props.updatedAt = new Date()
    }
  }

  hasTag(tagId: TagId): boolean {
    return this.props.tagIds.some((id) => id.equals(tagId))
  }

  // Attachment management
  addAttachment(attachmentId: AttachmentId): void {
    if (!this.hasAttachment(attachmentId)) {
      this.props.attachmentIds.push(attachmentId)
      this.props.updatedAt = new Date()
    }
  }

  removeAttachment(attachmentId: AttachmentId): void {
    const index = this.props.attachmentIds.findIndex((id) => id.equals(attachmentId))
    if (index !== -1) {
      this.props.attachmentIds.splice(index, 1)
      this.props.updatedAt = new Date()
    }
  }

  hasAttachment(attachmentId: AttachmentId): boolean {
    return this.props.attachmentIds.some((id) => id.equals(attachmentId))
  }

  // Status transition methods
  canTransitionToStatus(newStatus: ExpenseStatus): boolean {
    return canTransitionTo(this.props.status, newStatus)
  }

  private transitionToStatus(newStatus: ExpenseStatus): void {
    if (!this.canTransitionToStatus(newStatus)) {
      throw new Error(
        `Cannot transition from ${this.props.status} to ${newStatus}`
      )
    }
    this.props.status = newStatus
    this.props.updatedAt = new Date()
  }

  submit(): void {
    if (this.props.status !== ExpenseStatus.DRAFT) {
      throw new Error('Only draft expenses can be submitted')
    }
    this.transitionToStatus(ExpenseStatus.SUBMITTED)
  }

  approve(): void {
    if (this.props.status !== ExpenseStatus.SUBMITTED) {
      throw new Error('Only submitted expenses can be approved')
    }
    this.transitionToStatus(ExpenseStatus.APPROVED)
  }

  reject(): void {
    if (this.props.status !== ExpenseStatus.SUBMITTED) {
      throw new Error('Only submitted expenses can be rejected')
    }
    this.transitionToStatus(ExpenseStatus.REJECTED)
  }

  revertToDraft(): void {
    if (
      this.props.status !== ExpenseStatus.SUBMITTED &&
      this.props.status !== ExpenseStatus.REJECTED
    ) {
      throw new Error('Only submitted or rejected expenses can be reverted to draft')
    }
    this.transitionToStatus(ExpenseStatus.DRAFT)
  }

  markAsReimbursed(): void {
    if (this.props.status !== ExpenseStatus.APPROVED) {
      throw new Error('Only approved expenses can be marked as reimbursed')
    }
    if (!this.props.isReimbursable) {
      throw new Error('Cannot reimburse a non-reimbursable expense')
    }
    this.transitionToStatus(ExpenseStatus.REIMBURSED)
  }

  // Query methods
  isDraft(): boolean {
    return this.props.status === ExpenseStatus.DRAFT
  }

  isSubmitted(): boolean {
    return this.props.status === ExpenseStatus.SUBMITTED
  }

  isApproved(): boolean {
    return this.props.status === ExpenseStatus.APPROVED
  }

  isRejected(): boolean {
    return this.props.status === ExpenseStatus.REJECTED
  }

  isReimbursed(): boolean {
    return this.props.status === ExpenseStatus.REIMBURSED
  }

  canBeEdited(): boolean {
    return this.props.status === ExpenseStatus.DRAFT || this.props.status === ExpenseStatus.REJECTED
  }

  canBeDeleted(): boolean {
    return this.props.status === ExpenseStatus.DRAFT || this.props.status === ExpenseStatus.REJECTED
  }
}
