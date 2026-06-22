import { AllocationAmount } from '../value-objects/allocation-amount';
import { AllocationId } from '../value-objects/allocation-id';
import { DepartmentId } from '../value-objects/department-id';
import { CostCenterId } from '../value-objects/cost-center-id';
import { ProjectId } from '../value-objects/project-id';
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import { InvalidAllocationTargetError } from '../errors/cost-allocation.errors';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';

export interface ExpenseAllocationDTO {
  id: string;
  workspaceId: string;
  expenseId: string;
  amount: string;
  percentage: string | null;
  departmentId: string | null;
  costCenterId: string | null;
  projectId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

// ============================================================================
// Domain Events
// ============================================================================

export class ExpenseAllocationCreatedEvent extends DomainEvent {
  constructor(
    public readonly allocationId: string,
    public readonly workspaceId: string,
    public readonly expenseId: string,
    public readonly amount: string,
    public readonly targetType: 'department' | 'costCenter' | 'project',
    public readonly targetId: string,
    public readonly createdBy: string
  ) {
    super(allocationId, 'ExpenseAllocation');
  }

  get eventType(): string {
    return 'ExpenseAllocationCreated';
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

export class ExpenseAllocationDeletedEvent extends DomainEvent {
  constructor(
    public readonly allocationId: string,
    public readonly workspaceId: string,
    public readonly expenseId: string
  ) {
    super(allocationId, 'ExpenseAllocation');
  }

  get eventType(): string {
    return 'ExpenseAllocationDeleted';
  }

  getPayload(): Record<string, unknown> {
    return {
      allocationId: this.allocationId,
      workspaceId: this.workspaceId,
      expenseId: this.expenseId,
    };
  }
}

export class ExpenseAllocationsReplacedEvent extends DomainEvent {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly newAllocationCount: number
  ) {
    // Uses the expenseId as the aggregate identifier since this event
    // represents the replacement of ALL allocations for a given expense.
    super(expenseId, 'ExpenseAllocation');
  }

  get eventType(): string {
    return 'ExpenseAllocationsReplaced';
  }

  getPayload(): Record<string, unknown> {
    return {
      expenseId: this.expenseId,
      workspaceId: this.workspaceId,
      newAllocationCount: this.newAllocationCount,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

interface ExpenseAllocationProps {
  id: AllocationId;
  workspaceId: WorkspaceId;
  expenseId: string;
  amount: AllocationAmount;
  percentage: number | null;
  departmentId: DepartmentId | null;
  costCenterId: CostCenterId | null;
  projectId: ProjectId | null;
  notes: string | null;
  createdBy: UserId;
  createdAt: Date;
}

export class ExpenseAllocation extends AggregateRoot {
  private constructor(private props: ExpenseAllocationProps) {
    super();
  }

  static create(params: {
    workspaceId: WorkspaceId;
    expenseId: string;
    amount: AllocationAmount;
    percentage?: number | null;
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
        'ExpenseAllocation must target exactly one of Department, CostCenter, or Project.'
      );
    }

    // Determine target type and ID
    let targetType: 'department' | 'costCenter' | 'project';
    let targetId: string;
    if (params.departmentId) {
      targetType = 'department';
      targetId = params.departmentId.getValue();
    } else if (params.costCenterId) {
      targetType = 'costCenter';
      targetId = params.costCenterId.getValue();
    } else {
      targetType = 'project';
      targetId = params.projectId!.getValue();
    }

    const allocation = new ExpenseAllocation({
      id: AllocationId.create(),
      workspaceId: params.workspaceId,
      expenseId: params.expenseId,
      amount: params.amount,
      percentage: params.percentage ?? null,
      departmentId: params.departmentId || null,
      costCenterId: params.costCenterId || null,
      projectId: params.projectId || null,
      notes: params.notes || null,
      createdBy: params.createdBy,
      createdAt: new Date(),
    });

    allocation.addDomainEvent(
      new ExpenseAllocationCreatedEvent(
        allocation.props.id.getValue(),
        params.workspaceId.getValue(),
        params.expenseId,
        params.amount.getValue().toString(),
        targetType,
        targetId,
        params.createdBy.getValue()
      )
    );

    return allocation;
  }

  static fromPersistence(params: {
    id: string;
    workspaceId: string;
    expenseId: string;
    amount: AllocationAmount;
    percentage: number | null;
    departmentId: string | null;
    costCenterId: string | null;
    projectId: string | null;
    notes: string | null;
    createdBy: string;
    createdAt: Date;
  }): ExpenseAllocation {
    return new ExpenseAllocation({
      id: AllocationId.fromString(params.id),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      expenseId: params.expenseId,
      amount: params.amount,
      percentage: params.percentage,
      departmentId: params.departmentId ? DepartmentId.fromString(params.departmentId) : null,
      costCenterId: params.costCenterId ? CostCenterId.fromString(params.costCenterId) : null,
      projectId: params.projectId ? ProjectId.fromString(params.projectId) : null,
      notes: params.notes,
      createdBy: UserId.fromString(params.createdBy),
      createdAt: params.createdAt,
    });
  }

  get id(): AllocationId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get expenseId(): string { return this.props.expenseId; }
  get amount(): AllocationAmount { return this.props.amount; }
  get percentage(): number | null { return this.props.percentage; }
  get departmentId(): DepartmentId | null { return this.props.departmentId; }
  get costCenterId(): CostCenterId | null { return this.props.costCenterId; }
  get projectId(): ProjectId | null { return this.props.projectId; }
  get notes(): string | null { return this.props.notes; }
  get createdBy(): UserId { return this.props.createdBy; }
  get createdAt(): Date { return this.props.createdAt; }

  /**
   * Marks this allocation as deleted and emits a domain event.
   * Call this before persisting the deletion so the event can be dispatched.
   */
  markAsDeleted(): void {
    this.addDomainEvent(
      new ExpenseAllocationDeletedEvent(
        this.props.id.getValue(),
        this.props.workspaceId.getValue(),
        this.props.expenseId
      )
    );
  }

  /**
   * Records that all allocations for the given expense have been replaced.
   */
  recordReplacement(expenseId: string, workspaceId: string, newAllocationCount: number): void {
    this.addDomainEvent(
      new ExpenseAllocationsReplacedEvent(expenseId, workspaceId, newAllocationCount)
    );
  }

  static toDTO(allocation: ExpenseAllocation): ExpenseAllocationDTO {
    return {
      id: allocation.props.id.getValue(),
      workspaceId: allocation.props.workspaceId.getValue(),
      expenseId: allocation.props.expenseId,
      amount: allocation.props.amount.getValue().toString(),
      percentage: allocation.props.percentage !== null ? String(allocation.props.percentage) : null,
      departmentId: allocation.props.departmentId?.getValue() ?? null,
      costCenterId: allocation.props.costCenterId?.getValue() ?? null,
      projectId: allocation.props.projectId?.getValue() ?? null,
      notes: allocation.props.notes,
      createdBy: allocation.props.createdBy.getValue(),
      createdAt: allocation.props.createdAt.toISOString(),
    };
  }
}
