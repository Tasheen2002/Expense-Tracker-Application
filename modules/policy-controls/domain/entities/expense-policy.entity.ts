import { PolicyId } from "../value-objects/policy-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { PolicyType } from "../enums/policy-type.enum";
import { ViolationSeverity } from "../enums/violation-severity.enum";
import {
  PolicyNameRequiredError,
  PolicyNameTooLongError,
  PolicyDescriptionTooLongError,
  InvalidThresholdError,
  InvalidPolicyConfigurationError,
} from "../errors/policy-controls.errors";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";

// ============================================================================
// Domain Events
// ============================================================================

/**
 * Emitted when a new expense policy is created.
 */
export class PolicyCreatedEvent extends DomainEvent {
  constructor(
    public readonly policyId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly policyType: PolicyType,
    public readonly severity: ViolationSeverity,
    public readonly createdBy: string,
  ) {
    super(policyId, "ExpensePolicy");
  }

  get eventType(): string {
    return "policy.created";
  }

  protected getPayload(): Record<string, unknown> {
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

/**
 * Emitted when a policy is activated.
 */
export class PolicyActivatedEvent extends DomainEvent {
  constructor(
    public readonly policyId: string,
    public readonly workspaceId: string,
    public readonly name: string,
  ) {
    super(policyId, "ExpensePolicy");
  }

  get eventType(): string {
    return "policy.activated";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      policyId: this.policyId,
      workspaceId: this.workspaceId,
      name: this.name,
    };
  }
}

/**
 * Emitted when a policy is deactivated.
 */
export class PolicyDeactivatedEvent extends DomainEvent {
  constructor(
    public readonly policyId: string,
    public readonly workspaceId: string,
    public readonly name: string,
  ) {
    super(policyId, "ExpensePolicy");
  }

  get eventType(): string {
    return "policy.deactivated";
  }

  protected getPayload(): Record<string, unknown> {
    return {
      policyId: this.policyId,
      workspaceId: this.workspaceId,
      name: this.name,
    };
  }
}

/**
 * Emitted when a policy is updated.
 */
export class PolicyUpdatedEvent extends DomainEvent {
  constructor(
    public readonly policyId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly updatedFields: string[],
  ) {
    super(policyId, "ExpensePolicy");
  }

  get eventType(): string {
    return "policy.updated";
  }

