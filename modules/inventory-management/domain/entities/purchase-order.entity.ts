import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';
import { PurchaseOrderId } from '../value-objects/purchase-order-id.vo';
import { PurchaseOrderStatus, isValidStatusTransition } from '../enums/purchase-order-status';
import {
  InvalidPurchaseOrderStatusError,
  PurchaseOrderCannotBeEditedError,
  InvalidInventoryDataError,
} from '../errors/inventory.errors';
import { Decimal } from '@prisma/client/runtime/library';

// Domain Events
export class PurchaseOrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly workspaceId: string,
    public readonly supplierId: string,
    public readonly createdBy: string
  ) {
    super(purchaseOrderId, 'PurchaseOrder');
  }

  get eventType(): string { return 'purchase_order.created'; }

  getPayload(): Record<string, unknown> {
    return {
      purchaseOrderId: this.purchaseOrderId,
      workspaceId: this.workspaceId,
      supplierId: this.supplierId,
      createdBy: this.createdBy,
    };
  }
}

export class PurchaseOrderStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly purchaseOrderId: string,
    public readonly workspaceId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string
  ) {
    super(purchaseOrderId, 'PurchaseOrder');
  }

  get eventType(): string { return 'purchase_order.status_changed'; }

  getPayload(): Record<string, unknown> {
    return {
      purchaseOrderId: this.purchaseOrderId,
      workspaceId: this.workspaceId,
      fromStatus: this.fromStatus,
      toStatus: this.toStatus,
    };
  }
}

export interface PurchaseOrderProps {
  id: PurchaseOrderId;
  workspaceId: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  orderDate: Date;
  expectedDate: Date | null;
  receivedDate: Date | null;
  notes: string | null;
  totalAmount: Decimal;
  currency: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePurchaseOrderData {
  workspaceId: string;
  supplierId: string;
  orderDate: Date;
  expectedDate?: Date;
  notes?: string;
  currency?: string;
  createdBy: string;
}

export interface PurchaseOrderDTO {
  purchaseOrderId: string;
  workspaceId: string;
  supplierId: string;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  notes: string | null;
  totalAmount: string;
  currency: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class PurchaseOrder extends AggregateRoot {
  private constructor(private props: PurchaseOrderProps) {
    super();
  }

  static create(data: CreatePurchaseOrderData): PurchaseOrder {
    if (!data.supplierId) {
      throw new InvalidInventoryDataError('Supplier ID is required');
    }
    if (!data.orderDate) {
      throw new InvalidInventoryDataError('Order date is required');
    }

    const now = new Date();
    const po = new PurchaseOrder({
      id: PurchaseOrderId.create(),
      workspaceId: data.workspaceId,
      supplierId: data.supplierId,
      status: PurchaseOrderStatus.DRAFT,
      orderDate: data.orderDate,
      expectedDate: data.expectedDate || null,
      receivedDate: null,
      notes: data.notes || null,
      totalAmount: new Decimal(0),
      currency: data.currency || 'USD',
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    po.addDomainEvent(
      new PurchaseOrderCreatedEvent(
        po.id.getValue(),
        po.workspaceId,
        po.supplierId,
        po.createdBy
      )
    );

    return po;
  }

  static fromPersistence(props: PurchaseOrderProps): PurchaseOrder {
    return new PurchaseOrder(props);
  }

  private ensureEditable(): void {
    if (this.props.status !== PurchaseOrderStatus.DRAFT) {
      throw new PurchaseOrderCannotBeEditedError(this.props.status);
    }
  }

  updateNotes(notes: string | null): void {
    this.ensureEditable();
    this.props.notes = notes;
    this.props.updatedAt = new Date();
  }

  updateExpectedDate(date: Date | null): void {
    this.ensureEditable();
    this.props.expectedDate = date;
    this.props.updatedAt = new Date();
  }

  updateTotalAmount(amount: Decimal): void {
    this.props.totalAmount = amount;
    this.props.updatedAt = new Date();
  }

  private transitionTo(newStatus: PurchaseOrderStatus): void {
    if (!isValidStatusTransition(this.props.status, newStatus)) {
      throw new InvalidPurchaseOrderStatusError(this.props.status, newStatus);
    }
    const fromStatus = this.props.status;
    this.props.status = newStatus;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new PurchaseOrderStatusChangedEvent(
        this.id.getValue(),
        this.workspaceId,
        fromStatus,
        newStatus
      )
    );
  }

  submit(): void {
    this.transitionTo(PurchaseOrderStatus.SUBMITTED);
  }

  approve(): void {
    this.transitionTo(PurchaseOrderStatus.APPROVED);
  }

  receive(): void {
    this.transitionTo(PurchaseOrderStatus.RECEIVED);
    this.props.receivedDate = new Date();
  }

  cancel(): void {
    this.transitionTo(PurchaseOrderStatus.CANCELLED);
  }

  get id(): PurchaseOrderId { return this.props.id; }
  get workspaceId(): string { return this.props.workspaceId; }
  get supplierId(): string { return this.props.supplierId; }
  get status(): PurchaseOrderStatus { return this.props.status; }
  get orderDate(): Date { return this.props.orderDate; }
  get expectedDate(): Date | null { return this.props.expectedDate; }
  get receivedDate(): Date | null { return this.props.receivedDate; }
  get notes(): string | null { return this.props.notes; }
  get totalAmount(): Decimal { return this.props.totalAmount; }
  get currency(): string { return this.props.currency; }
  get createdBy(): string { return this.props.createdBy; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isDraft(): boolean { return this.props.status === PurchaseOrderStatus.DRAFT; }
  isSubmitted(): boolean { return this.props.status === PurchaseOrderStatus.SUBMITTED; }
  isApproved(): boolean { return this.props.status === PurchaseOrderStatus.APPROVED; }
  isReceived(): boolean { return this.props.status === PurchaseOrderStatus.RECEIVED; }
  isCancelled(): boolean { return this.props.status === PurchaseOrderStatus.CANCELLED; }

  equals(other: PurchaseOrder): boolean {
    return this.props.id.equals(other.props.id);
  }

  static toDTO(po: PurchaseOrder): PurchaseOrderDTO {
    return {
      purchaseOrderId: po.id.getValue(),
      workspaceId: po.workspaceId,
      supplierId: po.supplierId,
      status: po.status,
      orderDate: po.orderDate.toISOString(),
      expectedDate: po.expectedDate?.toISOString() || null,
      receivedDate: po.receivedDate?.toISOString() || null,
      notes: po.notes,
      totalAmount: po.totalAmount.toString(),
      currency: po.currency,
      createdBy: po.createdBy,
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    };
  }
}
