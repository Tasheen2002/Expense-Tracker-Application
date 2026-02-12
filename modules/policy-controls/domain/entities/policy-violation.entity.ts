import { ViolationId } from "../value-objects/violation-id";
import { PolicyId } from "../value-objects/policy-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { ViolationSeverity } from "../enums/violation-severity.enum";
import { ViolationStatus } from "../enums/violation-status.enum";
import { ViolationAlreadyResolvedError } from "../errors/policy-controls.errors";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";

// ============================================================================
// Domain Events
// ============================================================================

/**
 * Emitted when a policy violation is detected.
 */
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
    public readonly currency?: string,
  ) {
    super(violationId, "PolicyViolation");
  }

  get eventType(): string {
    return "violation.detected";
  }

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

/**
 * Emitted when a violation is acknowledged by the user.
 */
export class ViolationAcknowledgedEvent extends DomainEvent {
  constructor(
    public readonly violationId: string,
    public readonly workspaceId: string,
    public readonly acknowledgedBy: string,
  ) {
    super(violationId, "PolicyViolation");
  }

  get eventType(): string {
    return "violation.acknowledged";
  }

  getPayload(): Record<string, unknown> {
    return {
      violationId: this.violationId,
      workspaceId: this.workspaceId,
      acknowledgedBy: this.acknowledgedBy,
    };
  }
}

/**
 * Emitted when a violation is resolved.
 */
export class ViolationResolvedEvent extends DomainEvent {
  constructor(
    public readonly violationId: string,
    public readonly workspaceId: string,
    public readonly resolvedBy: string,
    public readonly resolutionType: "resolved" | "exempted" | "overridden",
    public readonly notes?: string,
  ) {
    super(violationId, "PolicyViolation");
  }

  get eventType(): string {
    return "violation.resolved";
  }

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
  violationDetails: string; // Description of what violated the policy
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

/**
 * Policy Violation entity - represents an expense that violated a policy
 */
export class PolicyViolation extends AggregateRoot {
  private props: PolicyViolationProps;

  private constructor(props: PolicyViolationProps) {
    super();
    this.props = props;
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

    // Add domain event
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
        params.currency,
      ),
    );

    return violation;
  }

  static reconstitute(props: PolicyViolationProps): PolicyViolation {
    return new PolicyViolation(props);
  }

  // Getters
  getId(): ViolationId {
    return this.props.violationId;
  }

  getWorkspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  getPolicyId(): PolicyId {
    return this.props.policyId;
  }

  getExpenseId(): string {
    return this.props.expenseId;
  }

  getUserId(): string {
    return this.props.userId;
  }

  getSeverity(): ViolationSeverity {
    return this.props.severity;
  }

  getStatus(): ViolationStatus {
    return this.props.status;
  }

  getViolationDetails(): string {
    return this.props.violationDetails;
  }

  getExpenseAmount(): number | undefined {
    return this.props.expenseAmount;
  }

  getCurrency(): string | undefined {
    return this.props.currency;
  }

  getAcknowledgedBy(): string | undefined {
    return this.props.acknowledgedBy;
  }

  getAcknowledgedAt(): Date | undefined {
    return this.props.acknowledgedAt;
  }

  getResolvedBy(): string | undefined {
    return this.props.resolvedBy;
  }

  getResolvedAt(): Date | undefined {
    return this.props.resolvedAt;
  }

  getResolutionNotes(): string | undefined {
    return this.props.resolutionNotes;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Status checks
  isPending(): boolean {
    return this.props.status === ViolationStatus.PENDING;
  }

  isResolved(): boolean {
    return [
      ViolationStatus.RESOLVED,
      ViolationStatus.EXEMPTED,
      ViolationStatus.OVERRIDDEN,
    ].includes(this.props.status);
  }

  // Status transitions
  acknowledge(userId: string): void {
    if (this.isResolved()) {
      throw new ViolationAlreadyResolvedError(
        this.props.violationId.getValue(),
      );
    }

    this.props.status = ViolationStatus.ACKNOWLEDGED;
    this.props.acknowledgedBy = userId;
    this.props.acknowledgedAt = new Date();
    this.props.updatedAt = new Date();
  }

  resolve(userId: string, notes?: string): void {
    if (this.isResolved()) {
      throw new ViolationAlreadyResolvedError(
        this.props.violationId.getValue(),
      );
    }

    this.props.status = ViolationStatus.RESOLVED;
    this.props.resolvedBy = userId;
    this.props.resolvedAt = new Date();
    this.props.resolutionNotes = notes;
    this.props.updatedAt = new Date();
  }

  exempt(userId: string, notes?: string): void {
    if (this.isResolved()) {
      throw new ViolationAlreadyResolvedError(
        this.props.violationId.getValue(),
      );
    }

    this.props.status = ViolationStatus.EXEMPTED;
    this.props.resolvedBy = userId;
    this.props.resolvedAt = new Date();
    this.props.resolutionNotes = notes;
    this.props.updatedAt = new Date();
  }

  override(userId: string, notes?: string): void {
    if (this.isResolved()) {
      throw new ViolationAlreadyResolvedError(
        this.props.violationId.getValue(),
      );
    }

    this.props.status = ViolationStatus.OVERRIDDEN;
    this.props.resolvedBy = userId;
    this.props.resolvedAt = new Date();
    this.props.resolutionNotes = notes;
    this.props.updatedAt = new Date();
  }
}
