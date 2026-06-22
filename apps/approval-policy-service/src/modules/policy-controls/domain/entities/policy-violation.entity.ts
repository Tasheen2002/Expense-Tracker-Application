import { ViolationId } from '../value-objects/violation-id';
import { PolicyId } from '../value-objects/policy-id';
import {  WorkspaceId  } from '@core/domain/value-objects';
import { ViolationSeverity } from '../enums/violation-severity.enum';
import { ViolationStatus } from '../enums/violation-status.enum';
import { ViolationAlreadyResolvedError } from '../errors/policy-controls.errors';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';

// ============================================================================
// Domain Events
// ============================================================================

export class PolicyViolationDetectedEvent extends DomainEvent {
  constructor(
    public readonly violationId: string,
    public readonly workspaceId: string,
    public readonly policyId: string,
    public readonly expenseId: string,
    public readonly userId: string,
    public readonly severity: ViolationSeverity,
    public readonly violationDetails: string,
    public readonly expenseAmount?: number,
    public readonly currency?: string
  ) {
    super(violationId, 'PolicyViolation');
  }

  get eventType(): string { return 'violation.detected'; }

  getPayload(): Record<string, unknown> {
    return {
      violationId: this.violationId,
      workspaceId: this.workspaceId,
      policyId: this.policyId,
      expenseId: this.expenseId,
      userId: this.userId,
      severity: this.severity,
      violationDetails: this.violationDetails,
      expenseAmount: this.expenseAmount,
      currency: this.currency,
    };
  }
}

export class ViolationAcknowledgedEvent extends DomainEvent {
  constructor(
    public readonly violationId: string,
    public readonly workspaceId: string,
    public readonly acknowledgedBy: string
  ) {
    super(violationId, 'PolicyViolation');
  }

  get eventType(): string { return 'violation.acknowledged'; }

  getPayload(): Record<string, unknown> {
    return {
      violationId: this.violationId,
      workspaceId: this.workspaceId,
      acknowledgedBy: this.acknowledgedBy,
    };
  }
}

export class ViolationResolvedEvent extends DomainEvent {
  constructor(
    public readonly violationId: string,
    public readonly workspaceId: string,
    public readonly resolvedBy: string,
    public readonly resolutionType: 'resolved' | 'exempted' | 'overridden',
    public readonly notes?: string
  ) {
    super(violationId, 'PolicyViolation');
  }

  get eventType(): string { return 'violation.resolved'; }