  protected getPayload(): Record<string, unknown> {
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

/**
 * Configuration for different policy types
 */
export interface PolicyConfiguration {
  // For spending/amount limits
  threshold?: number;
  currency?: string;

  // For category restrictions
  restrictedCategoryIds?: string[];
  allowedCategoryIds?: string[];

  // For merchant blacklist
  blacklistedMerchants?: string[];

  // For time restrictions
  blockedDays?: number[]; // 0=Sunday, 6=Saturday
  blockedHoursStart?: number;
  blockedHoursEnd?: number;

  // For receipt/description requirements
  requirementThreshold?: number; // Amount above which requirement applies

  // Apply to specific categories only
  applyCategoryIds?: string[];

  // Apply to specific user roles only
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
  priority: number; // Higher priority = evaluated first
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Expense Policy entity - defines rules that expenses must comply with
 */
export class ExpensePolicy extends AggregateRoot {
  private props: ExpensePolicyProps;

  private constructor(props: ExpensePolicyProps) {
    super();
    this.props = props;
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
    // Validate name
    if (!params.name || params.name.trim().length === 0) {
      throw new PolicyNameRequiredError();
    }
    if (params.name.length > MAX_NAME_LENGTH) {
      throw new PolicyNameTooLongError(MAX_NAME_LENGTH);
    }

    // Validate description
    if (
      params.description &&
      params.description.length > MAX_DESCRIPTION_LENGTH
    ) {
      throw new PolicyDescriptionTooLongError(MAX_DESCRIPTION_LENGTH);
    }

    // Validate configuration based on policy type
    ExpensePolicy.validateConfiguration(
      params.policyType,
      params.configuration,
    );

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

    // Add domain event
    policy.addDomainEvent(
      new PolicyCreatedEvent(
        policy.props.policyId.getValue(),
        params.workspaceId,
        params.name.trim(),
        params.policyType,
        params.severity,
        params.createdBy,
      ),
    );

    return policy;
  }

  static reconstitute(props: ExpensePolicyProps): ExpensePolicy {
    return new ExpensePolicy(props);
  }

  private static validateConfiguration(
    policyType: PolicyType,
    config: PolicyConfiguration,
  ): void {
    switch (policyType) {
      case PolicyType.SPENDING_LIMIT:
      case PolicyType.DAILY_LIMIT:
      case PolicyType.WEEKLY_LIMIT:
      case PolicyType.MONTHLY_LIMIT:
        if (!config.threshold || config.threshold <= 0) {
          throw new InvalidThresholdError(
            "Threshold must be a positive number",
          );
        }
        break;

      case PolicyType.CATEGORY_RESTRICTION:
        if (
          !config.restrictedCategoryIds?.length &&
          !config.allowedCategoryIds?.length
        ) {
          throw new InvalidPolicyConfigurationError(
            "Category restriction requires either restricted or allowed categories",
          );
        }
        break;

      case PolicyType.MERCHANT_BLACKLIST:
        if (!config.blacklistedMerchants?.length) {
          throw new InvalidPolicyConfigurationError(
            "Merchant blacklist requires at least one blacklisted merchant",
          );
        }
        break;

      case PolicyType.TIME_RESTRICTION:
        if (
          !config.blockedDays?.length &&
          (config.blockedHoursStart === undefined ||
            config.blockedHoursEnd === undefined)
        ) {
          throw new InvalidPolicyConfigurationError(
            "Time restriction requires blocked days or blocked hours",
          );
        }
        break;

      case PolicyType.RECEIPT_REQUIRED:
      case PolicyType.DESCRIPTION_REQUIRED:
      case PolicyType.APPROVAL_REQUIRED:
        if (
          config.requirementThreshold !== undefined &&
          config.requirementThreshold < 0
        ) {
          throw new InvalidThresholdError(
            "Requirement threshold cannot be negative",
          );
        }
        break;
    }
  }

  // Getters
  getId(): PolicyId {
    return this.props.policyId;
  }

  getWorkspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  getName(): string {
    return this.props.name;
  }

  getDescription(): string | undefined {
    return this.props.description;
  }

  getPolicyType(): PolicyType {
    return this.props.policyType;
  }

  getSeverity(): ViolationSeverity {
    return this.props.severity;
  }

  getConfiguration(): PolicyConfiguration {
    return this.props.configuration;
  }

  isActive(): boolean {
    return this.props.isActive;
  }

  getPriority(): number {
    return this.props.priority;
  }

  getCreatedBy(): string {
    return this.props.createdBy;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Mutators
  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new PolicyNameRequiredError();
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new PolicyNameTooLongError(MAX_NAME_LENGTH);
    }
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

    // Add domain event
    this.addDomainEvent(
      new PolicyActivatedEvent(
        this.props.policyId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.name,
      ),
    );
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();

    // Add domain event
    this.addDomainEvent(
      new PolicyDeactivatedEvent(
        this.props.policyId.getValue(),
        this.props.workspaceId.getValue(),
        this.props.name,
      ),
    );
  }

  /**
   * Check if this policy applies to a given expense context
   */
  appliesTo(context: {
    categoryId?: string;
    userRole?: string;
    amount?: number;
  }): boolean {
    const config = this.props.configuration;

    // Check category filter
    if (config.applyCategoryIds?.length) {
      if (
        !context.categoryId ||
        !config.applyCategoryIds.includes(context.categoryId)
      ) {
        return false;
      }
    }

    // Check role filter
    if (config.applyToRoles?.length) {
      if (
        !context.userRole ||
        !config.applyToRoles.includes(context.userRole)
      ) {
        return false;
      }
    }

    return true;
  }
}
