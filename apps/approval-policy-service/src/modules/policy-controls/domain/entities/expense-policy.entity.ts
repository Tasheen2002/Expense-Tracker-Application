import { PolicyId } from '../value-objects';
import { WorkspaceId, UserId, CategoryId, Currency } from '@core/domain/value-objects';
import { PolicyType } from '../enums/policy-type.enum';
import { ViolationSeverity } from '../enums/violation-severity.enum';
import {
  PolicyNameRequiredError,
  PolicyNameTooLongError,
  PolicyDescriptionTooLongError,
  InvalidThresholdError,
  InvalidPolicyConfigurationError,
  InvalidPriorityError,
  InvalidScopeError,
} from '../errors/policy-controls.errors';
import {
  POLICY_NAME_MIN_LENGTH,
  POLICY_NAME_MAX_LENGTH,
  POLICY_DESCRIPTION_MAX_LENGTH,
  MIN_PRIORITY,
  MAX_PRIORITY,
  MIN_THRESHOLD_AMOUNT,
  MAX_THRESHOLD_AMOUNT,
  MAX_BLACKLISTED_MERCHANTS,
  MAX_RESTRICTED_CATEGORIES,
  MAX_ALLOWED_CATEGORIES,
  AGGREGATE_TYPE_EXPENSE_POLICY,
} from '../constants/policy-controls.constants';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';
import { APPROVAL_POLICY_EVENTS } from '../../../../shared/events/approval-policy-events';

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
    super(policyId, AGGREGATE_TYPE_EXPENSE_POLICY);
  }

  get eventType(): string { return APPROVAL_POLICY_EVENTS.POLICY_CREATED; }

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
    super(policyId, AGGREGATE_TYPE_EXPENSE_POLICY);
  }

  get eventType(): string { return APPROVAL_POLICY_EVENTS.POLICY_ACTIVATED; }

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
    super(policyId, AGGREGATE_TYPE_EXPENSE_POLICY);
  }

  get eventType(): string { return APPROVAL_POLICY_EVENTS.POLICY_DEACTIVATED; }

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
    super(policyId, AGGREGATE_TYPE_EXPENSE_POLICY);
  }

  get eventType(): string { return APPROVAL_POLICY_EVENTS.POLICY_UPDATED; }

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
// Entity Types & Helpers
// ============================================================================

export interface PolicyScope {
  categoryIds?: string[];
  userRoles?: string[];
  minAmount?: number;
  maxAmount?: number;
}

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
  appliesTo?: PolicyScope;
  applyCategoryIds?: string[];
  applyToRoles?: string[];
}

function deepCloneAndFreezeConfig(config: PolicyConfiguration): Readonly<PolicyConfiguration> {
  if (!config) return Object.freeze({}) as Readonly<PolicyConfiguration>;

  // Canonicalize legacy applyCategoryIds / applyToRoles into appliesTo
  const appliesTo: PolicyScope | undefined = config.appliesTo
    ? {
        categoryIds: config.appliesTo.categoryIds ? [...config.appliesTo.categoryIds] : undefined,
        userRoles: config.appliesTo.userRoles ? [...config.appliesTo.userRoles] : undefined,
        minAmount: config.appliesTo.minAmount,
        maxAmount: config.appliesTo.maxAmount,
      }
    : (config.applyCategoryIds?.length || config.applyToRoles?.length)
      ? {
          categoryIds: config.applyCategoryIds ? [...config.applyCategoryIds] : undefined,
          userRoles: config.applyToRoles ? [...config.applyToRoles] : undefined,
        }
      : undefined;

  const cloned: PolicyConfiguration = {
    threshold: config.threshold,
    currency: config.currency ? config.currency.trim().toUpperCase() : undefined,
    restrictedCategoryIds: config.restrictedCategoryIds ? [...config.restrictedCategoryIds] : undefined,
    allowedCategoryIds: config.allowedCategoryIds ? [...config.allowedCategoryIds] : undefined,
    blacklistedMerchants: config.blacklistedMerchants ? [...config.blacklistedMerchants] : undefined,
    blockedDays: config.blockedDays ? [...config.blockedDays] : undefined,
    blockedHoursStart: config.blockedHoursStart,
    blockedHoursEnd: config.blockedHoursEnd,
    requirementThreshold: config.requirementThreshold,
    appliesTo,
  };

  if (cloned.appliesTo) {
    if (cloned.appliesTo.categoryIds) Object.freeze(cloned.appliesTo.categoryIds);
    if (cloned.appliesTo.userRoles) Object.freeze(cloned.appliesTo.userRoles);
    Object.freeze(cloned.appliesTo);
  }
  if (cloned.restrictedCategoryIds) Object.freeze(cloned.restrictedCategoryIds);
  if (cloned.allowedCategoryIds) Object.freeze(cloned.allowedCategoryIds);
  if (cloned.blacklistedMerchants) Object.freeze(cloned.blacklistedMerchants);
  if (cloned.blockedDays) Object.freeze(cloned.blockedDays);
  return Object.freeze(cloned);
}

