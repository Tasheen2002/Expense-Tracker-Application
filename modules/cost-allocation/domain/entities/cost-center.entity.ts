import { CostCenterId } from "../value-objects/cost-center-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events/domain-event";

// ============================================================================
// Domain Events
// ============================================================================

export class CostCenterCreatedEvent extends DomainEvent {
  constructor(
    public readonly costCenterId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly code: string,
  ) {
    super(costCenterId, "CostCenter");
  }

  get eventType(): string {
    return "CostCenterCreated";
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
  ) {
    super(costCenterId, "CostCenter");
  }

  get eventType(): string {
    return "CostCenterUpdated";
  }

  getPayload(): Record<string, unknown> {
    return {
      costCenterId: this.costCenterId,
      changes: this.changes,
    };
  }
}

export class CostCenterActivatedEvent extends DomainEvent {
  constructor(public readonly costCenterId: string) {
    super(costCenterId, "CostCenter");
  }

  get eventType(): string {
    return "CostCenterActivated";
  }

  getPayload(): Record<string, unknown> {
    return { costCenterId: this.costCenterId };
  }
}

export class CostCenterDeactivatedEvent extends DomainEvent {
  constructor(public readonly costCenterId: string) {
    super(costCenterId, "CostCenter");
  }

  get eventType(): string {
    return "CostCenterDeactivated";
  }

  getPayload(): Record<string, unknown> {
    return { costCenterId: this.costCenterId };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class CostCenter extends AggregateRoot {
  private constructor(
    private readonly id: CostCenterId,
    private readonly workspaceId: WorkspaceId,
    private name: string,
    private code: string,
    private description: string | null,
    private isActive: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static create(params: {
    workspaceId: WorkspaceId;
    name: string;
    code: string;
    description?: string | null;
  }): CostCenter {
    const costCenter = new CostCenter(
      CostCenterId.create(),
      params.workspaceId,
      params.name,
      params.code,
      params.description || null,
      true,
      new Date(),
      new Date(),
    );

    costCenter.addDomainEvent(
      new CostCenterCreatedEvent(
        costCenter.id.getValue(),
        params.workspaceId.getValue(),
        params.name,
        params.code,
      ),
    );

    return costCenter;
  }

  static reconstitute(params: {
    id: string;
    workspaceId: string;
    name: string;
    code: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CostCenter {
    return new CostCenter(
      CostCenterId.fromString(params.id),
      WorkspaceId.fromString(params.workspaceId),
      params.name,
      params.code,
      params.description,
      params.isActive,
      params.createdAt,
      params.updatedAt,
    );
  }

  getId(): CostCenterId {
    return this.id;
  }

  getWorkspaceId(): WorkspaceId {
    return this.workspaceId;
  }

  getName(): string {
    return this.name;
  }

  getCode(): string {
    return this.code;
  }

  getDescription(): string | null {
    return this.description;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateDetails(params: {
    name?: string;
    code?: string;
    description?: string | null;
  }): void {
    const changes: Record<string, unknown> = {};
    if (params.name !== undefined) {
      this.name = params.name;
      changes.name = params.name;
    }
    if (params.code !== undefined) {
      this.code = params.code;
      changes.code = params.code;
    }
    if (params.description !== undefined) {
      this.description = params.description;
      changes.description = params.description;
    }
    this.updatedAt = new Date();

    if (Object.keys(changes).length > 0) {
      this.addDomainEvent(
        new CostCenterUpdatedEvent(this.id.getValue(), changes),
      );
    }
  }

  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.updatedAt = new Date();
    this.addDomainEvent(new CostCenterDeactivatedEvent(this.id.getValue()));
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.updatedAt = new Date();
    this.addDomainEvent(new CostCenterActivatedEvent(this.id.getValue()));
  }
}
