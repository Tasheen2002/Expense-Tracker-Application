import { ViolationId, PolicyId, ExemptionId } from '../value-objects';
import { WorkspaceId, UserId, ExpenseId, Currency } from '@core/domain/value-objects';
import { ViolationSeverity } from '../enums/violation-severity.enum';
import { ViolationStatus } from '../enums/violation-status.enum';
import {
  ViolationAlreadyResolvedError,
  ViolationNoteLengthError,
  InvalidThresholdError,
  InvalidPolicyConfigurationError,
  InvalidExemptionForViolationError,
} from '../errors/policy-controls.errors';
import {
  VIOLATION_NOTE_MAX_LENGTH,
  OVERRIDE_REASON_MIN_LENGTH,
  OVERRIDE_REASON_MAX_LENGTH,
  MAX_THRESHOLD_AMOUNT,
  AGGREGATE_TYPE_POLICY_VIOLATION,
  SYSTEM_ACTOR_ID,
} from '../constants/policy-controls.constants';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { APPROVAL_POLICY_EVENTS } from '../../../../shared/events/approval-policy-events';

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
    public readonly expenseAmount: number,
    public readonly currency?: string
  ) {
    super(violationId, AGGREGATE_TYPE_POLICY_VIOLATION);
  }

  get eventType(): string { return APPROVAL_POLICY_EVENTS.VIOLATION_DETECTED; }

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
    public readonly acknowledgedBy: string,
    public readonly note?: string
  ) {
    super(violationId, AGGREGATE_TYPE_POLICY_VIOLATION);
  }

  get eventType(): string { return APPROVAL_POLICY_EVENTS.VIOLATION_ACKNOWLEDGED; }

  getPayload(): Record<string, unknown> {
    return {
      violationId: this.violationId,
      workspaceId: this.workspaceId,
      acknowledgedBy: this.acknowledgedBy,
      note: this.note,
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
    super(violationId, AGGREGATE_TYPE_POLICY_VIOLATION);
  }

  get eventType(): string { return APPROVAL_POLICY_EVENTS.VIOLATION_RESOLVED; }

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
  expenseId: ExpenseId;
  userId: UserId;
  severity: ViolationSeverity;
  status: ViolationStatus;
  violationDetails: string;
  expenseAmount: number;
  currency?: string;
  acknowledgedBy?: UserId;
  acknowledgedAt?: Date;
  resolvedBy?: UserId;
  resolvedAt?: Date;
  resolutionNotes?: string;
  exemptionId?: ExemptionId;
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
  expenseAmount: number;
  currency?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  exemptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export class PolicyViolation extends AggregateRoot {
  private constructor(private props: PolicyViolationProps) {
    super();
  }

  static create(params: {
    id?: string | ViolationId;
    workspaceId: string | WorkspaceId;
    policyId: string | PolicyId;
    expenseId: string | ExpenseId;
    userId: string | UserId;
    severity: ViolationSeverity;
    violationDetails: string;
    expenseAmount: number;
    currency?: string;
  }): PolicyViolation {
    if (!params.violationDetails || params.violationDetails.trim().length === 0) {
      throw new InvalidPolicyConfigurationError('Violation details are required');
    }

    if (
      params.expenseAmount === undefined ||
      params.expenseAmount === null ||
      typeof params.expenseAmount !== 'number' ||
      !Number.isFinite(params.expenseAmount) ||
      params.expenseAmount < 0 ||
      params.expenseAmount > MAX_THRESHOLD_AMOUNT
    ) {
      throw new InvalidThresholdError(
        `Expense amount must be a finite non-negative number up to ${MAX_THRESHOLD_AMOUNT}`
      );
    }

    if (params.currency !== undefined && params.currency.trim().length > 0) {
      if (!Currency.isValidCurrencyCode(params.currency)) {
        throw new InvalidPolicyConfigurationError(`Invalid currency code: ${params.currency}`);
      }
    }

    const violationId = params.id
      ? typeof params.id === 'string'
        ? ViolationId.fromString(params.id)
        : params.id
      : ViolationId.create();

    const workspaceId =
      typeof params.workspaceId === 'string'
        ? WorkspaceId.fromString(params.workspaceId)
        : params.workspaceId;

    const policyId =
      typeof params.policyId === 'string'
        ? PolicyId.fromString(params.policyId)
        : params.policyId;

    const expenseId =
      typeof params.expenseId === 'string'
        ? ExpenseId.fromString(params.expenseId)
        : params.expenseId;

    const userId =
      typeof params.userId === 'string'
        ? UserId.fromString(params.userId)
        : params.userId;

    const violation = new PolicyViolation({
      violationId,
      workspaceId,
      policyId,
      expenseId,
      userId,
      severity: params.severity,
      status: ViolationStatus.PENDING,
      violationDetails: params.violationDetails.trim(),
      expenseAmount: params.expenseAmount,
      currency: params.currency?.trim().toUpperCase(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    violation.addDomainEvent(
      new PolicyViolationDetectedEvent(
        violation.props.violationId.getValue(),
        workspaceId.getValue(),
        policyId.getValue(),
        expenseId.getValue(),
        userId.getValue(),
        params.severity,
        violation.props.violationDetails,
        params.expenseAmount,
        violation.props.currency
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
  get expenseId(): ExpenseId { return this.props.expenseId; }
  get userId(): UserId { return this.props.userId; }
  get severity(): ViolationSeverity { return this.props.severity; }
  get status(): ViolationStatus { return this.props.status; }
  get violationDetails(): string { return this.props.violationDetails; }
  get expenseAmount(): number { return this.props.expenseAmount; }
  get currency(): string | undefined { return this.props.currency; }
  get acknowledgedBy(): UserId | undefined { return this.props.acknowledgedBy; }
  get acknowledgedAt(): Date | undefined { return this.props.acknowledgedAt; }
  get resolvedBy(): UserId | undefined { return this.props.resolvedBy; }
  get resolvedAt(): Date | undefined { return this.props.resolvedAt; }
  get resolutionNotes(): string | undefined { return this.props.resolutionNotes; }
  get exemptionId(): ExemptionId | undefined { return this.props.exemptionId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  isPending(): boolean { return this.props.status === ViolationStatus.PENDING; }

  isResolved(): boolean {
    return [ViolationStatus.RESOLVED, ViolationStatus.EXEMPTED, ViolationStatus.OVERRIDDEN]
      .includes(this.props.status);
  }

  clearByReevaluation(reason: string = 'Cleared upon expense re-evaluation'): void {
    if (this.isResolved()) {
      return;
    }

    const actor = UserId.fromString(SYSTEM_ACTOR_ID);

    this.props.status = ViolationStatus.RESOLVED;
    this.props.resolvedBy = actor;
    this.props.resolvedAt = new Date();
    this.props.resolutionNotes = reason.trim();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ViolationResolvedEvent(
        this.props.violationId.getValue(),
        this.props.workspaceId.getValue(),
        actor.getValue(),
        'resolved',
        reason.trim()
      )
    );
  }

  reopen(details?: string, expenseAmount?: number): void {
    const wasPending = this.props.status === ViolationStatus.PENDING;
    this.props.status = ViolationStatus.PENDING;
    if (details !== undefined) {
      this.props.violationDetails = details.trim();
    }
    if (expenseAmount !== undefined) {
      this.props.expenseAmount = expenseAmount;
    }
    this.props.acknowledgedBy = undefined;
    this.props.acknowledgedAt = undefined;
    this.props.resolvedBy = undefined;
    this.props.resolvedAt = undefined;
    this.props.resolutionNotes = undefined;
    this.props.exemptionId = undefined;
    this.props.updatedAt = new Date();

    if (!wasPending) {
      this.addDomainEvent(
        new PolicyViolationDetectedEvent(
          this.props.violationId.getValue(),
          this.props.workspaceId.getValue(),
          this.props.policyId.getValue(),
          this.props.expenseId.getValue(),
          this.props.userId.getValue(),
          this.props.severity,
          this.props.violationDetails,
          this.props.expenseAmount,
          this.props.currency
        )
      );
    }
  }

  acknowledge(userId: string | UserId, note?: string): void {
    if (this.isResolved()) {
      throw new ViolationAlreadyResolvedError(this.props.violationId.getValue());
    }

    if (note && note.length > VIOLATION_NOTE_MAX_LENGTH) {
      throw new ViolationNoteLengthError(`Acknowledgment note cannot exceed ${VIOLATION_NOTE_MAX_LENGTH} characters`);
    }

    const actor = typeof userId === 'string' ? UserId.fromString(userId) : userId;

    // Idempotent: If already acknowledged by this user, do nothing and emit no duplicate events
    if (this.props.status === ViolationStatus.ACKNOWLEDGED) {
      return;
    }

    this.props.status = ViolationStatus.ACKNOWLEDGED;
    this.props.acknowledgedBy = actor;
    this.props.acknowledgedAt = new Date();
    if (note) {
      this.props.resolutionNotes = note.trim();
    }
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ViolationAcknowledgedEvent(
        this.props.violationId.getValue(),
        this.props.workspaceId.getValue(),
        actor.getValue(),
        note?.trim()
      )
    );
  }

  resolve(userId: string | UserId, notes?: string): void {
    if (this.isResolved()) {
      throw new ViolationAlreadyResolvedError(this.props.violationId.getValue());
    }

    if (notes && notes.length > VIOLATION_NOTE_MAX_LENGTH) {
      throw new ViolationNoteLengthError(`Resolution notes cannot exceed ${VIOLATION_NOTE_MAX_LENGTH} characters`);
    }

    const actor = typeof userId === 'string' ? UserId.fromString(userId) : userId;

    this.props.status = ViolationStatus.RESOLVED;
    this.props.resolvedBy = actor;
    this.props.resolvedAt = new Date();
    this.props.resolutionNotes = notes?.trim();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ViolationResolvedEvent(
        this.props.violationId.getValue(),
        this.props.workspaceId.getValue(),
        actor.getValue(),
        'resolved',
        notes?.trim()
      )
    );
  }

  exempt(userId: string | UserId, notes: string | undefined, exemptionId: string | ExemptionId): void {
    if (this.isResolved()) {
      throw new ViolationAlreadyResolvedError(this.props.violationId.getValue());
    }

    if (!exemptionId) {
      throw new InvalidExemptionForViolationError('Exemption ID is required to exempt a violation');
    }

    if (notes && notes.length > VIOLATION_NOTE_MAX_LENGTH) {
      throw new ViolationNoteLengthError(`Exemption notes cannot exceed ${VIOLATION_NOTE_MAX_LENGTH} characters`);
    }

    const actor = typeof userId === 'string' ? UserId.fromString(userId) : userId;

    this.props.status = ViolationStatus.EXEMPTED;
    this.props.resolvedBy = actor;
    this.props.resolvedAt = new Date();
    this.props.resolutionNotes = notes?.trim();
    this.props.exemptionId =
      typeof exemptionId === 'string' ? ExemptionId.fromString(exemptionId) : exemptionId;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ViolationResolvedEvent(
        this.props.violationId.getValue(),
        this.props.workspaceId.getValue(),
        actor.getValue(),
        'exempted',
        notes?.trim()
      )
    );
  }

  override(userId: string | UserId, notes?: string): void {
    if (this.isResolved()) {
      throw new ViolationAlreadyResolvedError(this.props.violationId.getValue());
    }

    const trimmedNotes = notes?.trim();
    if (trimmedNotes) {
      if (trimmedNotes.length < OVERRIDE_REASON_MIN_LENGTH || trimmedNotes.length > OVERRIDE_REASON_MAX_LENGTH) {
        throw new ViolationNoteLengthError(
          `Override reason must be between ${OVERRIDE_REASON_MIN_LENGTH} and ${OVERRIDE_REASON_MAX_LENGTH} characters`
        );
      }
    }

    const actor = typeof userId === 'string' ? UserId.fromString(userId) : userId;

    this.props.status = ViolationStatus.OVERRIDDEN;
    this.props.resolvedBy = actor;
    this.props.resolvedAt = new Date();
    this.props.resolutionNotes = trimmedNotes;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ViolationResolvedEvent(
        this.props.violationId.getValue(),
        this.props.workspaceId.getValue(),
        actor.getValue(),
        'overridden',
        trimmedNotes
      )
    );
  }

  static toDTO(violation: PolicyViolation): PolicyViolationDTO {
    return {
      id: violation.id.getValue(),
      workspaceId: violation.workspaceId.getValue(),
      policyId: violation.policyId.getValue(),
      expenseId: violation.expenseId.getValue(),
      userId: violation.userId.getValue(),
      status: violation.status,
      severity: violation.severity,
      violationDetails: violation.violationDetails,
      expenseAmount: violation.expenseAmount,
      currency: violation.currency,
      acknowledgedAt: violation.acknowledgedAt?.toISOString(),
      acknowledgedBy: violation.acknowledgedBy?.getValue(),
      resolvedAt: violation.resolvedAt?.toISOString(),
      resolvedBy: violation.resolvedBy?.getValue(),
      resolutionNotes: violation.resolutionNotes,
      exemptionId: violation.exemptionId?.getValue(),
      createdAt: violation.createdAt.toISOString(),
      updatedAt: violation.updatedAt.toISOString(),
    };
  }
}
