import { ExemptionId } from '../value-objects/exemption-id';
import { PolicyId } from '../value-objects/policy-id';
import { WorkspaceId } from '../../../identity-workspace';
import { ExemptionStatus } from '../enums/exemption-status.enum';
import {
  ExemptionAlreadyProcessedError,
  InvalidExemptionDateRangeError,
} from '../errors/policy-controls.errors';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';

// ============================================================================
// Domain Events
// ============================================================================

export class ExemptionRequestedEvent extends DomainEvent {
  constructor(
    public readonly exemptionId: string,
    public readonly workspaceId: string,
    public readonly policyId: string,
    public readonly userId: string,
    public readonly requestedBy: string,
    public readonly reason: string,
    public readonly startDate: Date,
    public readonly endDate: Date
  ) {
    super(exemptionId, 'PolicyExemption');
  }

  get eventType(): string { return 'exemption.requested'; }

  getPayload(): Record<string, unknown> {
    return {
      exemptionId: this.exemptionId,
      workspaceId: this.workspaceId,
      policyId: this.policyId,
      userId: this.userId,
      requestedBy: this.requestedBy,
      reason: this.reason,
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
    };
  }
}

export class ExemptionApprovedEvent extends DomainEvent {
  constructor(
    public readonly exemptionId: string,
    public readonly workspaceId: string,
    public readonly policyId: string,
    public readonly userId: string,
    public readonly approvedBy: string
  ) {
    super(exemptionId, 'PolicyExemption');
  }

  get eventType(): string { return 'exemption.approved'; }

  getPayload(): Record<string, unknown> {
    return {
      exemptionId: this.exemptionId,
      workspaceId: this.workspaceId,
      policyId: this.policyId,
      userId: this.userId,
      approvedBy: this.approvedBy,
    };
  }
}

export class ExemptionRejectedEvent extends DomainEvent {
  constructor(
    public readonly exemptionId: string,
    public readonly workspaceId: string,
    public readonly policyId: string,
    public readonly userId: string,
    public readonly rejectedBy: string,
    public readonly rejectionReason?: string
  ) {
    super(exemptionId, 'PolicyExemption');
  }

  get eventType(): string { return 'exemption.rejected'; }

  getPayload(): Record<string, unknown> {
    return {
      exemptionId: this.exemptionId,
      workspaceId: this.workspaceId,
      policyId: this.policyId,
      userId: this.userId,
      rejectedBy: this.rejectedBy,
      rejectionReason: this.rejectionReason,
    };
  }
}

export class ExemptionExpiredEvent extends DomainEvent {
  constructor(
    public readonly exemptionId: string,
    public readonly workspaceId: string,
    public readonly policyId: string,
    public readonly userId: string
  ) {
    super(exemptionId, 'PolicyExemption');
  }

  get eventType(): string { return 'exemption.expired'; }

