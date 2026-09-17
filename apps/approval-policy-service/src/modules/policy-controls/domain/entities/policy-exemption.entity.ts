import { ExemptionId, PolicyId } from '../value-objects';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import { ExemptionStatus } from '../enums/exemption-status.enum';
import {
  ExemptionAlreadyProcessedError,
  InvalidExemptionDateRangeError,
  ExemptionDurationExceededError,
  ExemptionReasonLengthError,
  ExemptionExpiredError,
  InvalidPolicyConfigurationError,
  InvalidThresholdError,
} from '../errors/policy-controls.errors';
import {
  EXEMPTION_REASON_MIN_LENGTH,
  EXEMPTION_REASON_MAX_LENGTH,
  EXEMPTION_MAX_DURATION_DAYS,
  AGGREGATE_TYPE_POLICY_EXEMPTION,
  MAX_ALLOWED_CATEGORIES,
  MAX_THRESHOLD_AMOUNT,
} from '../constants/policy-controls.constants';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { APPROVAL_POLICY_EVENTS } from '../../../../shared/events/approval-policy-events';

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
    public readonly endDate: Date,
    public readonly scope?: ExemptionScope
  ) {
    super(exemptionId, AGGREGATE_TYPE_POLICY_EXEMPTION);
  }

  get eventType(): string { return APPROVAL_POLICY_EVENTS.EXEMPTION_REQUESTED; }

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
      scope: this.scope
        ? {
            ...(this.scope.categoryIds ? { categoryIds: [...this.scope.categoryIds] } : {}),
            ...(this.scope.maxAmount !== undefined ? { maxAmount: this.scope.maxAmount } : {}),
          }
        : undefined,
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
    super(exemptionId, AGGREGATE_TYPE_POLICY_EXEMPTION);
  }

  get eventType(): string { return APPROVAL_POLICY_EVENTS.EXEMPTION_APPROVED; }

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
    super(exemptionId, AGGREGATE_TYPE_POLICY_EXEMPTION);
  }

  get eventType(): string { return APPROVAL_POLICY_EVENTS.EXEMPTION_REJECTED; }

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
    super(exemptionId, AGGREGATE_TYPE_POLICY_EXEMPTION);
  }

  get eventType(): string { return APPROVAL_POLICY_EVENTS.EXEMPTION_EXPIRED; }

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

export interface ExemptionScope {
  categoryIds?: readonly string[] | string[];
  maxAmount?: number;
}

