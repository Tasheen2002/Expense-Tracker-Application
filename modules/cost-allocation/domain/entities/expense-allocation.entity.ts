import { AllocationAmount } from "../value-objects/allocation-amount";
import { DepartmentId } from "../value-objects/department-id";
import { CostCenterId } from "../value-objects/cost-center-id";
import { ProjectId } from "../value-objects/project-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { Decimal } from "@prisma/client/runtime/library";

export class ExpenseAllocation {
  private constructor(
    private readonly id: string, // Using string UUID for simplicity in this entity
    private readonly workspaceId: WorkspaceId,
    private readonly expenseId: string,
    private readonly amount: AllocationAmount,
    private readonly percentage: Decimal | null,
    private readonly departmentId: DepartmentId | null,
    private readonly costCenterId: CostCenterId | null,
    private readonly projectId: ProjectId | null,
    private readonly notes: string | null,
    private readonly createdBy: UserId,
    private readonly createdAt: Date,
  ) {}

  static create(params: {
    workspaceId: WorkspaceId;
    expenseId: string;
    amount: AllocationAmount;
    percentage?: Decimal | null;
    departmentId?: DepartmentId | null;
    costCenterId?: CostCenterId | null;
    projectId?: ProjectId | null;
    notes?: string | null;
    createdBy: UserId;
  }): ExpenseAllocation {
    // Validate that exactly one target is provided
    const targets = [
      params.departmentId,
      params.costCenterId,
      params.projectId,
    ].filter(Boolean);
    if (targets.length !== 1) {
      throw new Error(
        "ExpenseAllocation must target exactly one of Department, CostCenter, or Project.",
      );
    }

    return new ExpenseAllocation(
      crypto.randomUUID(),
      params.workspaceId,
      params.expenseId,
      params.amount,
      params.percentage || null,
      params.departmentId || null,
      params.costCenterId || null,
      params.projectId || null,
      params.notes || null,
      params.createdBy,
      new Date(),
    );
  }

  static reconstitute(params: {
    id: string;
    workspaceId: string;
    expenseId: string;
    amount: Decimal;
    percentage: Decimal | null;
    departmentId: string | null;
    costCenterId: string | null;
    projectId: string | null;
    notes: string | null;
    createdBy: string;
    createdAt: Date;
  }): ExpenseAllocation {
    return new ExpenseAllocation(
      params.id,
      WorkspaceId.fromString(params.workspaceId),
      params.expenseId,
      AllocationAmount.create(params.amount),
      params.percentage,
      params.departmentId ? DepartmentId.fromString(params.departmentId) : null,
      params.costCenterId ? CostCenterId.fromString(params.costCenterId) : null,
      params.projectId ? ProjectId.fromString(params.projectId) : null,
      params.notes,
      UserId.fromString(params.createdBy),
      params.createdAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getWorkspaceId(): WorkspaceId {
    return this.workspaceId;
  }

  getExpenseId(): string {
    return this.expenseId;
  }

  getAmount(): AllocationAmount {
    return this.amount;
  }

  getPercentage(): Decimal | null {
    return this.percentage;
  }

  getDepartmentId(): DepartmentId | null {
    return this.departmentId;
  }

  getCostCenterId(): CostCenterId | null {
    return this.costCenterId;
  }

  getProjectId(): ProjectId | null {
    return this.projectId;
  }

  getNotes(): string | null {
    return this.notes;
  }

  getCreatedBy(): UserId {
    return this.createdBy;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
