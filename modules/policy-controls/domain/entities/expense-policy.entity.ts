import { PolicyId } from '../value-objects/policy-id';
import { WorkspaceId } from '../../../identity-workspace';
import { PolicyType } from '../enums/policy-type.enum';
import { ViolationSeverity } from '../enums/violation-severity.enum';
import {
  PolicyNameRequiredError,
  PolicyNameTooLongError,
  PolicyDescriptionTooLongError,
  InvalidThresholdError,
  InvalidPolicyConfigurationError,
} from '../errors/policy-controls.errors';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';

// ============================================================================
// Domain Events
// ============================================================================

export class PolicyCreatedEvent extends DomainEvent {
  constructor(
    public readonly policyId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly policyType: PolicyType,
    public readonly severity: ViolationSeverity,
    public readonly createdBy: string
  ) {
    super(policyId, 'ExpensePolicy');
  }

  get eventType(): string { return 'policy.created'; }

  getPayload(): Record<string, unknown> {
    return {
      policyId: this.policyId,
      workspaceId: this.workspaceId,
      name: this.name,
      policyType: this.policyType,
      severity: this.severity,
      createdBy: this.createdBy,
    };
  }
}

export class PolicyActivatedEvent extends DomainEvent {
  constructor(
    public readonly policyId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(policyId, 'ExpensePolicy');
  }

  get eventType(): string { return 'policy.activated'; }

  getPayload(): Record<string, unknown> {
    return { policyId: this.policyId, workspaceId: this.workspaceId, name: this.name };
  }
}

export class PolicyDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly policyId: string,
    public readonly workspaceId: string,
    public readonly name: string
  ) {
    super(policyId, 'ExpensePolicy');
  }

  get eventType(): string { return 'policy.deactivated'; }

  getPayload(): Record<string, unknown> {
    return { policyId: this.policyId, workspaceId: this.workspaceId, name: this.name };
  }
}

export class PolicyUpdatedEvent extends DomainEvent {
  constructor(
    public readonly policyId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly updatedFields: string[]
  ) {
    super(policyId, 'ExpensePolicy');
  }

  get eventType(): string { return 'policy.updated'; }