export interface PolicyExemptionProps {
  exemptionId: ExemptionId;
  workspaceId: WorkspaceId;
  policyId: PolicyId;
  userId: UserId;
  requestedBy: UserId;
  reason: string;
  status: ExemptionStatus;
  startDate: Date;
  endDate: Date;
  scope?: ExemptionScope;
  approvedBy?: UserId;
  approvedAt?: Date;
  approvalNote?: string;
  rejectedBy?: UserId;
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
  approvalNote?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  startDate: string;
  endDate: string;
  scope?: ExemptionScope;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class PolicyExemption extends AggregateRoot {
  private constructor(private props: PolicyExemptionProps) {
    super();
  }

  private static validateDateRange(startDate: Date, endDate: Date): void {
    if (endDate <= startDate) {
      throw new InvalidExemptionDateRangeError();
    }
    const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (durationDays > EXEMPTION_MAX_DURATION_DAYS) {
      throw new ExemptionDurationExceededError(EXEMPTION_MAX_DURATION_DAYS);
    }
  }

  private static validateReason(reason: string): string {
    if (!reason || typeof reason !== 'string') {
      throw new ExemptionReasonLengthError('Reason is required');
    }
    const trimmed = reason.trim();
    if (trimmed.length < EXEMPTION_REASON_MIN_LENGTH || trimmed.length > EXEMPTION_REASON_MAX_LENGTH) {
      throw new ExemptionReasonLengthError(
        `Reason must be between ${EXEMPTION_REASON_MIN_LENGTH} and ${EXEMPTION_REASON_MAX_LENGTH} characters`
      );
    }
    return trimmed;
  }

  private static validateScope(scope?: ExemptionScope): ExemptionScope | undefined {
    if (!scope) return undefined;

    let categoryIds: readonly string[] | undefined;
    if (scope.categoryIds !== undefined) {
      if (!Array.isArray(scope.categoryIds)) {
        throw new InvalidPolicyConfigurationError('Exemption categoryIds must be an array');
      }
      if (scope.categoryIds.length > MAX_ALLOWED_CATEGORIES) {
        throw new InvalidPolicyConfigurationError(
          `Exemption cannot specify more than ${MAX_ALLOWED_CATEGORIES} categories`
        );
      }
      categoryIds = Object.freeze([...scope.categoryIds]);
    }

    let maxAmount: number | undefined;
    if (scope.maxAmount !== undefined) {
      if (
        typeof scope.maxAmount !== 'number' ||
        !Number.isFinite(scope.maxAmount) ||
        scope.maxAmount < 0 ||
        scope.maxAmount > MAX_THRESHOLD_AMOUNT
      ) {
        throw new InvalidThresholdError(
          `Exemption maxAmount must be a non-negative finite number up to ${MAX_THRESHOLD_AMOUNT}`
        );
      }
      maxAmount = scope.maxAmount;
    }

    return Object.freeze({
      ...(categoryIds ? { categoryIds } : {}),
      ...(maxAmount !== undefined ? { maxAmount } : {}),
    });
  }

  static create(params: {
    workspaceId: string | WorkspaceId;
    policyId: string | PolicyId;
    userId: string | UserId;
    requestedBy: string | UserId;
    reason: string;
    startDate: Date;
    endDate: Date;
    scope?: ExemptionScope;
  }): PolicyExemption {
    PolicyExemption.validateDateRange(params.startDate, params.endDate);
    const validatedReason = PolicyExemption.validateReason(params.reason);
    const validatedScope = PolicyExemption.validateScope(params.scope);

    const workspaceId =
      typeof params.workspaceId === 'string'
        ? WorkspaceId.fromString(params.workspaceId)
        : params.workspaceId;

    const policyId =
      typeof params.policyId === 'string'
        ? PolicyId.fromString(params.policyId)
        : params.policyId;

    const userId =
      typeof params.userId === 'string'
        ? UserId.fromString(params.userId)
        : params.userId;

    const requestedBy =
      typeof params.requestedBy === 'string'
        ? UserId.fromString(params.requestedBy)
        : params.requestedBy;

    const exemption = new PolicyExemption({
      exemptionId: ExemptionId.create(),
      workspaceId,
      policyId,
      userId,
      requestedBy,
      reason: validatedReason,
      status: ExemptionStatus.PENDING,
      startDate: params.startDate,
      endDate: params.endDate,
      scope: validatedScope,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    exemption.addDomainEvent(
      new ExemptionRequestedEvent(
        exemption.props.exemptionId.getValue(),
        workspaceId.getValue(),
        policyId.getValue(),
        userId.getValue(),
        requestedBy.getValue(),
        validatedReason,
        params.startDate,
        params.endDate,
        validatedScope
      )
    );

    return exemption;
  }

  static fromPersistence(props: PolicyExemptionProps): PolicyExemption {
    return new PolicyExemption({
      ...props,
      scope: PolicyExemption.validateScope(props.scope),
    });
  }

  get id(): ExemptionId { return this.props.exemptionId; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get policyId(): PolicyId { return this.props.policyId; }
  get userId(): UserId { return this.props.userId; }
  get requestedBy(): UserId { return this.props.requestedBy; }
  get reason(): string { return this.props.reason; }
  get status(): ExemptionStatus { return this.props.status; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get scope(): ExemptionScope | undefined {
    if (!this.props.scope) return undefined;
    return {
      ...(this.props.scope.categoryIds ? { categoryIds: [...this.props.scope.categoryIds] } : {}),
      ...(this.props.scope.maxAmount !== undefined ? { maxAmount: this.props.scope.maxAmount } : {}),
    };
  }
  get approvedBy(): UserId | undefined { return this.props.approvedBy; }
  get approvedAt(): Date | undefined { return this.props.approvedAt; }
  get approvalNote(): string | undefined { return this.props.approvalNote; }
  get rejectedBy(): UserId | undefined { return this.props.rejectedBy; }
  get rejectedAt(): Date | undefined { return this.props.rejectedAt; }
  get rejectionReason(): string | undefined { return this.props.rejectionReason; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isPending(): boolean { return this.props.status === ExemptionStatus.PENDING; }
  isApproved(): boolean { return this.props.status === ExemptionStatus.APPROVED; }
  isRejected(): boolean { return this.props.status === ExemptionStatus.REJECTED; }

  isExpired(now: Date = new Date()): boolean {
    return this.props.status === ExemptionStatus.EXPIRED || now > this.props.endDate;
  }

  isActive(): boolean {
    if (this.props.status !== ExemptionStatus.APPROVED) return false;
    const now = new Date();
    return now >= this.props.startDate && now <= this.props.endDate;
  }

  appliesTo(context: { categoryId?: string; amount?: number }): boolean {
    if (!this.isActive()) {
      return false;
    }

    if (!this.props.scope) {
      return true;
    }

    if (this.props.scope.categoryIds && this.props.scope.categoryIds.length > 0) {
      if (!context.categoryId || !this.props.scope.categoryIds.includes(context.categoryId)) {
        return false;
      }
    }

    if (this.props.scope.maxAmount !== undefined && this.props.scope.maxAmount !== null) {
      if (context.amount !== undefined && context.amount > this.props.scope.maxAmount) {
        return false;
      }
    }

    return true;
  }

  approve(approvedBy: string | UserId, approvalNote?: string): void {
    if (!this.isPending()) {
      throw new ExemptionAlreadyProcessedError(this.props.exemptionId.getValue());
    }

    if (this.isExpired()) {
      throw new ExemptionExpiredError(this.props.exemptionId.getValue());
    }

    const actor = typeof approvedBy === 'string' ? UserId.fromString(approvedBy) : approvedBy;

    this.props.status = ExemptionStatus.APPROVED;
    this.props.approvedBy = actor;
    this.props.approvedAt = new Date();
    this.props.approvalNote = approvalNote?.trim() || undefined;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ExemptionApprovedEvent(
        this.props.exemptionId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.policyId.getValue(),
        this.props.userId.getValue(),
        actor.getValue()
      )
    );
  }

  reject(rejectedBy: string | UserId, reason: string): void {
    if (!this.isPending()) {
      throw new ExemptionAlreadyProcessedError(this.props.exemptionId.getValue());
    }

    if (!reason || typeof reason !== 'string') {
      throw new ExemptionReasonLengthError('Rejection reason is required');
    }

    const trimmedReason = reason.trim();
    if (
      trimmedReason.length < EXEMPTION_REASON_MIN_LENGTH ||
      trimmedReason.length > EXEMPTION_REASON_MAX_LENGTH
    ) {
      throw new ExemptionReasonLengthError(
        `Rejection reason must be between ${EXEMPTION_REASON_MIN_LENGTH} and ${EXEMPTION_REASON_MAX_LENGTH} characters`
      );
    }

    const actor = typeof rejectedBy === 'string' ? UserId.fromString(rejectedBy) : rejectedBy;

    this.props.status = ExemptionStatus.REJECTED;
    this.props.rejectedBy = actor;
    this.props.rejectedAt = new Date();
    this.props.rejectionReason = trimmedReason;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ExemptionRejectedEvent(
        this.props.exemptionId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.policyId.getValue(),
        this.props.userId.getValue(),
        actor.getValue(),
        trimmedReason
      )
    );
  }

  markExpired(now: Date = new Date()): void {
    if ((this.isApproved() || this.isPending()) && now > this.props.endDate) {
      this.props.status = ExemptionStatus.EXPIRED;
      this.props.updatedAt = now;
      this.addDomainEvent(
        new ExemptionExpiredEvent(
          this.props.exemptionId.getValue(),
          this.props.workspaceId.getValue(),
          this.props.policyId.getValue(),
          this.props.userId.getValue()
        )
      );
    }
  }

  updateDates(startDate: Date, endDate: Date): void {
    if (!this.isPending()) {
      throw new ExemptionAlreadyProcessedError(this.props.exemptionId.getValue());
    }
    PolicyExemption.validateDateRange(startDate, endDate);
    this.props.startDate = startDate;
    this.props.endDate = endDate;
    this.props.updatedAt = new Date();
  }

  updateReason(reason: string): void {
    if (!this.isPending()) {
      throw new ExemptionAlreadyProcessedError(this.props.exemptionId.getValue());
    }
    this.props.reason = PolicyExemption.validateReason(reason);
    this.props.updatedAt = new Date();
  }

  static toDTO(exemption: PolicyExemption): PolicyExemptionDTO {
    return {
      id: exemption.id.getValue(),
      workspaceId: exemption.workspaceId.getValue(),
      policyId: exemption.policyId.getValue(),
      userId: exemption.userId.getValue(),
      status: exemption.status,
      reason: exemption.reason,
      requestedBy: exemption.requestedBy.getValue(),
      approvedBy: exemption.approvedBy?.getValue(),
      approvedAt: exemption.approvedAt?.toISOString(),
      approvalNote: exemption.approvalNote,
      rejectedBy: exemption.rejectedBy?.getValue(),
      rejectedAt: exemption.rejectedAt?.toISOString(),
      rejectionReason: exemption.rejectionReason,
      startDate: exemption.startDate.toISOString(),
      endDate: exemption.endDate.toISOString(),
      scope: exemption.scope ? { ...exemption.scope } : undefined,
      isActive: exemption.isActive(),
      createdAt: exemption.createdAt.toISOString(),
      updatedAt: exemption.updatedAt.toISOString(),
    };
  }
}
