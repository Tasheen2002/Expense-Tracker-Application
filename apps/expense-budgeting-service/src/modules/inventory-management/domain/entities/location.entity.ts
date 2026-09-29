import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { LocationId } from '../value-objects/location-id.vo';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';
import { LocationType } from '../enums/location-type';
import { InvalidInventoryDataError } from '../errors/inventory.errors';
import {
  LOCATION_NAME_MIN_LENGTH,
  LOCATION_NAME_MAX_LENGTH,
} from '../constants/inventory.constants';

// Domain Events
export class LocationCreatedEvent extends DomainEvent {
  constructor(
    public readonly locationId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(locationId, 'Location');
  }

  get eventType(): string { return 'location.created'; }

  getPayload(): Record<string, unknown> {
    return { locationId: this.locationId, workspaceId: this.workspaceId, name: this.name };
  }
}

export class LocationUpdatedEvent extends DomainEvent {
  constructor(
    public readonly locationId: string,
    public readonly workspaceId: string
  ) {
    super(locationId, 'Location');
  }

  get eventType(): string { return 'location.updated'; }

  getPayload(): Record<string, unknown> {
    return { locationId: this.locationId, workspaceId: this.workspaceId };
  }
}

export class LocationDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly locationId: string,
    public readonly workspaceId: string
  ) {
    super(locationId, 'Location');
  }

  get eventType(): string { return 'location.deactivated'; }

  getPayload(): Record<string, unknown> {
    return { locationId: this.locationId, workspaceId: this.workspaceId };
  }
}

export class LocationActivatedEvent extends DomainEvent {
  constructor(
    public readonly locationId: string,
    public readonly workspaceId: string
  ) {
    super(locationId, 'Location');
  }

  get eventType(): string { return 'location.activated'; }

  getPayload(): Record<string, unknown> {
    return { locationId: this.locationId, workspaceId: this.workspaceId };
  }
}

export class LocationDeletedEvent extends DomainEvent {
  constructor(
    public readonly locationId: string,
    public readonly workspaceId: string
  ) {
    super(locationId, 'Location');
  }

  get eventType(): string { return 'location.deleted'; }

  getPayload(): Record<string, unknown> {
    return { locationId: this.locationId, workspaceId: this.workspaceId };
  }
}

export interface LocationProps {
  id: LocationId;
  workspaceId: string;
  name: string;
  type: LocationType;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLocationData {
  workspaceId: string;
  name: string;
  type?: LocationType;
  address?: string;
}

export interface LocationDTO {
  locationId: string;
  workspaceId: string;
  name: string;
  type: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class Location extends AggregateRoot {
  private deletionMarked = false;
  private constructor(private props: LocationProps) {
    super();
  }

  static create(data: CreateLocationData): Location {
    if (!UuidId.isValid(data.workspaceId)) throw new InvalidInventoryDataError('Invalid workspace ID');
    const name = data.name?.trim();
    if (!name || name.length < LOCATION_NAME_MIN_LENGTH) {
      throw new InvalidInventoryDataError('Location name is required');
    }
    if (name.length > LOCATION_NAME_MAX_LENGTH) {
      throw new InvalidInventoryDataError(
        `Location name cannot exceed ${LOCATION_NAME_MAX_LENGTH} characters`
      );
    }
    if (data.type !== undefined && !Object.values(LocationType).includes(data.type)) {
      throw new InvalidInventoryDataError('Invalid location type');
    }

    const now = new Date();
    const location = new Location({
      id: LocationId.create(),
      workspaceId: data.workspaceId,
      name,
      type: data.type || LocationType.WAREHOUSE,
      address: data.address || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    location.addDomainEvent(
      new LocationCreatedEvent(
        location.id.getValue(),
        location.workspaceId,
        location.name
      )
    );

    return location;
  }

  static fromPersistence(props: LocationProps): Location {
    return new Location({ ...props, createdAt: new Date(props.createdAt), updatedAt: new Date(props.updatedAt) });
  }

  updateName(name: string): void {
    const normalized = name?.trim();
    if (!normalized || normalized.length < LOCATION_NAME_MIN_LENGTH) {
      throw new InvalidInventoryDataError('Location name is required');
    }
    if (normalized.length > LOCATION_NAME_MAX_LENGTH) {
      throw new InvalidInventoryDataError(`Location name cannot exceed ${LOCATION_NAME_MAX_LENGTH} characters`);
    }
    if (normalized === this.props.name) return;
    this.props.name = normalized;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new LocationUpdatedEvent(this.id.getValue(), this.workspaceId));
  }

  updateType(type: LocationType): void {
    if (!Object.values(LocationType).includes(type)) throw new InvalidInventoryDataError('Invalid location type');
    if (type === this.props.type) return;
    this.props.type = type;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new LocationUpdatedEvent(this.id.getValue(), this.workspaceId));
  }

  updateAddress(address: string | null): void {
    if (address === this.props.address) return;
    this.props.address = address;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new LocationUpdatedEvent(this.id.getValue(), this.workspaceId));
  }

  deactivate(): void {
    if (!this.props.isActive) return;
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new LocationDeactivatedEvent(this.id.getValue(), this.workspaceId));
  }

  activate(): void {
    if (this.props.isActive) return;
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new LocationActivatedEvent(this.id.getValue(), this.workspaceId));
  }

  markAsDeleted(): void {
    if (this.deletionMarked) return;
    this.deletionMarked = true;
    this.addDomainEvent(
      new LocationDeletedEvent(this.id.getValue(), this.workspaceId)
    );
  }

  get id(): LocationId {
    return this.props.id;
  }
  get workspaceId(): string {
    return this.props.workspaceId;
  }
  get name(): string {
    return this.props.name;
  }
  get type(): LocationType {
    return this.props.type;
  }
  get address(): string | null {
    return this.props.address;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  equals(other: Location): boolean {
    return this.props.id.equals(other.props.id);
  }

  static toDTO(location: Location): LocationDTO {
    return {
      locationId: location.id.getValue(),
      workspaceId: location.workspaceId,
      name: location.name,
      type: location.type,
      address: location.address,
      isActive: location.isActive,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString(),
    };
  }
}
