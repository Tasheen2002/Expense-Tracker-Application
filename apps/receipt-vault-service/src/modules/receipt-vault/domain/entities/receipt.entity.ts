import { ReceiptId } from '../value-objects/receipt-id';
import { FileInfo } from '../value-objects/file-info';
import { StorageLocation } from '../value-objects/storage-location';
import { ReceiptStatus, canTransitionTo } from '../enums/receipt-status';
import { ReceiptType, isValidReceiptType } from '../enums/receipt-type';
import Decimal from 'decimal.js';
import { date, eventSnapshots, invalid, ReceiptAuditEvent, ReceiptLifecycleEventType, uuid } from './receipt-validation';
import {
  ReceiptValidationError,
  InvalidReceiptOperationError,
  InvalidStatusTransitionError,
} from '../errors/receipt.errors';
import {
  MIN_OCR_CONFIDENCE,
  MAX_OCR_CONFIDENCE,
} from '../constants/receipt.constants';
import { DomainEvent } from '@core/domain/events/domain-event';
import { AggregateRoot } from '@core/domain/aggregate-root';

// ============================================================================
// Domain Events
// ============================================================================

export class ReceiptUploadedEvent extends DomainEvent {
  constructor(
    public readonly receiptId: string,
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly fileName: string
  ) {
    super(receiptId, 'Receipt');
  }

  get eventType(): string {
    return 'ReceiptUploaded';
  }

  getPayload(): Record<string, unknown> {
    return {
      receiptId: this.receiptId,
      workspaceId: this.workspaceId,
      userId: this.userId,
      fileName: this.fileName,
    };
  }
}

export class ReceiptProcessedEvent extends DomainEvent {
  constructor(
    public readonly receiptId: string,
    public readonly ocrText: string | undefined,
    public readonly ocrConfidence: number | undefined,
    public readonly workspaceId: string,
    public readonly userId: string
  ) {
    super(receiptId, 'Receipt');
  }

  get eventType(): string {
    return 'ReceiptProcessed';
  }

  getPayload(): Record<string, unknown> {
    return {
      receiptId: this.receiptId,
      ocrText: this.ocrText,
      ocrConfidence: this.ocrConfidence,
      workspaceId: this.workspaceId, userId: this.userId,
    };
  }
}

export class ReceiptLinkedToExpenseEvent extends DomainEvent {
  constructor(
    public readonly receiptId: string,
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly userId: string
  ) {
    super(receiptId, 'Receipt');
  }

  get eventType(): string {
    return 'ReceiptLinkedToExpense';
  }

  getPayload(): Record<string, unknown> {
    return {
      receiptId: this.receiptId,
      expenseId: this.expenseId,
      workspaceId: this.workspaceId, userId: this.userId,
    };
  }
}

export class ReceiptDeletedEvent extends DomainEvent {
  constructor(public readonly receiptId: string, public readonly workspaceId: string, public readonly userId: string) {
    super(receiptId, 'Receipt');
  }

  get eventType(): string {
    return 'ReceiptDeleted';
  }

  getPayload(): Record<string, unknown> {
    return { receiptId: this.receiptId, workspaceId: this.workspaceId, userId: this.userId };
  }
}

