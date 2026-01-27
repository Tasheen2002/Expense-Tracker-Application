import { CostCenterId } from "../value-objects/cost-center-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";

export class CostCenter {
  private constructor(
    private readonly id: CostCenterId,
    private readonly workspaceId: WorkspaceId,
    private name: string,
    private code: string,
    private description: string | null,
    private isActive: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: {
    workspaceId: WorkspaceId;
    name: string;
    code: string;
    description?: string | null;
  }): CostCenter {
    return new CostCenter(
      CostCenterId.create(),
      params.workspaceId,
      params.name,
      params.code,
      params.description || null,
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
    if (params.name !== undefined) this.name = params.name;
    if (params.code !== undefined) this.code = params.code;
    if (params.description !== undefined) this.description = params.description;
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
