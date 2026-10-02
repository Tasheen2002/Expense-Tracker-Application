import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { SupplierId } from '../value-objects/supplier-id.vo';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';
import { InvalidInventoryDataError } from '../errors/inventory.errors';
import {
  SUPPLIER_NAME_MIN_LENGTH,
  SUPPLIER_NAME_MAX_LENGTH,
} from '../constants/inventory.constants';

// Domain Events
export class SupplierCreatedEvent extends DomainEvent {
  constructor(
    public readonly supplierId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(supplierId, 'Supplier');
  }

  get eventType(): string { return 'supplier.created'; }

  getPayload(): Record<string, unknown> {
    return { supplierId: this.supplierId, workspaceId: this.workspaceId, name: this.name };
  }
}

export class SupplierUpdatedEvent extends DomainEvent {
  constructor(
    public readonly supplierId: string,
    public readonly workspaceId: string
  ) {
    super(supplierId, 'Supplier');
  }

  get eventType(): string { return 'supplier.updated'; }

  getPayload(): Record<string, unknown> {
    return { supplierId: this.supplierId, workspaceId: this.workspaceId };
  }
}

export class SupplierDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly supplierId: string,
    public readonly workspaceId: string
  ) {
    super(supplierId, 'Supplier');
  }

  get eventType(): string { return 'supplier.deactivated'; }

  getPayload(): Record<string, unknown> {
    return { supplierId: this.supplierId, workspaceId: this.workspaceId };
  }
}

export class SupplierActivatedEvent extends DomainEvent {
  constructor(
    public readonly supplierId: string,
    public readonly workspaceId: string
  ) {
    super(supplierId, 'Supplier');
  }

  get eventType(): string { return 'supplier.activated'; }

  getPayload(): Record<string, unknown> {
    return { supplierId: this.supplierId, workspaceId: this.workspaceId };
  }
}

export class SupplierDeletedEvent extends DomainEvent {
  constructor(
    public readonly supplierId: string,
    public readonly workspaceId: string
  ) {
    super(supplierId, 'Supplier');
  }

  get eventType(): string { return 'supplier.deleted'; }

  getPayload(): Record<string, unknown> {
    return { supplierId: this.supplierId, workspaceId: this.workspaceId };
  }
}

export interface SupplierProps {
  id: SupplierId;
  workspaceId: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierData {
  workspaceId: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export interface SupplierDTO {
  supplierId: string;
  workspaceId: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class Supplier extends AggregateRoot {
  private deletionMarked = false;
  private constructor(private props: SupplierProps) {
    super();
  }

  static create(data: CreateSupplierData): Supplier {
    if (!UuidId.isValid(data.workspaceId)) throw new InvalidInventoryDataError('Invalid workspace ID');
    const name = data.name?.trim();
    if (!name || name.length < SUPPLIER_NAME_MIN_LENGTH) {
      throw new InvalidInventoryDataError('Supplier name is required');
    }
    if (name.length > SUPPLIER_NAME_MAX_LENGTH) {
      throw new InvalidInventoryDataError(
        `Supplier name cannot exceed ${SUPPLIER_NAME_MAX_LENGTH} characters`
      );
    }
    if (data.contactEmail && data.contactEmail.length > 255) throw new InvalidInventoryDataError('Contact email cannot exceed 255 characters');
    if (data.contactPhone && data.contactPhone.length > 50) throw new InvalidInventoryDataError('Contact phone cannot exceed 50 characters');

    const now = new Date();
    const supplier = new Supplier({
      id: SupplierId.create(),
      workspaceId: data.workspaceId,
      name,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      address: data.address || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    supplier.addDomainEvent(
      new SupplierCreatedEvent(
        supplier.id.getValue(),
        supplier.workspaceId,
        supplier.name
      )
    );

    return supplier;
  }

  static fromPersistence(props: SupplierProps): Supplier {
    return new Supplier({ ...props, createdAt: new Date(props.createdAt), updatedAt: new Date(props.updatedAt) });
  }

  updateName(name: string): void {
    const normalized = name?.trim();
    if (!normalized || normalized.length < SUPPLIER_NAME_MIN_LENGTH) {
      throw new InvalidInventoryDataError('Supplier name is required');
    }
    if (normalized.length > SUPPLIER_NAME_MAX_LENGTH) {
      throw new InvalidInventoryDataError(`Supplier name cannot exceed ${SUPPLIER_NAME_MAX_LENGTH} characters`);
    }
    if (normalized === this.props.name) return;
    this.props.name = normalized;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new SupplierUpdatedEvent(this.id.getValue(), this.workspaceId));
  }

  updateContactEmail(email: string | null): void {
    if (email !== null && email.length > 255) throw new InvalidInventoryDataError('Contact email cannot exceed 255 characters');
    if (email === this.props.contactEmail) return;
    this.props.contactEmail = email;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new SupplierUpdatedEvent(this.id.getValue(), this.workspaceId));
  }

  updateContactPhone(phone: string | null): void {
    if (phone !== null && phone.length > 50) throw new InvalidInventoryDataError('Contact phone cannot exceed 50 characters');
    if (phone === this.props.contactPhone) return;
    this.props.contactPhone = phone;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new SupplierUpdatedEvent(this.id.getValue(), this.workspaceId));
  }

  updateAddress(address: string | null): void {
    if (address === this.props.address) return;
    this.props.address = address;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new SupplierUpdatedEvent(this.id.getValue(), this.workspaceId));
  }

  deactivate(): void {
    if (!this.props.isActive) return;
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new SupplierDeactivatedEvent(this.id.getValue(), this.workspaceId));
  }

  activate(): void {
    if (this.props.isActive) return;
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new SupplierActivatedEvent(this.id.getValue(), this.workspaceId));
  }

  markAsDeleted(): void {
    if (this.deletionMarked) return;
    this.deletionMarked = true;
    this.addDomainEvent(
      new SupplierDeletedEvent(this.id.getValue(), this.workspaceId)
    );
  }

  get id(): SupplierId { return this.props.id; }
  get workspaceId(): string { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get contactEmail(): string | null { return this.props.contactEmail; }
  get contactPhone(): string | null { return this.props.contactPhone; }
  get address(): string | null { return this.props.address; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return new Date(this.props.createdAt); }
  get updatedAt(): Date { return new Date(this.props.updatedAt); }

  equals(other: Supplier): boolean {
    return this.props.id.equals(other.props.id);
  }

  static toDTO(supplier: Supplier): SupplierDTO {
    return {
      supplierId: supplier.id.getValue(),
      workspaceId: supplier.workspaceId,
      name: supplier.name,
      contactEmail: supplier.contactEmail,
      contactPhone: supplier.contactPhone,
      address: supplier.address,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
    };
  }
}
