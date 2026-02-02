import { DepartmentId } from "../value-objects/department-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events/domain-event";

// ============================================================================
// Domain Events
// ============================================================================

export class DepartmentCreatedEvent extends DomainEvent {
  constructor(
    public readonly departmentId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly code: string,
  ) {
    super(departmentId, "Department");
  }

  get eventType(): string {
    return "DepartmentCreated";
  }

  getPayload(): Record<string, unknown> {
    return {
      departmentId: this.departmentId,
      workspaceId: this.workspaceId,
      name: this.name,
      code: this.code,
    };
  }
}

export class DepartmentUpdatedEvent extends DomainEvent {
  constructor(
    public readonly departmentId: string,
    public readonly changes: Record<string, unknown>,
  ) {
    super(departmentId, "Department");
  }

  get eventType(): string {
    return "DepartmentUpdated";
  }

  getPayload(): Record<string, unknown> {
    return {
      departmentId: this.departmentId,
      changes: this.changes,
    };
  }
}

export class DepartmentActivatedEvent extends DomainEvent {
  constructor(public readonly departmentId: string) {
    super(departmentId, "Department");
  }

  get eventType(): string {
    return "DepartmentActivated";
  }

  getPayload(): Record<string, unknown> {
    return { departmentId: this.departmentId };
  }
}

export class DepartmentDeactivatedEvent extends DomainEvent {
  constructor(public readonly departmentId: string) {
    super(departmentId, "Department");
  }

  get eventType(): string {
    return "DepartmentDeactivated";
  }

  getPayload(): Record<string, unknown> {
    return { departmentId: this.departmentId };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class Department extends AggregateRoot {
  private constructor(
    private readonly id: DepartmentId,
    private readonly workspaceId: WorkspaceId,
    private name: string,
    private code: string,
    private description: string | null,
    private managerId: UserId | null,
    private parentDepartmentId: DepartmentId | null,
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
    managerId?: UserId | null;
    parentDepartmentId?: DepartmentId | null;
  }): Department {
    const department = new Department(
      DepartmentId.create(),
      params.workspaceId,
      params.name,
      params.code,
      params.description || null,
      params.managerId || null,
      params.parentDepartmentId || null,
      true,
      new Date(),
      new Date(),
    );

    department.addDomainEvent(
      new DepartmentCreatedEvent(
        department.id.getValue(),
        params.workspaceId.getValue(),
        params.name,
        params.code,
      ),
    );

    return department;
  }

  static reconstitute(params: {
    id: string;
    workspaceId: string;
    name: string;
    code: string;
    description: string | null;
    managerId: string | null;
    parentDepartmentId: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Department {
    return new Department(
      DepartmentId.fromString(params.id),
      WorkspaceId.fromString(params.workspaceId),
      params.name,
      params.code,
      params.description,
      params.managerId ? UserId.fromString(params.managerId) : null,
      params.parentDepartmentId
        ? DepartmentId.fromString(params.parentDepartmentId)
        : null,
      params.isActive,
      params.createdAt,
      params.updatedAt,
    );
  }

  getId(): DepartmentId {
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

  getManagerId(): UserId | null {
    return this.managerId;
  }

  getParentDepartmentId(): DepartmentId | null {
    return this.parentDepartmentId;
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
    managerId?: UserId | null;
    parentDepartmentId?: DepartmentId | null;
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
    if (params.managerId !== undefined) {
      this.managerId = params.managerId;
      changes.managerId = params.managerId?.getValue() ?? null;
    }
    if (params.parentDepartmentId !== undefined) {
      this.parentDepartmentId = params.parentDepartmentId;
      changes.parentDepartmentId =
        params.parentDepartmentId?.getValue() ?? null;
    }
    this.updatedAt = new Date();

    if (Object.keys(changes).length > 0) {
      this.addDomainEvent(
        new DepartmentUpdatedEvent(this.id.getValue(), changes),
      );
    }
  }

  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.updatedAt = new Date();
    this.addDomainEvent(new DepartmentDeactivatedEvent(this.id.getValue()));
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.updatedAt = new Date();
    this.addDomainEvent(new DepartmentActivatedEvent(this.id.getValue()));
  }
}
