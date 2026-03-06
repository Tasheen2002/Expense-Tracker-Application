import { ExemptionId } from "../value-objects/exemption-id";
import { PolicyId } from "../value-objects/policy-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { ExemptionStatus } from "../enums/exemption-status.enum";
import {
  ExemptionAlreadyProcessedError,
  InvalidExemptionDateRangeError,
} from "../errors/policy-controls.errors";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";

// ============================================================================
// Domain Events
// ============================================================================

/**
 * Emitted when an exemption request is created.
 */
export class ExemptionRequestedEvent extends DomainEvent {
  constructor(
    public readonly exemptionId: string,
    public readonly workspaceId: string,
    public readonly policyId: string,
    public readonly userId: string,
    public readonly requestedBy: string,
    public readonly reason: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {
    super(exemptionId, "PolicyExemption");
  }

  get eventType(): string {
    return "exemption.requested";
  }

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

/**
 * Emitted when an exemption is approved.
 */
export class ExemptionApprovedEvent extends DomainEvent {
  constructor(
    public readonly exemptionId: string,
    public readonly workspaceId: string,
    public readonly policyId: string,
    public readonly userId: string,
    public readonly approvedBy: string,
  ) {
    super(exemptionId, "PolicyExemption");
  }

  get eventType(): string {
    return "exemption.approved";
  }

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

/**
 * Emitted when an exemption is rejected.
 */
export class ExemptionRejectedEvent extends DomainEvent {
  constructor(
    public readonly exemptionId: string,
    public readonly workspaceId: string,
    public readonly policyId: string,
    public readonly userId: string,
    public readonly rejectedBy: string,
    public readonly rejectionReason?: string,
  ) {
    super(exemptionId, "PolicyExemption");
  }

  get eventType(): string {
    return "exemption.rejected";
  }

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

/**
 * Emitted when an exemption expires.
 */
export class ExemptionExpiredEvent extends DomainEvent {
  constructor(
    public readonly exemptionId: string,
    public readonly workspaceId: string,
    public readonly policyId: string,
    public readonly userId: string,
  ) {
    super(exemptionId, "PolicyExemption");
  }

  get eventType(): string {
    return "exemption.expired";
  }

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
  userId: string; // User who receives the exemption
  requestedBy: string; // User who requested the exemption
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

/**
 * Policy Exemption entity - temporary exemption from a policy for a user
 */
export class PolicyExemption extends AggregateRoot {
  private props: PolicyExemptionProps;

  private constructor(props: PolicyExemptionProps) {
    super();
    this.props = props;
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

    // Add domain event
    exemption.addDomainEvent(
      new ExemptionRequestedEvent(
        exemption.props.exemptionId.getValue(),
        params.workspaceId,
        params.policyId,
        params.userId,
        params.requestedBy,
        params.reason,
        params.startDate,
        params.endDate,
      ),
    );

    return exemption;
  }

  static reconstitute(props: PolicyExemptionProps): PolicyExemption {
    return new PolicyExemption(props);
  }

  // Getters
  getId(): ExemptionId {
    return this.props.exemptionId;
  }

  getWorkspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  getPolicyId(): PolicyId {
    return this.props.policyId;
  }

  getUserId(): string {
    return this.props.userId;
  }

  getRequestedBy(): string {
    return this.props.requestedBy;
  }

  getReason(): string {
    return this.props.reason;
  }

  getStatus(): ExemptionStatus {
    return this.props.status;
  }

  getStartDate(): Date {
    return this.props.startDate;
  }

  getEndDate(): Date {
    return this.props.endDate;
  }

  getApprovedBy(): string | undefined {
    return this.props.approvedBy;
  }

  getApprovedAt(): Date | undefined {
    return this.props.approvedAt;
  }

  getRejectedBy(): string | undefined {
    return this.props.rejectedBy;
  }

  getRejectedAt(): Date | undefined {
    return this.props.rejectedAt;
  }

  getRejectionReason(): string | undefined {
    return this.props.rejectionReason;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Status checks
  isPending(): boolean {
    return this.props.status === ExemptionStatus.PENDING;
  }

  isApproved(): boolean {
    return this.props.status === ExemptionStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.props.status === ExemptionStatus.REJECTED;
  }

  isExpired(): boolean {
    return (
      this.props.status === ExemptionStatus.EXPIRED ||
      new Date() > this.props.endDate
    );
  }

  isActive(): boolean {
    if (this.props.status !== ExemptionStatus.APPROVED) {
      return false;
    }
    const now = new Date();
    return now >= this.props.startDate && now <= this.props.endDate;
  }

  // Status transitions
  approve(approvedBy: string): void {
    if (!this.isPending()) {
      throw new ExemptionAlreadyProcessedError(
        this.props.exemptionId.getValue(),
      );
    }

    this.props.status = ExemptionStatus.APPROVED;
    this.props.approvedBy = approvedBy;
    this.props.approvedAt = new Date();
    this.props.updatedAt = new Date();

    // Add domain event
    this.addDomainEvent(
      new ExemptionApprovedEvent(
        this.props.exemptionId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.policyId.getValue(),
        this.props.userId,
        approvedBy,
      ),
    );
  }

  reject(rejectedBy: string, reason?: string): void {
    if (!this.isPending()) {
      throw new ExemptionAlreadyProcessedError(
        this.props.exemptionId.getValue(),
      );
    }

    this.props.status = ExemptionStatus.REJECTED;
    this.props.rejectedBy = rejectedBy;
    this.props.rejectedAt = new Date();
    this.props.rejectionReason = reason;
    this.props.updatedAt = new Date();

    // Add domain event
    this.addDomainEvent(
      new ExemptionRejectedEvent(
        this.props.exemptionId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.policyId.getValue(),
        this.props.userId,
        rejectedBy,
        reason,
      ),
    );
  }

  markExpired(): void {
    if (this.isApproved() && new Date() > this.props.endDate) {
      this.props.status = ExemptionStatus.EXPIRED;
      this.props.updatedAt = new Date();

      // Add domain event
      this.addDomainEvent(
        new ExemptionExpiredEvent(
          this.props.exemptionId.getValue(),
          this.props.workspaceId.getValue(),
          this.props.policyId.getValue(),
          this.props.userId,
        ),
      );
    }
  }

  updateDates(startDate: Date, endDate: Date): void {
    if (!this.isPending()) {
      throw new ExemptionAlreadyProcessedError(
        this.props.exemptionId.getValue(),
      );
    }

    if (endDate <= startDate) {
      throw new InvalidExemptionDateRangeError();
    }

    this.props.startDate = startDate;
    this.props.endDate = endDate;
    this.props.updatedAt = new Date();
  }

  updateReason(reason: string): void {
    if (!this.isPending()) {
      throw new ExemptionAlreadyProcessedError(
        this.props.exemptionId.getValue(),
      );
    }

    this.props.reason = reason;
    this.props.updatedAt = new Date();
  }
}