export interface ReceiptProps {
  version?: number;
  id: ReceiptId;
  workspaceId: string;
  expenseId?: string;
  userId: string;
  fileInfo: FileInfo;
  receiptType: ReceiptType;
  status: ReceiptStatus;
  storageLocation: StorageLocation;
  thumbnailPath?: string;
  ocrText?: string;
  ocrConfidence?: Decimal;
  processedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ReceiptDTO {
  receiptId: string;
  workspaceId: string;
  expenseId?: string;
  userId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileHash?: string;
  receiptType: string;
  status: string;
  storageProvider: string;
  storageBucket?: string;
  storageKey?: string;
  thumbnailPath?: string;
  ocrText?: string;
  ocrConfidence?: string;
  processedAt?: string;
  failureReason?: string;
  isLinked: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateReceiptData {
  workspaceId: string;
  userId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileHash?: string;
  receiptType?: ReceiptType;
  storageLocation: StorageLocation;
}

export class Receipt extends AggregateRoot {
  private constructor(private props: ReceiptProps) {
    super();
    if (props.version !== undefined && (!Number.isSafeInteger(props.version) || props.version < 0)) invalid('version', 'Expected a nonnegative integer');
    if (!isValidReceiptType(props.receiptType) || !Object.values(ReceiptStatus).includes(props.status)) invalid('receipt', 'Invalid type or status');
    this.props = { ...props, workspaceId: uuid(props.workspaceId, 'workspaceId'), userId: uuid(props.userId, 'userId'),
      expenseId: props.expenseId === undefined ? undefined : uuid(props.expenseId, 'expenseId'),
      createdAt: date(props.createdAt, 'createdAt'), updatedAt: date(props.updatedAt, 'updatedAt'),
      processedAt: props.processedAt === undefined ? undefined : date(props.processedAt, 'processedAt'),
      deletedAt: props.deletedAt === undefined ? undefined : date(props.deletedAt, 'deletedAt'),
      ocrConfidence: props.ocrConfidence === undefined ? undefined : new Decimal(props.ocrConfidence),
      thumbnailPath: props.thumbnailPath === undefined ? undefined : Receipt.thumbnailValue(props.thumbnailPath),
      failureReason: props.failureReason === undefined ? undefined : Receipt.failureValue(props.failureReason),
      ocrText: props.ocrText === undefined ? undefined : Receipt.ocrValue(props.ocrText),
    };
    if (this.props.ocrConfidence !== undefined) Receipt.validateConfidence(this.props.ocrConfidence.toNumber());
  }

  static create(data: CreateReceiptData): Receipt {
    const fileInfo = FileInfo.create({
      fileName: data.fileName,
      originalName: data.originalName,
      filePath: data.filePath,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      fileHash: data.fileHash,
    });

    const receiptId = ReceiptId.create();

    const receipt = new Receipt({
      id: receiptId,
      workspaceId: data.workspaceId,
      userId: data.userId,
      fileInfo,
      receiptType: data.receiptType ?? ReceiptType.EXPENSE,
      status: ReceiptStatus.PENDING,
      storageLocation: data.storageLocation,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    receipt.addDomainEvent(
      new ReceiptUploadedEvent(
        receiptId.getValue(),
        data.workspaceId,
        data.userId,
        data.originalName
      )
    );

    return receipt;
  }

  static fromPersistence(props: ReceiptProps): Receipt {
    return new Receipt({ ...props, version: props.version ?? 0 });
  }

  get expectedVersion(): number | undefined { return this.props.version; }
  acknowledgePersistence(): void { this.props.version = this.props.version === undefined ? 0 : this.props.version + 1; }

  get domainEvents() { return eventSnapshots(super.domainEvents); }
  private ensureActive(): void { if (this.isDeleted()) throw new InvalidReceiptOperationError('modify receipt', 'Receipt has been deleted'); }
  private emit(type: ReceiptLifecycleEventType): void {
    this.addDomainEvent(new ReceiptAuditEvent(this.id.getValue(), 'Receipt', type, this.eventContext()));
  }
  private eventContext() {
    return { receiptId: this.id.getValue(), workspaceId: this.workspaceId, userId: this.userId };
  }
  private static thumbnailValue(value: string): string {
    if (typeof value !== 'string' || !value.trim() || value.length > 1000) invalid('thumbnailPath', 'Expected a nonblank path of at most 1000 characters');
    return value;
  }
  private static failureValue(value: string): string {
    if (typeof value !== 'string' || !value.trim() || value.length > 5000) invalid('failureReason', 'Expected a nonblank reason of at most 5000 characters');
    return value.trim();
  }
  private static ocrValue(value: string): string {
    if (typeof value !== 'string') invalid('ocrText', 'Expected text');
    return value;
  }
  private static validateConfidence(value: number): void {
    if (!Number.isFinite(value) || value < MIN_OCR_CONFIDENCE || value > MAX_OCR_CONFIDENCE || new Decimal(value).decimalPlaces() > 2) invalid('ocrConfidence', 'Expected finite confidence from 0 to 100 with at most two decimals');
  }

  // Getters
  get id(): ReceiptId {
    return this.props.id;
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get expenseId(): string | undefined {
    return this.props.expenseId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get fileInfo(): FileInfo {
    return this.props.fileInfo;
  }

  get receiptType(): ReceiptType {
    return this.props.receiptType;
  }

  get status(): ReceiptStatus {
    return this.props.status;
  }

  get storageLocation(): StorageLocation {
    return this.props.storageLocation;
  }

  get thumbnailPath(): string | undefined {
    return this.props.thumbnailPath;
  }

  get ocrText(): string | undefined {
    return this.props.ocrText;
  }

  get ocrConfidence(): Decimal | undefined {
    return this.props.ocrConfidence === undefined ? undefined : new Decimal(this.props.ocrConfidence);
  }

  get processedAt(): Date | undefined {
    return this.props.processedAt && date(this.props.processedAt, 'processedAt');
  }

  get failureReason(): string | undefined {
    return this.props.failureReason;
  }

  get createdAt(): Date {
    return date(this.props.createdAt, 'createdAt');
  }

  get updatedAt(): Date {
    return date(this.props.updatedAt, 'updatedAt');
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt && date(this.props.deletedAt, 'deletedAt');
  }

  // Business logic methods
  linkToExpense(expenseId: string): void {
    expenseId = uuid(expenseId, 'expenseId');
    if (!expenseId || expenseId.trim().length === 0) {
      throw new ReceiptValidationError(
        'expenseId',
        'Expense ID cannot be empty'
      );
    }

    if (this.isDeleted()) {
      throw new InvalidReceiptOperationError(
        'link to expense',
        'Receipt has been deleted'
      );
    }

    if (this.props.expenseId && this.props.expenseId === expenseId) {
      return; // Already linked to this expense
    }

    this.props.expenseId = expenseId;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ReceiptLinkedToExpenseEvent(this.props.id.getValue(), expenseId, this.workspaceId, this.userId)
    );
  }

  unlinkFromExpense(): void {
    this.ensureActive();
    if (!this.props.expenseId) {
      return; // Not linked to any expense
    }

    this.props.expenseId = undefined;
    this.props.updatedAt = new Date();
    this.emit('ReceiptUnlinkedFromExpense');
  }

  isLinkedToExpense(): boolean {
    return !!this.props.expenseId;
  }

  startProcessing(): void {
    this.transitionTo(ReceiptStatus.PROCESSING);
    this.props.failureReason = undefined;
    this.props.processedAt = undefined;
    this.props.ocrText = undefined;
    this.props.ocrConfidence = undefined;
    this.emit('ReceiptProcessingStarted');
  }

  markAsProcessed(ocrText?: string, ocrConfidence?: number): void {
    Receipt.validateProcessingResult(ocrText, ocrConfidence);
    this.transitionTo(ReceiptStatus.PROCESSED);
    this.props.processedAt = new Date();

    this.props.ocrText = ocrText;
    this.props.failureReason = undefined;
    this.props.ocrConfidence = undefined;

    if (ocrConfidence !== undefined) {
      this.props.ocrConfidence = new Decimal(ocrConfidence);
    }

    this.addDomainEvent(
      new ReceiptProcessedEvent(
        this.props.id.getValue(),
        ocrText,
        ocrConfidence, this.workspaceId, this.userId
      )
    );
  }

  markAsFailed(reason: string): void {
    reason = Receipt.failureValue(reason);

    this.transitionTo(ReceiptStatus.FAILED);
    this.props.failureReason = reason.trim();
    this.props.processedAt = new Date();
    this.addDomainEvent(new ReceiptAuditEvent(this.id.getValue(), 'Receipt', 'ReceiptProcessingFailed', { ...this.eventContext(), reason }));
  }

  static validateProcessingResult(ocrText?: string, ocrConfidence?: number): void {
    if (ocrText !== undefined) Receipt.ocrValue(ocrText);
    if (ocrConfidence !== undefined) Receipt.validateConfidence(ocrConfidence);
  }

  verify(): void {
    if (this.props.status !== ReceiptStatus.PROCESSED) {
      throw new InvalidReceiptOperationError(
        'verify receipt',
        'Only processed receipts can be verified'
      );
    }

    this.transitionTo(ReceiptStatus.VERIFIED);
    this.emit('ReceiptVerified');
  }

  reject(reason?: string): void {
    if (reason !== undefined && (typeof reason !== 'string' || !reason.trim() || reason.length > 500)) invalid('reason', 'Expected a nonblank rejection reason of at most 500 characters');
    this.transitionTo(ReceiptStatus.REJECTED);

    if (reason) {
      this.props.failureReason = reason;
    }

    this.props.updatedAt = new Date();
    this.addDomainEvent(new ReceiptAuditEvent(this.id.getValue(), 'Receipt', 'ReceiptRejected', { ...this.eventContext(), ...(reason ? { reason } : {}) }));
  }

  setThumbnailPath(path: string): void {
    this.ensureActive();
    path = Receipt.thumbnailValue(path);

    if (this.props.thumbnailPath === path) return;
    this.props.thumbnailPath = path;
    this.props.updatedAt = new Date();
    this.emit('ReceiptThumbnailUpdated');
  }

  softDelete(): void {
    if (this.isDeleted()) {
      return; // Already deleted
    }

    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(new ReceiptDeletedEvent(this.props.id.getValue(), this.workspaceId, this.userId));
  }

  restore(): void {
    if (!this.isDeleted()) {
      return; // Not deleted
    }

    this.props.deletedAt = undefined;
    this.props.updatedAt = new Date();
    this.emit('ReceiptRestored');
  }

  isDeleted(): boolean {
    return !!this.props.deletedAt;
  }

  isPending(): boolean {
    return this.props.status === ReceiptStatus.PENDING;
  }

  isProcessing(): boolean {
    return this.props.status === ReceiptStatus.PROCESSING;
  }

  isProcessed(): boolean {
    return this.props.status === ReceiptStatus.PROCESSED;
  }

  isFailed(): boolean {
    return this.props.status === ReceiptStatus.FAILED;
  }

  isVerified(): boolean {
    return this.props.status === ReceiptStatus.VERIFIED;
  }

  isRejected(): boolean {
    return this.props.status === ReceiptStatus.REJECTED;
  }

  canBeReprocessed(): boolean {
    return !this.isDeleted() && (
      this.props.status === ReceiptStatus.FAILED ||
      this.props.status === ReceiptStatus.PROCESSED
    );
  }

  static toDTO(receipt: Receipt): ReceiptDTO {
    const fileInfo = receipt.fileInfo;
    const storageLocation = receipt.storageLocation;
    return {
      receiptId: receipt.id.getValue(),
      workspaceId: receipt.workspaceId,
      expenseId: receipt.expenseId,
      userId: receipt.userId,
      fileName: fileInfo.getFileName(),
      originalName: fileInfo.getOriginalName(),
      filePath: fileInfo.getFilePath(),
      fileSize: fileInfo.getFileSize(),
      mimeType: fileInfo.getMimeType(),
      fileHash: fileInfo.getFileHash(),
      receiptType: receipt.receiptType,
      status: receipt.status,
      storageProvider: storageLocation.getProvider(),
      storageBucket: storageLocation.getBucket(),
      storageKey: storageLocation.getKey(),
      thumbnailPath: receipt.thumbnailPath,
      ocrText: receipt.ocrText,
      ocrConfidence: receipt.ocrConfidence?.toString(),
      processedAt: receipt.processedAt?.toISOString(),
      failureReason: receipt.failureReason,
      isLinked: receipt.isLinkedToExpense(),
      isDeleted: receipt.isDeleted(),
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
      deletedAt: receipt.deletedAt?.toISOString(),
    };
  }

  private transitionTo(newStatus: ReceiptStatus): void {
    this.ensureActive();
    if (!canTransitionTo(this.props.status, newStatus)) {
      throw new InvalidStatusTransitionError(this.props.status, newStatus);
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }
}
