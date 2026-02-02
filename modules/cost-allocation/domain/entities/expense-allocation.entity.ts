import { AllocationAmount } from "../value-objects/allocation-amount";
import { DepartmentId } from "../value-objects/department-id";
import { CostCenterId } from "../value-objects/cost-center-id";
import { ProjectId } from "../value-objects/project-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { Decimal } from "@prisma/client/runtime/library";
import { InvalidAllocationTargetError } from "../errors/cost-allocation.errors";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events/domain-event";
import * as crypto from "crypto";

// ============================================================================
// Domain Events
// ============================================================================

export class ExpenseAllocationCreatedEvent extends DomainEvent {
  constructor(
    public readonly allocationId: string,
    public readonly workspaceId: string,
    public readonly expenseId: string,
    public readonly amount: string,
    public readonly targetType: "department" | "costCenter" | "project",
    public readonly targetId: string,
    public readonly createdBy: string,
  ) {
    super(allocationId, "ExpenseAllocation");
  }

  get eventType(): string {
    return "ExpenseAllocationCreated";
  }

  getPayload(): Record<string, unknown> {
    return {
      allocationId: this.allocationId,
      workspaceId: this.workspaceId,
      expenseId: this.expenseId,
      amount: this.amount,
      targetType: this.targetType,
      targetId: this.targetId,
      createdBy: this.createdBy,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class ExpenseAllocation extends AggregateRoot {
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
  ) {
    super();
  }

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
      throw new InvalidAllocationTargetError(
        "ExpenseAllocation must target exactly one of Department, CostCenter, or Project.",
      );
    }

    // Determine target type and ID
    let targetType: "department" | "costCenter" | "project";
    let targetId: string;
    if (params.departmentId) {
      targetType = "department";
      targetId = params.departmentId.getValue();
    } else if (params.costCenterId) {
      targetType = "costCenter";
      targetId = params.costCenterId.getValue();
    } else {
      targetType = "project";
      targetId = params.projectId!.getValue();
    }

    const allocation = new ExpenseAllocation(
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

    allocation.addDomainEvent(
      new ExpenseAllocationCreatedEvent(
        allocation.id,
        params.workspaceId.getValue(),
        params.expenseId,
        params.amount.getValue().toString(),
        targetType,
        targetId,
        params.createdBy.getValue(),
      ),
    );

    return allocation;
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