export interface ExpensePolicyProps {
  policyId: PolicyId;
  workspaceId: WorkspaceId;
  name: string;
  description?: string;
  policyType: PolicyType;
  severity: ViolationSeverity;
  configuration: Readonly<PolicyConfiguration>;
  isActive: boolean;
  priority: number;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
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
    createdBy: string | UserId;
  }): ExpensePolicy {
    if (!params.name || params.name.trim().length === 0) {
      throw new PolicyNameRequiredError();
    }
    const trimmedName = params.name.trim();
    if (trimmedName.length < POLICY_NAME_MIN_LENGTH) {
      throw new PolicyNameRequiredError();
    }
    if (trimmedName.length > POLICY_NAME_MAX_LENGTH) {
      throw new PolicyNameTooLongError(POLICY_NAME_MAX_LENGTH);
    }
    if (params.description && params.description.trim().length > POLICY_DESCRIPTION_MAX_LENGTH) {
      throw new PolicyDescriptionTooLongError(POLICY_DESCRIPTION_MAX_LENGTH);
    }

    const priority = params.priority ?? 0;
    if (!Number.isInteger(priority) || priority < MIN_PRIORITY || priority > MAX_PRIORITY) {
      throw new InvalidPriorityError(
        `Priority must be an integer between ${MIN_PRIORITY} and ${MAX_PRIORITY}`
      );
    }

    const createdByUserId =
      typeof params.createdBy === 'string'
        ? UserId.fromString(params.createdBy)
        : params.createdBy;

    ExpensePolicy.validateConfiguration(params.policyType, params.configuration);

    const policy = new ExpensePolicy({
      policyId: PolicyId.create(),
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      name: trimmedName,
      description: params.description?.trim(),
      policyType: params.policyType,
      severity: params.severity,
      configuration: deepCloneAndFreezeConfig(params.configuration),
      isActive: true,
      priority,
      createdBy: createdByUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    policy.addDomainEvent(
      new PolicyCreatedEvent(
        policy.props.policyId.getValue(),
        params.workspaceId,
        trimmedName,
        params.policyType,
        params.severity,
        createdByUserId.getValue()
      )
    );

    return policy;
  }

  static fromPersistence(props: ExpensePolicyProps): ExpensePolicy {
    return new ExpensePolicy({
      ...props,
      configuration: deepCloneAndFreezeConfig(props.configuration),
    });
  }

  private static validateConfiguration(
    policyType: PolicyType,
    config: PolicyConfiguration
  ): void {
    if (!config || typeof config !== 'object') {
      throw new InvalidPolicyConfigurationError('Configuration is required and must be an object');
    }

    // Validate threshold bounds if defined
    if (config.threshold !== undefined) {
      if (
        typeof config.threshold !== 'number' ||
        !Number.isFinite(config.threshold) ||
        Number.isNaN(config.threshold) ||
        config.threshold < MIN_THRESHOLD_AMOUNT ||
        config.threshold > MAX_THRESHOLD_AMOUNT
      ) {
        throw new InvalidThresholdError(
          `Threshold must be a finite number between ${MIN_THRESHOLD_AMOUNT} and ${MAX_THRESHOLD_AMOUNT}`
        );
      }
    }

    // Validate requirementThreshold if defined
    if (config.requirementThreshold !== undefined) {
      if (
        typeof config.requirementThreshold !== 'number' ||
        !Number.isFinite(config.requirementThreshold) ||
        Number.isNaN(config.requirementThreshold) ||
        config.requirementThreshold < 0 ||
        config.requirementThreshold > MAX_THRESHOLD_AMOUNT
      ) {
        throw new InvalidThresholdError(
          `Requirement threshold must be a finite non-negative number up to ${MAX_THRESHOLD_AMOUNT}`
        );
      }
    }

    // Validate category IDs list & counts
    if (config.restrictedCategoryIds) {
      if (config.restrictedCategoryIds.length > MAX_RESTRICTED_CATEGORIES) {
        throw new InvalidPolicyConfigurationError(
          `Restricted categories list cannot exceed ${MAX_RESTRICTED_CATEGORIES} items`
        );
      }
      for (const catId of config.restrictedCategoryIds) {
        if (!CategoryId.isValid(catId)) {
          throw new InvalidPolicyConfigurationError(`Invalid category ID format in restricted categories: ${catId}`);
        }
      }
    }
    if (config.allowedCategoryIds) {
      if (config.allowedCategoryIds.length > MAX_ALLOWED_CATEGORIES) {
        throw new InvalidPolicyConfigurationError(
          `Allowed categories list cannot exceed ${MAX_ALLOWED_CATEGORIES} items`
        );
      }
      for (const catId of config.allowedCategoryIds) {
        if (!CategoryId.isValid(catId)) {
          throw new InvalidPolicyConfigurationError(`Invalid category ID format in allowed categories: ${catId}`);
        }
      }
    }

    // Validate merchant blacklist counts & string lengths
    if (config.blacklistedMerchants) {
      if (config.blacklistedMerchants.length > MAX_BLACKLISTED_MERCHANTS) {
        throw new InvalidPolicyConfigurationError(
          `Blacklisted merchants list cannot exceed ${MAX_BLACKLISTED_MERCHANTS} items`
        );
      }
      for (const m of config.blacklistedMerchants) {
        if (typeof m !== 'string' || m.trim().length === 0 || m.length > 100) {
          throw new InvalidPolicyConfigurationError('Merchant name must be between 1 and 100 characters');
        }
      }
    }

    // Validate blocked days & hours
    if (config.blockedDays) {
      for (const day of config.blockedDays) {
        if (!Number.isInteger(day) || day < 0 || day > 6) {
          throw new InvalidPolicyConfigurationError('Blocked days must be integers between 0 (Sunday) and 6 (Saturday)');
        }
      }
    }
    if (config.blockedHoursStart !== undefined) {
      if (!Number.isInteger(config.blockedHoursStart) || config.blockedHoursStart < 0 || config.blockedHoursStart > 23) {
        throw new InvalidPolicyConfigurationError('Blocked hours start must be an integer between 0 and 23');
      }
    }
    if (config.blockedHoursEnd !== undefined) {
      if (!Number.isInteger(config.blockedHoursEnd) || config.blockedHoursEnd < 0 || config.blockedHoursEnd > 23) {
        throw new InvalidPolicyConfigurationError('Blocked hours end must be an integer between 0 and 23');
      }
    }
    if (
      config.blockedHoursStart !== undefined &&
      config.blockedHoursEnd !== undefined &&
      config.blockedHoursStart === config.blockedHoursEnd
    ) {
      throw new InvalidPolicyConfigurationError('Blocked hours start and end cannot be identical');
    }

    // Validate scope appliesTo
    if (config.appliesTo) {
      const scope = config.appliesTo;
      if (scope.categoryIds) {
        for (const catId of scope.categoryIds) {
          if (!CategoryId.isValid(catId)) {
            throw new InvalidScopeError(`Invalid category ID format in policy scope: ${catId}`);
          }
        }
      }
      if (scope.minAmount !== undefined) {
        if (typeof scope.minAmount !== 'number' || !Number.isFinite(scope.minAmount) || scope.minAmount < 0) {
          throw new InvalidScopeError('Scope minAmount must be a finite non-negative number');
        }
      }
      if (scope.maxAmount !== undefined) {
        if (typeof scope.maxAmount !== 'number' || !Number.isFinite(scope.maxAmount) || scope.maxAmount < 0) {
          throw new InvalidScopeError('Scope maxAmount must be a finite non-negative number');
        }
      }
      if (scope.minAmount !== undefined && scope.maxAmount !== undefined && scope.minAmount > scope.maxAmount) {
        throw new InvalidScopeError('Scope minAmount cannot exceed maxAmount');
      }
    }

    switch (policyType) {
      case PolicyType.DAILY_LIMIT:
      case PolicyType.WEEKLY_LIMIT:
      case PolicyType.MONTHLY_LIMIT:
        throw new InvalidPolicyConfigurationError(
          `Policy type ${policyType} is currently unsupported pending historical spending integration`
        );
      case PolicyType.SPENDING_LIMIT:
        if (!config.threshold || config.threshold <= 0) {
          throw new InvalidThresholdError('Threshold must be a positive number');
        }
        if (
          !config.currency ||
          typeof config.currency !== 'string' ||
          !Currency.isValidCurrencyCode(config.currency.trim().toUpperCase())
        ) {
          throw new InvalidPolicyConfigurationError(
            'Spending limit policy requires a valid 3-letter uppercase ISO currency code'
          );
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
        if (config.requirementThreshold !== undefined && config.requirementThreshold < 0) {
          throw new InvalidThresholdError('Requirement threshold cannot be negative');
        }
        break;
      case PolicyType.APPROVAL_REQUIRED: {
        if (config.requirementThreshold !== undefined && config.requirementThreshold < 0) {
          throw new InvalidThresholdError('Requirement threshold cannot be negative');
        }
        if (config.threshold !== undefined && config.threshold < 0) {
          throw new InvalidThresholdError('Threshold cannot be negative');
        }
        const threshold = config.threshold ?? config.requirementThreshold;
        if (threshold !== undefined && threshold > 0) {
          if (
            !config.currency ||
            typeof config.currency !== 'string' ||
            !Currency.isValidCurrencyCode(config.currency.trim().toUpperCase())
          ) {
            throw new InvalidPolicyConfigurationError(
              'Approval required policy with monetary threshold requires a valid 3-letter uppercase ISO currency code'
            );
          }
        }
        break;
      }
    }
  }

  get id(): PolicyId { return this.props.policyId; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get description(): string | undefined { return this.props.description; }
  get policyType(): PolicyType { return this.props.policyType; }
  get severity(): ViolationSeverity { return this.props.severity; }
  get configuration(): Readonly<PolicyConfiguration> { return this.props.configuration; }
  get isActive(): boolean { return this.props.isActive; }
  get priority(): number { return this.props.priority; }
  get createdBy(): UserId { return this.props.createdBy; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) throw new PolicyNameRequiredError();
    const trimmed = name.trim();
    if (trimmed.length < POLICY_NAME_MIN_LENGTH) throw new PolicyNameRequiredError();
    if (trimmed.length > POLICY_NAME_MAX_LENGTH) throw new PolicyNameTooLongError(POLICY_NAME_MAX_LENGTH);
    if (this.props.name === trimmed) return;
    this.props.name = trimmed;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new PolicyUpdatedEvent(
        this.props.policyId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.name,
        ['name']
      )
    );
  }

  updateDescription(description?: string): void {
    const trimmed = description?.trim();
    if (trimmed && trimmed.length > POLICY_DESCRIPTION_MAX_LENGTH) {
      throw new PolicyDescriptionTooLongError(POLICY_DESCRIPTION_MAX_LENGTH);
    }
    if (this.props.description === trimmed) return;
    this.props.description = trimmed;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new PolicyUpdatedEvent(
        this.props.policyId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.name,
        ['description']
      )
    );
  }

  updateSeverity(severity: ViolationSeverity): void {
    if (this.props.severity === severity) return;
    this.props.severity = severity;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new PolicyUpdatedEvent(
        this.props.policyId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.name,
        ['severity']
      )
    );
  }

  updateConfiguration(configuration: PolicyConfiguration): void {
    ExpensePolicy.validateConfiguration(this.props.policyType, configuration);
    this.props.configuration = deepCloneAndFreezeConfig(configuration);
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new PolicyUpdatedEvent(
        this.props.policyId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.name,
        ['configuration']
      )
    );
  }

  updatePriority(priority: number): void {
    if (!Number.isInteger(priority) || priority < MIN_PRIORITY || priority > MAX_PRIORITY) {
      throw new InvalidPriorityError(
        `Priority must be an integer between ${MIN_PRIORITY} and ${MAX_PRIORITY}`
      );
    }
    if (this.props.priority === priority) return;
    this.props.priority = priority;
    this.props.updatedAt = new Date();
    this.addDomainEvent(
      new PolicyUpdatedEvent(
        this.props.policyId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.name,
        ['priority']
      )
    );
  }

  activate(): void {
    if (this.props.isActive) return; // Idempotent guard
    if (
      this.props.policyType === PolicyType.DAILY_LIMIT ||
      this.props.policyType === PolicyType.WEEKLY_LIMIT ||
      this.props.policyType === PolicyType.MONTHLY_LIMIT
    ) {
      throw new InvalidPolicyConfigurationError(
        `Policy type ${this.props.policyType} cannot be activated: unsupported pending historical spending integration`
      );
    }
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
    if (!this.props.isActive) return; // Idempotent guard
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

    // Evaluate canonical appliesTo scope
    const scope = config.appliesTo;
    if (scope) {
      if (scope.categoryIds?.length) {
        if (!context.categoryId || !scope.categoryIds.includes(context.categoryId)) {
          return false;
        }
      }
      if (scope.userRoles?.length) {
        if (!context.userRole || !scope.userRoles.includes(context.userRole)) {
          return false;
        }
      }
      if (scope.minAmount !== undefined || scope.maxAmount !== undefined) {
        if (context.amount === undefined) {
          return false;
        }
        if (scope.minAmount !== undefined && context.amount < scope.minAmount) {
          return false;
        }
        if (scope.maxAmount !== undefined && context.amount > scope.maxAmount) {
          return false;
        }
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
      configuration: JSON.parse(JSON.stringify(policy.configuration)),
      priority: policy.priority,
      isActive: policy.isActive,
      createdBy: policy.createdBy.getValue(),
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }
}