  getPayload(): Record<string, unknown> {
    return {
      violationId: this.violationId,
      workspaceId: this.workspaceId,
      resolvedBy: this.resolvedBy,
      resolutionType: this.resolutionType,
      notes: this.notes,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

export interface PolicyViolationProps {
  violationId: ViolationId;
  workspaceId: WorkspaceId;
  policyId: PolicyId;
  expenseId: string;
  userId: string;
  severity: ViolationSeverity;
  status: ViolationStatus;
  violationDetails: string;
  expenseAmount?: number;
  currency?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyViolationDTO {
  id: string;
  workspaceId: string;
  policyId: string;
  expenseId: string;
  userId: string;
  status: ViolationStatus;
  severity: ViolationSeverity;
  violationDetails: string;
  expenseAmount?: number;
  currency?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export class PolicyViolation extends AggregateRoot {
  private constructor(private props: PolicyViolationProps) {
    super();
  }

  static create(params: {
    workspaceId: string;
    policyId: string;
    expenseId: string;
    userId: string;
    severity: ViolationSeverity;
    violationDetails: string;
    expenseAmount?: number;
    currency?: string;
  }): PolicyViolation {
    const violation = new PolicyViolation({
      violationId: ViolationId.create(),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      policyId: PolicyId.fromString(params.policyId),
      expenseId: params.expenseId,
      userId: params.userId,
      severity: params.severity,
      status: ViolationStatus.PENDING,
      violationDetails: params.violationDetails,
      expenseAmount: params.expenseAmount,
      currency: params.currency,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    violation.addDomainEvent(
      new PolicyViolationDetectedEvent(
        violation.props.violationId.getValue(),
        params.workspaceId,
        params.policyId,
        params.expenseId,
        params.userId,
        params.severity,
        params.violationDetails,
        params.expenseAmount,
        params.currency
      )
    );

    return violation;
  }

  static fromPersistence(props: PolicyViolationProps): PolicyViolation {
    return new PolicyViolation(props);
  }

  get id(): ViolationId { return this.props.violationId; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get policyId(): PolicyId { return this.props.policyId; }
  get expenseId(): string { return this.props.expenseId; }
  get userId(): string { return this.props.userId; }
  get severity(): ViolationSeverity { return this.props.severity; }
  get status(): ViolationStatus { return this.props.status; }
  get violationDetails(): string { return this.props.violationDetails; }
  get expenseAmount(): number | undefined { return this.props.expenseAmount; }
  get currency(): string | undefined { return this.props.currency; }
  get acknowledgedBy(): string | undefined { return this.props.acknowledgedBy; }
  get acknowledgedAt(): Date | undefined { return this.props.acknowledgedAt; }
  get resolvedBy(): string | undefined { return this.props.resolvedBy; }
  get resolvedAt(): Date | undefined { return this.props.resolvedAt; }
  get resolutionNotes(): string | undefined { return this.props.resolutionNotes; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isPending(): boolean { return this.props.status === ViolationStatus.PENDING; }

  isResolved(): boolean {
    return [ViolationStatus.RESOLVED, ViolationStatus.EXEMPTED, ViolationStatus.OVERRIDDEN]
      .includes(this.props.status);
  }

  acknowledge(userId: string): void {
    if (this.isResolved()) throw new ViolationAlreadyResolvedError(this.props.violationId.getValue());
    this.props.status = ViolationStatus.ACKNOWLEDGED;
    this.props.acknowledgedBy = userId;
    this.props.acknowledgedAt = new Date();
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new ViolationAcknowledgedEvent(
        this.props.violationId.getValue(),
        this.props.workspaceId.getValue(),
        userId
      )
    );
  }

  resolve(userId: string, notes?: string): void {
    if (this.isResolved()) throw new ViolationAlreadyResolvedError(this.props.violationId.getValue());
    this.props.status = ViolationStatus.RESOLVED;
    this.props.resolvedBy = userId;
    this.props.resolvedAt = new Date();
    this.props.resolutionNotes = notes;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new ViolationResolvedEvent(this.props.violationId.getValue(), this.props.workspaceId.getValue(), userId, 'resolved', notes)
    );
  }

  exempt(userId: string, notes?: string): void {
    if (this.isResolved()) throw new ViolationAlreadyResolvedError(this.props.violationId.getValue());
    this.props.status = ViolationStatus.EXEMPTED;
    this.props.resolvedBy = userId;
    this.props.resolvedAt = new Date();
    this.props.resolutionNotes = notes;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new ViolationResolvedEvent(this.props.violationId.getValue(), this.props.workspaceId.getValue(), userId, 'exempted', notes)
    );
  }

  override(userId: string, notes?: string): void {
    if (this.isResolved()) throw new ViolationAlreadyResolvedError(this.props.violationId.getValue());
    this.props.status = ViolationStatus.OVERRIDDEN;
    this.props.resolvedBy = userId;
    this.props.resolvedAt = new Date();
    this.props.resolutionNotes = notes;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new ViolationResolvedEvent(this.props.violationId.getValue(), this.props.workspaceId.getValue(), userId, 'overridden', notes)
    );
  }

  static toDTO(violation: PolicyViolation): PolicyViolationDTO {
    return {
      id: violation.id.getValue(),
      workspaceId: violation.workspaceId.getValue(),
      policyId: violation.policyId.getValue(),
      expenseId: violation.expenseId,
      userId: violation.userId,
      status: violation.status,
      severity: violation.severity,
      violationDetails: violation.violationDetails,
      expenseAmount: violation.expenseAmount,
      currency: violation.currency,
      acknowledgedAt: violation.acknowledgedAt?.toISOString(),
      acknowledgedBy: violation.acknowledgedBy,
      resolvedAt: violation.resolvedAt?.toISOString(),
      resolvedBy: violation.resolvedBy,
      resolutionNotes: violation.resolutionNotes,
      createdAt: violation.createdAt.toISOString(),
      updatedAt: violation.updatedAt.toISOString(),
    };
  }
}
