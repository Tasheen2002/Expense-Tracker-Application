import { CostCenterId } from '../value-objects/cost-center-id';
import { CostCenterCode } from '../value-objects/cost-center-code';
import { InvalidAllocationNameError } from '../errors/cost-allocation.errors';
import {  WorkspaceId  } from '@core/domain/value-objects';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';

export interface CostCenterDTO {
  id: string;
  workspaceId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Domain Events
// ============================================================================

export class CostCenterCreatedEvent extends DomainEvent {
  constructor(
    public readonly costCenterId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly code: string
  ) {
    super(costCenterId, 'CostCenter');
  }

  get eventType(): string {
    return 'CostCenterCreated';
  }

  getPayload(): Record<string, unknown> {
    return {
      costCenterId: this.costCenterId,
      workspaceId: this.workspaceId,
      name: this.name,
      code: this.code,
    };
  }
}

export class CostCenterUpdatedEvent extends DomainEvent {
  constructor(
    public readonly costCenterId: string,
    public readonly changes: Record<string, unknown>,
    public readonly workspaceId: string
  ) {
    super(costCenterId, 'CostCenter');
  }

  get eventType(): string {
    return 'CostCenterUpdated';
  }

  getPayload(): Record<string, unknown> {
    return {
      costCenterId: this.costCenterId,
      workspaceId: this.workspaceId,
      changes: this.changes,
    };
  }
}

export class CostCenterActivatedEvent extends DomainEvent {
  constructor(public readonly costCenterId: string, public readonly workspaceId: string) {
    super(costCenterId, 'CostCenter');
  }

  get eventType(): string {
    return 'CostCenterActivated';
  }

  getPayload(): Record<string, unknown> {
    return { costCenterId: this.costCenterId, workspaceId: this.workspaceId };
  }
}

export class CostCenterDeactivatedEvent extends DomainEvent {
  constructor(public readonly costCenterId: string, public readonly workspaceId: string) {
    super(costCenterId, 'CostCenter');
  }

  get eventType(): string {
    return 'CostCenterDeactivated';
  }

  getPayload(): Record<string, unknown> {
    return { costCenterId: this.costCenterId, workspaceId: this.workspaceId };
  }
}

// ============================================================================
// Entity
// ============================================================================

interface CostCenterProps {
  id: CostCenterId;
  workspaceId: WorkspaceId;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export class CostCenter extends AggregateRoot {
  private constructor(private props: CostCenterProps) {
    super();
  }

  static create(params: {
    workspaceId: WorkspaceId;
    name: string;
    code: string;
    description?: string | null;
  }): CostCenter {
    const costCenter = new CostCenter({
      id: CostCenterId.create(),
      workspaceId: params.workspaceId,
      name: CostCenter.validName(params.name),
      code: CostCenterCode.create(params.code).value,
      description: params.description || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    costCenter.addDomainEvent(
      new CostCenterCreatedEvent(
        costCenter.props.id.getValue(),
        params.workspaceId.getValue(),
        costCenter.props.name,
        costCenter.props.code
      )
    );

    return costCenter;
  }

  static fromPersistence(params: {
    id: string;
    workspaceId: string;
    name: string;
    code: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    version?: number;
  }): CostCenter {
    return new CostCenter({
      id: CostCenterId.fromString(params.id),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      name: params.name,
      code: params.code,
      description: params.description,
      isActive: params.isActive,
      createdAt: new Date(params.createdAt),
      updatedAt: new Date(params.updatedAt),
      version: params.version ?? 1,
    });
  }

  get id(): CostCenterId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get code(): string { return this.props.code; }
  get description(): string | null { return this.props.description; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return new Date(this.props.createdAt); }
  get updatedAt(): Date { return new Date(this.props.updatedAt); }
  get version(): number { return this.props.version; }
  synchronizeVersion(version: number): void { this.props.version = version; }

  private static validName(name: string): string {
    const normalized = typeof name === 'string' ? name.trim() : '';
    if (normalized.length < 2 || normalized.length > 100) {
      throw new InvalidAllocationNameError('Cost center');
    }
    return normalized;
  }

  updateDetails(params: {
    name?: string;
    code?: string;
    description?: string | null;
  }): void {
    const code = params.code === undefined ? undefined : CostCenterCode.create(params.code).value;
    const name = params.name === undefined ? undefined : CostCenter.validName(params.name);
    const changes: Record<string, unknown> = {};
    if (name !== undefined) {
      this.props.name = name;
      changes.name = name;
    }
    if (code !== undefined) {
      this.props.code = code;
      changes.code = this.props.code;
    }
    if (params.description !== undefined) {
      this.props.description = params.description;
      changes.description = params.description;
    }
    if (Object.keys(changes).length > 0) {
      this.props.updatedAt = new Date();
      this.addDomainEvent(
        new CostCenterUpdatedEvent(this.props.id.getValue(), changes, this.props.workspaceId.getValue())
      );
    }
  }

  deactivate(): void {
    if (!this.props.isActive) return;
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CostCenterDeactivatedEvent(this.props.id.getValue(), this.props.workspaceId.getValue()));
  }

  activate(): void {
    if (this.props.isActive) return;
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CostCenterActivatedEvent(this.props.id.getValue(), this.props.workspaceId.getValue()));
  }

  static toDTO(costCenter: CostCenter): CostCenterDTO {
    return {
      id: costCenter.props.id.getValue(),
      workspaceId: costCenter.props.workspaceId.getValue(),
      name: costCenter.props.name,
      code: costCenter.props.code,
      description: costCenter.props.description,
      isActive: costCenter.props.isActive,
      createdAt: costCenter.props.createdAt.toISOString(),
      updatedAt: costCenter.props.updatedAt.toISOString(),
    };
  }
}