  getPayload(): Record<string, unknown> {
    return {
      exemptionId: this.exemptionId,
      workspaceId: this.workspaceId,
      policyId: this.policyId,
      userId: this.userId,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

export interface PolicyExemptionProps {
  exemptionId: ExemptionId;
  workspaceId: WorkspaceId;
  policyId: PolicyId;
  userId: string;
  requestedBy: string;
  reason: string;
  status: ExemptionStatus;
  startDate: Date;
  endDate: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyExemptionDTO {
  id: string;
  workspaceId: string;
  policyId: string;
  userId: string;
  status: ExemptionStatus;
  reason: string;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class PolicyExemption extends AggregateRoot {
  private constructor(private props: PolicyExemptionProps) {
    super();
  }

  static create(params: {
    workspaceId: string;
    policyId: string;
    userId: string;
    requestedBy: string;
    reason: string;
    startDate: Date;
    endDate: Date;
  }): PolicyExemption {
    if (params.endDate <= params.startDate) {
      throw new InvalidExemptionDateRangeError();
    }

    const exemption = new PolicyExemption({
      exemptionId: ExemptionId.create(),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      policyId: PolicyId.fromString(params.policyId),
      userId: params.userId,
      requestedBy: params.requestedBy,
      reason: params.reason,
      status: ExemptionStatus.PENDING,
      startDate: params.startDate,
      endDate: params.endDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    exemption.addDomainEvent(
      new ExemptionRequestedEvent(
        exemption.props.exemptionId.getValue(),
        params.workspaceId,
        params.policyId,
        params.userId,
        params.requestedBy,
        params.reason,
        params.startDate,
        params.endDate
      )
    );

    return exemption;
  }

  static fromPersistence(props: PolicyExemptionProps): PolicyExemption {
    return new PolicyExemption(props);
  }

  get id(): ExemptionId { return this.props.exemptionId; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get policyId(): PolicyId { return this.props.policyId; }
  get userId(): string { return this.props.userId; }
  get requestedBy(): string { return this.props.requestedBy; }
  get reason(): string { return this.props.reason; }
  get status(): ExemptionStatus { return this.props.status; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get approvedBy(): string | undefined { return this.props.approvedBy; }
  get approvedAt(): Date | undefined { return this.props.approvedAt; }
  get rejectedBy(): string | undefined { return this.props.rejectedBy; }
  get rejectedAt(): Date | undefined { return this.props.rejectedAt; }
  get rejectionReason(): string | undefined { return this.props.rejectionReason; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isPending(): boolean { return this.props.status === ExemptionStatus.PENDING; }
  isApproved(): boolean { return this.props.status === ExemptionStatus.APPROVED; }
  isRejected(): boolean { return this.props.status === ExemptionStatus.REJECTED; }

  isExpired(): boolean {
    return this.props.status === ExemptionStatus.EXPIRED || new Date() > this.props.endDate;
  }

  isActive(): boolean {
    if (this.props.status !== ExemptionStatus.APPROVED) return false;
    const now = new Date();
    return now >= this.props.startDate && now <= this.props.endDate;
  }

  approve(approvedBy: string): void {
    if (!this.isPending()) {
      throw new ExemptionAlreadyProcessedError(this.props.exemptionId.getValue());
    }
    this.props.status = ExemptionStatus.APPROVED;
    this.props.approvedBy = approvedBy;
    this.props.approvedAt = new Date();
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new ExemptionApprovedEvent(
        this.props.exemptionId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.policyId.getValue(),
        this.props.userId,
        approvedBy
      )
    );
  }

  reject(rejectedBy: string, reason?: string): void {
    if (!this.isPending()) {
      throw new ExemptionAlreadyProcessedError(this.props.exemptionId.getValue());
    }
    this.props.status = ExemptionStatus.REJECTED;
    this.props.rejectedBy = rejectedBy;
    this.props.rejectedAt = new Date();
    this.props.rejectionReason = reason;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new ExemptionRejectedEvent(
        this.props.exemptionId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.policyId.getValue(),
        this.props.userId,
        rejectedBy,
        reason
      )
    );
  }

  markExpired(): void {
    if (this.isApproved() && new Date() > this.props.endDate) {
      this.props.status = ExemptionStatus.EXPIRED;
      this.props.updatedAt = new Date();
      this.addDomainEvent(
        new ExemptionExpiredEvent(
          this.props.exemptionId.getValue(),
          this.props.workspaceId.getValue(),
          this.props.policyId.getValue(),
          this.props.userId
        )
      );
    }
  }

  updateDates(startDate: Date, endDate: Date): void {
    if (!this.isPending()) {
      throw new ExemptionAlreadyProcessedError(this.props.exemptionId.getValue());
    }
    if (endDate <= startDate) throw new InvalidExemptionDateRangeError();
    this.props.startDate = startDate;
    this.props.endDate = endDate;
    this.props.updatedAt = new Date();
  }

  updateReason(reason: string): void {
    if (!this.isPending()) {
      throw new ExemptionAlreadyProcessedError(this.props.exemptionId.getValue());
    }
    this.props.reason = reason;
    this.props.updatedAt = new Date();
  }

  static toDTO(exemption: PolicyExemption): PolicyExemptionDTO {
    return {
      id: exemption.id.getValue(),
      workspaceId: exemption.workspaceId.getValue(),
      policyId: exemption.policyId.getValue(),
      userId: exemption.userId,
      status: exemption.status,
      reason: exemption.reason,
      requestedBy: exemption.requestedBy,
      approvedBy: exemption.approvedBy,
      approvedAt: exemption.approvedAt?.toISOString(),
      rejectedBy: exemption.rejectedBy,
      rejectedAt: exemption.rejectedAt?.toISOString(),
      rejectionReason: exemption.rejectionReason,
      startDate: exemption.startDate.toISOString(),
      endDate: exemption.endDate.toISOString(),
      isActive: exemption.isActive(),
      createdAt: exemption.createdAt.toISOString(),
      updatedAt: exemption.updatedAt.toISOString(),
    };
  }
}
