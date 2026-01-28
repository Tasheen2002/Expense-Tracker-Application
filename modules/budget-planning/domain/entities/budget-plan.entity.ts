import { PlanId } from "../value-objects/plan-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { PlanPeriod } from "../value-objects/plan-period";
import { PlanStatus } from "../enums/plan-status.enum";

export class BudgetPlan {
  private constructor(
    private readonly id: PlanId,
    private readonly workspaceId: WorkspaceId,
    private name: string,
    private description: string | null,
    private readonly period: PlanPeriod,
    private status: PlanStatus,
    private readonly createdBy: UserId,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: {
    workspaceId: WorkspaceId;
    name: string;
    description?: string | null;
    period: PlanPeriod;
    createdBy: UserId;
  }): BudgetPlan {
    return new BudgetPlan(
      PlanId.create(),
      params.workspaceId,
      params.name,
      params.description || null,
      params.period,
      PlanStatus.DRAFT,
      params.createdBy,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(params: {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    startDate: Date;
    endDate: Date;
    status: PlanStatus;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): BudgetPlan {
    return new BudgetPlan(
      PlanId.fromString(params.id),
      WorkspaceId.fromString(params.workspaceId),
      params.name,
      params.description,
      PlanPeriod.create(params.startDate, params.endDate),
      params.status,
      UserId.fromString(params.createdBy),
      params.createdAt,
      params.updatedAt,
    );
  }

  getId(): PlanId {
    return this.id;
  }

  getWorkspaceId(): WorkspaceId {
    return this.workspaceId;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  getPeriod(): PlanPeriod {
    return this.period;
  }

  getStatus(): PlanStatus {
    return this.status;
  }

  getCreatedBy(): UserId {
    return this.createdBy;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateDetails(name?: string, description?: string | null): void {
    if (name) this.name = name;
    if (description !== undefined) this.description = description;
    this.updatedAt = new Date();
  }

  updateStatus(status: PlanStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }
}
