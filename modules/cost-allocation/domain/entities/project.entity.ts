import { ProjectId } from "../value-objects/project-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { Decimal } from "@prisma/client/runtime/library";

export class Project {
  private constructor(
    private readonly id: ProjectId,
    private readonly workspaceId: WorkspaceId,
    private name: string,
    private code: string,
    private description: string | null,
    private startDate: Date,
    private endDate: Date | null,
    private managerId: UserId | null,
    private isActive: boolean,
    private budget: Decimal | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: {
    workspaceId: WorkspaceId;
    name: string;
    code: string;
    startDate: Date;
    description?: string | null;
    endDate?: Date | null;
    managerId?: UserId | null;
    budget?: Decimal | null;
  }): Project {
    return new Project(
      ProjectId.create(),
      params.workspaceId,
      params.name,
      params.code,
      params.description || null,
      params.startDate,
      params.endDate || null,
      params.managerId || null,
      true,
      params.budget || null,
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
    startDate: Date;
    endDate: Date | null;
    managerId: string | null;
    isActive: boolean;
    budget: Decimal | null;
    createdAt: Date;
    updatedAt: Date;
  }): Project {
    return new Project(
      ProjectId.fromString(params.id),
      WorkspaceId.fromString(params.workspaceId),
      params.name,
      params.code,
      params.description,
      params.startDate,
      params.endDate,
      params.managerId ? UserId.fromString(params.managerId) : null,
      params.isActive,
      params.budget,
      params.createdAt,
      params.updatedAt,
    );
  }

  getId(): ProjectId {
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

  getStartDate(): Date {
    return this.startDate;
  }

  getEndDate(): Date | null {
    return this.endDate;
  }

  getManagerId(): UserId | null {
    return this.managerId;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getBudget(): Decimal | null {
    return this.budget;
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
    startDate?: Date;
    endDate?: Date | null;
    managerId?: UserId | null;
    budget?: Decimal | null;
  }): void {
    if (params.name !== undefined) this.name = params.name;
    if (params.code !== undefined) this.code = params.code;
    if (params.description !== undefined) this.description = params.description;
    if (params.startDate !== undefined) this.startDate = params.startDate;
    if (params.endDate !== undefined) this.endDate = params.endDate;
    if (params.managerId !== undefined) this.managerId = params.managerId;
    if (params.budget !== undefined) this.budget = params.budget;
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
