import { DepartmentId } from "../value-objects/department-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";

export class Department {
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
  ) {}

  static create(params: {
    workspaceId: WorkspaceId;
    name: string;
    code: string;
    description?: string | null;
    managerId?: UserId | null;
    parentDepartmentId?: DepartmentId | null;
  }): Department {
    return new Department(
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
    if (params.name !== undefined) this.name = params.name;
    if (params.code !== undefined) this.code = params.code;
    if (params.description !== undefined) this.description = params.description;
    if (params.managerId !== undefined) this.managerId = params.managerId;
    if (params.parentDepartmentId !== undefined)
      this.parentDepartmentId = params.parentDepartmentId;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }
}
