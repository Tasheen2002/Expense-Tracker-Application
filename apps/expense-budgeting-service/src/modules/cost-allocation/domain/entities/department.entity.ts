import { DepartmentId } from '../value-objects/department-id';
import { DepartmentCode } from '../value-objects/department-code';
import { InvalidAllocationNameError, InvalidDepartmentHierarchyError } from '../errors/cost-allocation.errors';
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';

export interface DepartmentDTO {
  id: string;
  workspaceId: string;
  name: string;
  code: string;
  description: string | null;
  managerId: string | null;
  parentDepartmentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Domain Events
// ============================================================================

export class DepartmentCreatedEvent extends DomainEvent {
  constructor(
    public readonly departmentId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly code: string
  ) {
    super(departmentId, 'Department');
  }

  get eventType(): string {
    return 'DepartmentCreated';
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
    public readonly changes: Record<string, unknown>
  ) {
    super(departmentId, 'Department');
  }

  get eventType(): string {
    return 'DepartmentUpdated';
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
    super(departmentId, 'Department');
  }

  get eventType(): string {
    return 'DepartmentActivated';
  }

  getPayload(): Record<string, unknown> {
    return { departmentId: this.departmentId };
  }
}

export class DepartmentDeactivatedEvent extends DomainEvent {
  constructor(public readonly departmentId: string) {
    super(departmentId, 'Department');
  }

  get eventType(): string {
    return 'DepartmentDeactivated';
  }

  getPayload(): Record<string, unknown> {
    return { departmentId: this.departmentId };
  }
}

// ============================================================================
// Entity
// ============================================================================

interface DepartmentProps {
  id: DepartmentId;
  workspaceId: WorkspaceId;
  name: string;
  code: string;
  description: string | null;
  managerId: UserId | null;
  parentDepartmentId: DepartmentId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export class Department extends AggregateRoot {
  private constructor(private props: DepartmentProps) {
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
    const department = new Department({
      id: DepartmentId.create(),
      workspaceId: params.workspaceId,
      name: Department.validName(params.name),
      code: DepartmentCode.create(params.code).value,
      description: params.description || null,
      managerId: params.managerId || null,
      parentDepartmentId: params.parentDepartmentId || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    department.addDomainEvent(
      new DepartmentCreatedEvent(
        department.props.id.getValue(),
        params.workspaceId.getValue(),
        department.props.name,
        department.props.code
      )
    );

    return department;
  }

  static fromPersistence(params: {
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
    version?: number;
  }): Department {
    return new Department({
      id: DepartmentId.fromString(params.id),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      name: params.name,
      code: params.code,
      description: params.description,
      managerId: params.managerId ? UserId.fromString(params.managerId) : null,
      parentDepartmentId: params.parentDepartmentId
        ? DepartmentId.fromString(params.parentDepartmentId)
        : null,
      isActive: params.isActive,
      createdAt: new Date(params.createdAt),
      updatedAt: new Date(params.updatedAt),
      version: params.version ?? 1,
    });
  }

  get id(): DepartmentId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get code(): string { return this.props.code; }
  get description(): string | null { return this.props.description; }
  get managerId(): UserId | null { return this.props.managerId; }
  get parentDepartmentId(): DepartmentId | null { return this.props.parentDepartmentId; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return new Date(this.props.createdAt); }
  get updatedAt(): Date { return new Date(this.props.updatedAt); }
  get version(): number { return this.props.version; }
  synchronizeVersion(version: number): void { this.props.version = version; }

  private static validName(name: string): string {
    const normalized = typeof name === 'string' ? name.trim() : '';
    if (normalized.length < 2 || normalized.length > 100) {
      throw new InvalidAllocationNameError('Department');
    }
    return normalized;
  }

  updateDetails(params: {
    name?: string;
    code?: string;
    description?: string | null;
    managerId?: UserId | null;
    parentDepartmentId?: DepartmentId | null;
  }): void {
    const code = params.code === undefined ? undefined : DepartmentCode.create(params.code).value;
    const name = params.name === undefined ? undefined : Department.validName(params.name);
    if (params.parentDepartmentId?.equals(this.props.id)) {
      throw new InvalidDepartmentHierarchyError('a department cannot be its own parent');
    }
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
    if (params.managerId !== undefined) {
      this.props.managerId = params.managerId;
      changes.managerId = params.managerId?.getValue() ?? null;
    }
    if (params.parentDepartmentId !== undefined) {
      this.props.parentDepartmentId = params.parentDepartmentId;
      changes.parentDepartmentId = params.parentDepartmentId?.getValue() ?? null;
    }
    if (Object.keys(changes).length > 0) {
      this.props.updatedAt = new Date();
      this.addDomainEvent(
        new DepartmentUpdatedEvent(this.props.id.getValue(), changes)
      );
    }
  }

  deactivate(): void {
    if (!this.props.isActive) return;
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new DepartmentDeactivatedEvent(this.props.id.getValue()));
  }

  activate(): void {
    if (this.props.isActive) return;
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new DepartmentActivatedEvent(this.props.id.getValue()));
  }

  static toDTO(department: Department): DepartmentDTO {
    return {
      id: department.props.id.getValue(),
      workspaceId: department.props.workspaceId.getValue(),
      name: department.props.name,
      code: department.props.code,
      description: department.props.description,
      managerId: department.props.managerId?.getValue() ?? null,
      parentDepartmentId: department.props.parentDepartmentId?.getValue() ?? null,
      isActive: department.props.isActive,
      createdAt: department.props.createdAt.toISOString(),
      updatedAt: department.props.updatedAt.toISOString(),
    };
  }
}
