import { ReceiptId } from "../value-objects/receipt-id";
import { FileInfo } from "../value-objects/file-info";
import { StorageLocation } from "../value-objects/storage-location";
import { ReceiptStatus, canTransitionTo } from "../enums/receipt-status";
import { ReceiptType } from "../enums/receipt-type";
import { Decimal } from "@prisma/client/runtime/library";
import {
  ReceiptValidationError,
  InvalidReceiptOperationError,
  InvalidStatusTransitionError,
} from "../errors/receipt.errors";
import {
  MIN_OCR_CONFIDENCE,
  MAX_OCR_CONFIDENCE,
} from "../constants/receipt.constants";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";

// ============================================================================
// Domain Events
// ============================================================================

export class ReceiptUploadedEvent extends DomainEvent {
  constructor(
    public readonly receiptId: string,
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly fileName: string,
  ) {
    super(receiptId, "Receipt");
  }

  get eventType(): string {
    return "ReceiptUploaded";
  }

  protected getPayload(): Record<string, unknown> {
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
  ) {
    super(receiptId, "Receipt");
  }

  get eventType(): string {
    return "ReceiptProcessed";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      receiptId: this.receiptId,
      ocrText: this.ocrText,
      ocrConfidence: this.ocrConfidence,
    };
  }
}

export class ReceiptLinkedToExpenseEvent extends DomainEvent {
  constructor(
    public readonly receiptId: string,
    public readonly expenseId: string,
  ) {
    super(receiptId, "Receipt");
  }

  get eventType(): string {
    return "ReceiptLinkedToExpense";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      receiptId: this.receiptId,
      expenseId: this.expenseId,
    };
  }
}

export class ReceiptDeletedEvent extends DomainEvent {
  constructor(public readonly receiptId: string) {
    super(receiptId, "Receipt");
  }

  get eventType(): string {
    return "ReceiptDeleted";
  }

  protected getPayload(): Record<string, unknown> {
    return { receiptId: this.receiptId };
  }
}

export interface ReceiptProps {
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
      receiptType: data.receiptType || ReceiptType.EXPENSE,
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
        data.originalName,
      ),
    );

    return receipt;
  }

  static fromPersistence(props: ReceiptProps): Receipt {
    return new Receipt(props);
  }

  // Getters
  getId(): ReceiptId {
    return this.props.id;
  }

  getWorkspaceId(): string {
    return this.props.workspaceId;
  }

  getExpenseId(): string | undefined {
    return this.props.expenseId;
  }

  getUserId(): string {
    return this.props.userId;
  }

  getFileInfo(): FileInfo {
    return this.props.fileInfo;
  }

  getReceiptType(): ReceiptType {
    return this.props.receiptType;
  }

  getStatus(): ReceiptStatus {
    return this.props.status;
  }

  getStorageLocation(): StorageLocation {
    return this.props.storageLocation;
  }

  getThumbnailPath(): string | undefined {
    return this.props.thumbnailPath;
  }

  getOcrText(): string | undefined {
    return this.props.ocrText;
  }

  getOcrConfidence(): Decimal | undefined {
    return this.props.ocrConfidence;
  }

  getProcessedAt(): Date | undefined {
    return this.props.processedAt;
  }

  getFailureReason(): string | undefined {
    return this.props.failureReason;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  getDeletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  // Business logic methods
  linkToExpense(expenseId: string): void {
    if (!expenseId || expenseId.trim().length === 0) {
      throw new ReceiptValidationError(
        "expenseId",
        "Expense ID cannot be empty",
      );
    }

    if (this.isDeleted()) {
      throw new InvalidReceiptOperationError(
        "link to expense",
        "Receipt has been deleted",
      );
    }

    if (this.props.expenseId && this.props.expenseId === expenseId) {
      return; // Already linked to this expense
    }

    this.props.expenseId = expenseId;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ReceiptLinkedToExpenseEvent(this.props.id.getValue(), expenseId),
    );
  }

  unlinkFromExpense(): void {
    if (!this.props.expenseId) {
      return; // Not linked to any expense
    }

    this.props.expenseId = undefined;
    this.props.updatedAt = new Date();
  }

  isLinkedToExpense(): boolean {
    return !!this.props.expenseId;
  }

  startProcessing(): void {
    this.transitionTo(ReceiptStatus.PROCESSING);
  }

  markAsProcessed(ocrText?: string, ocrConfidence?: number): void {
    if (ocrConfidence !== undefined) {
      if (
        ocrConfidence < MIN_OCR_CONFIDENCE ||
        ocrConfidence > MAX_OCR_CONFIDENCE
      ) {
        throw new ReceiptValidationError(
          "ocrConfidence",
          `OCR confidence must be between ${MIN_OCR_CONFIDENCE} and ${MAX_OCR_CONFIDENCE}`,
        );
      }
    }

    this.transitionTo(ReceiptStatus.PROCESSED);
    this.props.processedAt = new Date();

    if (ocrText) {
      this.props.ocrText = ocrText;
    }

    if (ocrConfidence !== undefined) {
      this.props.ocrConfidence = new Decimal(ocrConfidence);
    }

    this.addDomainEvent(
      new ReceiptProcessedEvent(
        this.props.id.getValue(),
        ocrText,
        ocrConfidence,
      ),
    );
  }

  markAsFailed(reason: string): void {
    if (!reason || reason.trim().length === 0) {
      throw new ReceiptValidationError(
        "failureReason",
        "Failure reason cannot be empty",
      );
    }

    this.transitionTo(ReceiptStatus.FAILED);
    this.props.failureReason = reason;
    this.props.processedAt = new Date();
  }

  verify(): void {
    if (this.props.status !== ReceiptStatus.PROCESSED) {
      throw new InvalidReceiptOperationError(
        "verify receipt",
        "Only processed receipts can be verified",
      );
    }

    this.transitionTo(ReceiptStatus.VERIFIED);
  }

  reject(reason?: string): void {
    this.transitionTo(ReceiptStatus.REJECTED);

    if (reason) {
      this.props.failureReason = reason;
    }

    this.props.updatedAt = new Date();
  }

  setThumbnailPath(path: string): void {
    if (!path || path.trim().length === 0) {
      throw new ReceiptValidationError(
        "thumbnailPath",
        "Thumbnail path cannot be empty",
      );
    }

    this.props.thumbnailPath = path;
    this.props.updatedAt = new Date();
  }

  softDelete(): void {
    if (this.isDeleted()) {
      return; // Already deleted
    }

    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(new ReceiptDeletedEvent(this.props.id.getValue()));
  }

  restore(): void {
    if (!this.isDeleted()) {
      return; // Not deleted
    }

    this.props.deletedAt = undefined;
    this.props.updatedAt = new Date();
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
    return (
      this.props.status === ReceiptStatus.FAILED ||
      this.props.status === ReceiptStatus.PROCESSED
    );
  }

  private transitionTo(newStatus: ReceiptStatus): void {
    if (!canTransitionTo(this.props.status, newStatus)) {
      throw new InvalidStatusTransitionError(this.props.status, newStatus);
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }
}