  getPayload(): Record<string, unknown> {
    return {
      policyId: this.policyId,
      workspaceId: this.workspaceId,
      name: this.name,
      updatedFields: this.updatedFields,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export interface PolicyConfiguration {
  threshold?: number;
  currency?: string;
  restrictedCategoryIds?: string[];
  allowedCategoryIds?: string[];
  blacklistedMerchants?: string[];
  blockedDays?: number[];
  blockedHoursStart?: number;
  blockedHoursEnd?: number;
  requirementThreshold?: number;
  applyCategoryIds?: string[];
  applyToRoles?: string[];
}

export interface ExpensePolicyProps {
  policyId: PolicyId;
  workspaceId: WorkspaceId;
  name: string;
  description?: string;
  policyType: PolicyType;
  severity: ViolationSeverity;
  configuration: PolicyConfiguration;
  isActive: boolean;
  priority: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ExpensePolicy extends AggregateRoot {
  private constructor(private props: ExpensePolicyProps) {
    super();
  }

  static create(params: {
    workspaceId: string;
    name: string;
    description?: string;
    policyType: PolicyType;
    severity: ViolationSeverity;
    configuration: PolicyConfiguration;
    priority?: number;
    createdBy: string;
  }): ExpensePolicy {
    if (!params.name || params.name.trim().length === 0) {
      throw new PolicyNameRequiredError();
    }
    if (params.name.length > MAX_NAME_LENGTH) {
      throw new PolicyNameTooLongError(MAX_NAME_LENGTH);
    }
    if (params.description && params.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new PolicyDescriptionTooLongError(MAX_DESCRIPTION_LENGTH);
    }
    ExpensePolicy.validateConfiguration(params.policyType, params.configuration);

    const policy = new ExpensePolicy({
      policyId: PolicyId.create(),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      name: params.name.trim(),
      description: params.description?.trim(),
      policyType: params.policyType,
      severity: params.severity,
      configuration: params.configuration,
      isActive: true,
      priority: params.priority ?? 0,
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    policy.addDomainEvent(
      new PolicyCreatedEvent(
        policy.props.policyId.getValue(),
        params.workspaceId,
        params.name.trim(),
        params.policyType,
        params.severity,
        params.createdBy
      )
    );

    return policy;
  }

  static fromPersistence(props: ExpensePolicyProps): ExpensePolicy {
    return new ExpensePolicy(props);
  }

  private static validateConfiguration(
    policyType: PolicyType,
    config: PolicyConfiguration
  ): void {
    switch (policyType) {
      case PolicyType.SPENDING_LIMIT:
      case PolicyType.DAILY_LIMIT:
      case PolicyType.WEEKLY_LIMIT:
      case PolicyType.MONTHLY_LIMIT:
        if (!config.threshold || config.threshold <= 0) {
          throw new InvalidThresholdError('Threshold must be a positive number');
        }
        break;
      case PolicyType.CATEGORY_RESTRICTION:
        if (!config.restrictedCategoryIds?.length && !config.allowedCategoryIds?.length) {
          throw new InvalidPolicyConfigurationError(
            'Category restriction requires either restricted or allowed categories'
          );
        }
        break;
      case PolicyType.MERCHANT_BLACKLIST:
        if (!config.blacklistedMerchants?.length) {
          throw new InvalidPolicyConfigurationError(
            'Merchant blacklist requires at least one blacklisted merchant'
          );
        }
        break;
      case PolicyType.TIME_RESTRICTION:
        if (
          !config.blockedDays?.length &&
          (config.blockedHoursStart === undefined || config.blockedHoursEnd === undefined)
        ) {
          throw new InvalidPolicyConfigurationError(
            'Time restriction requires blocked days or blocked hours'
          );
        }
        break;
      case PolicyType.RECEIPT_REQUIRED:
      case PolicyType.DESCRIPTION_REQUIRED:
      case PolicyType.APPROVAL_REQUIRED:
        if (config.requirementThreshold !== undefined && config.requirementThreshold < 0) {
          throw new InvalidThresholdError('Requirement threshold cannot be negative');
        }
        break;
    }
  }

  get id(): PolicyId { return this.props.policyId; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get description(): string | undefined { return this.props.description; }
  get policyType(): PolicyType { return this.props.policyType; }
  get severity(): ViolationSeverity { return this.props.severity; }
  get configuration(): PolicyConfiguration { return this.props.configuration; }
  get isActive(): boolean { return this.props.isActive; }
  get priority(): number { return this.props.priority; }
  get createdBy(): string { return this.props.createdBy; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) throw new PolicyNameRequiredError();
    if (name.length > MAX_NAME_LENGTH) throw new PolicyNameTooLongError(MAX_NAME_LENGTH);
    this.props.name = name.trim();
    this.props.updatedAt = new Date();
  }

  updateDescription(description?: string): void {
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      throw new PolicyDescriptionTooLongError(MAX_DESCRIPTION_LENGTH);
    }
    this.props.description = description?.trim();
    this.props.updatedAt = new Date();
  }

  updateSeverity(severity: ViolationSeverity): void {
    this.props.severity = severity;
    this.props.updatedAt = new Date();
  }

  updateConfiguration(configuration: PolicyConfiguration): void {
    ExpensePolicy.validateConfiguration(this.props.policyType, configuration);
    this.props.configuration = configuration;
    this.props.updatedAt = new Date();
  }

  updatePriority(priority: number): void {
    this.props.priority = priority;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new PolicyActivatedEvent(
        this.props.policyId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.name
      )
    );
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new PolicyDeactivatedEvent(
        this.props.policyId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.name
      )
    );
  }

  appliesTo(context: { categoryId?: string; userRole?: string; amount?: number }): boolean {
    const config = this.props.configuration;
    if (config.applyCategoryIds?.length) {
      if (!context.categoryId || !config.applyCategoryIds.includes(context.categoryId)) {
        return false;
      }
    }
    if (config.applyToRoles?.length) {
      if (!context.userRole || !config.applyToRoles.includes(context.userRole)) {
        return false;
      }
    }
    return true;
  }

  static toDTO(policy: ExpensePolicy): ExpensePolicyDTO {
    return {
      id: policy.id.getValue(),
      workspaceId: policy.workspaceId.getValue(),
      name: policy.name,
      description: policy.description,
      policyType: policy.policyType,
      severity: policy.severity,
      configuration: policy.configuration,
      priority: policy.priority,
      isActive: policy.isActive,
      createdBy: policy.createdBy,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }
}

export interface ExpensePolicyDTO {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  policyType: PolicyType;
  severity: ViolationSeverity;
  configuration: PolicyConfiguration;
  priority: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
