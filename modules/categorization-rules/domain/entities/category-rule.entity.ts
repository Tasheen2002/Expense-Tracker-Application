import { RuleId } from '../value-objects/rule-id';
import { RuleCondition } from '../value-objects/rule-condition';
import { WorkspaceId, UserId } from '../../../identity-workspace';
import { CategoryId } from '../../../expense-ledger';
import { InvalidRuleError } from '../errors/categorization-rules.errors';
import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';
import { AggregateRoot } from '../../../../packages/core/src/domain/aggregate-root';

// ============================================================================
// Domain Events
// ============================================================================

export class CategoryRuleCreatedEvent extends DomainEvent {
  constructor(
    public readonly ruleId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly targetCategoryId: string,
    public readonly createdBy: string
  ) {
    super(ruleId, 'CategoryRule');
  }

  get eventType(): string {
    return 'CategoryRuleCreated';
  }

  getPayload(): Record<string, unknown> {
    return {
      ruleId: this.ruleId,
      workspaceId: this.workspaceId,
      name: this.name,
      targetCategoryId: this.targetCategoryId,
      createdBy: this.createdBy,
    };
  }
}

export class CategoryRuleActivatedEvent extends DomainEvent {
  constructor(public readonly ruleId: string) {
    super(ruleId, 'CategoryRule');
  }

  get eventType(): string {
    return 'CategoryRuleActivated';
  }

  getPayload(): Record<string, unknown> {
    return { ruleId: this.ruleId };
  }
}

export class CategoryRuleDeactivatedEvent extends DomainEvent {
  constructor(public readonly ruleId: string) {
    super(ruleId, 'CategoryRule');
  }

  get eventType(): string {
    return 'CategoryRuleDeactivated';
  }

  getPayload(): Record<string, unknown> {
    return { ruleId: this.ruleId };
  }
}

export class CategoryRuleUpdatedEvent extends DomainEvent {
  constructor(
    public readonly ruleId: string,
    public readonly updatedFields: string[]
  ) {
    super(ruleId, 'CategoryRule');
  }

  get eventType(): string {
    return 'CategoryRuleUpdated';
  }

  getPayload(): Record<string, unknown> {
    return {
      ruleId: this.ruleId,
      updatedFields: this.updatedFields,
    };
  }
}

export class CategoryRuleDeletedEvent extends DomainEvent {
  constructor(public readonly ruleId: string) {
    super(ruleId, 'CategoryRule');
  }

  get eventType(): string {
    return 'CategoryRuleDeleted';
  }

  getPayload(): Record<string, unknown> {
    return { ruleId: this.ruleId };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class CategoryRule extends AggregateRoot {
  private id: RuleId;
  private workspaceId: WorkspaceId;
  private name: string;
  private description: string | null;
  private priority: number;
  private isActive: boolean;
  private condition: RuleCondition;
  private targetCategoryId: CategoryId;
  private createdBy: UserId;
  private createdAt: Date;
  private updatedAt: Date;

  private constructor(props: {
    id: RuleId;
    workspaceId: WorkspaceId;
    name: string;
    description: string | null;
    priority: number;
    isActive: boolean;
    condition: RuleCondition;
    targetCategoryId: CategoryId;
    createdBy: UserId;
    createdAt: Date;
    updatedAt: Date;
  }) {
    super();
    this.id = props.id;
    this.workspaceId = props.workspaceId;
    this.name = props.name;
    this.description = props.description;
    this.priority = props.priority;
    this.isActive = props.isActive;
    this.condition = props.condition;
    this.targetCategoryId = props.targetCategoryId;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: {
    workspaceId: WorkspaceId;
    name: string;
    description?: string;
    priority?: number;
    condition: RuleCondition;
    targetCategoryId: CategoryId;
    createdBy: UserId;
  }): CategoryRule {
    if (!props.name || props.name.trim().length === 0) {
      throw new InvalidRuleError('Rule name cannot be empty');
    }

    if (props.name.length > 100) {
      throw new InvalidRuleError('Rule name cannot exceed 100 characters');
    }

    if (props.description && props.description.length > 500) {
      throw new InvalidRuleError(
        'Rule description cannot exceed 500 characters'
      );
    }

    const priority = props.priority ?? 0;
    if (priority < 0) {
      throw new InvalidRuleError('Priority cannot be negative');
    }

    const now = new Date();
    const ruleId = RuleId.create();

    const rule = new CategoryRule({
      id: ruleId,
      workspaceId: props.workspaceId,
      name: props.name.trim(),
      description: props.description?.trim() || null,
      priority,
      isActive: true,
      condition: props.condition,
      targetCategoryId: props.targetCategoryId,
      createdBy: props.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    rule.addDomainEvent(
      new CategoryRuleCreatedEvent(
        ruleId.getValue(),
        props.workspaceId.getValue(),
        props.name.trim(),
        props.targetCategoryId.getValue(),
        props.createdBy.getValue()
      )
    );

    return rule;
  }

  static reconstitute(props: {
    id: RuleId;
    workspaceId: WorkspaceId;
    name: string;
    description: string | null;
    priority: number;
    isActive: boolean;
    condition: RuleCondition;
    targetCategoryId: CategoryId;
    createdBy: UserId;
    createdAt: Date;
    updatedAt: Date;
  }): CategoryRule {
    return new CategoryRule(props);
  }

  // Update methods
  updateDetails(props: {
    name?: string;
    description?: string | null;
    priority?: number;
  }): void {
    const changedFields: string[] = [];

    if (props.name !== undefined) {
      if (!props.name || props.name.trim().length === 0) {
        throw new InvalidRuleError('Rule name cannot be empty');
      }
      if (props.name.length > 100) {
        throw new InvalidRuleError('Rule name cannot exceed 100 characters');
      }
      this.name = props.name.trim();
      changedFields.push('name');
    }

    if (props.description !== undefined) {
      if (props.description && props.description.length > 500) {
        throw new InvalidRuleError(
          'Rule description cannot exceed 500 characters'
        );
      }
      this.description = props.description?.trim() || null;
      changedFields.push('description');
    }

    if (props.priority !== undefined) {
      if (props.priority < 0) {
        throw new InvalidRuleError('Priority cannot be negative');
      }
      this.priority = props.priority;
      changedFields.push('priority');
    }

    this.updatedAt = new Date();
    if (changedFields.length > 0) {
      this.addDomainEvent(
        new CategoryRuleUpdatedEvent(this.id.getValue(), changedFields)
      );
    }
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new InvalidRuleError('Rule name cannot be empty');
    }
    if (name.length > 100) {
      throw new InvalidRuleError('Rule name cannot exceed 100 characters');
    }
    this.name = name.trim();
    this.updatedAt = new Date();
    this.addDomainEvent(
      new CategoryRuleUpdatedEvent(this.id.getValue(), ['name'])
    );
  }

  updateDescription(description: string | null): void {
    if (description && description.length > 500) {
      throw new InvalidRuleError(
        'Rule description cannot exceed 500 characters'
      );
    }
    this.description = description?.trim() || null;
    this.updatedAt = new Date();
    this.addDomainEvent(
      new CategoryRuleUpdatedEvent(this.id.getValue(), ['description'])
    );
  }

  updatePriority(priority: number): void {
    if (priority < 0) {
      throw new InvalidRuleError('Priority cannot be negative');
    }
    this.priority = priority;
    this.updatedAt = new Date();
    this.addDomainEvent(
      new CategoryRuleUpdatedEvent(this.id.getValue(), ['priority'])
    );
  }

  updateCondition(condition: RuleCondition): void {
    this.condition = condition;
    this.updatedAt = new Date();
    this.addDomainEvent(
      new CategoryRuleUpdatedEvent(this.id.getValue(), ['condition'])
    );
  }

  updateTargetCategory(categoryId: CategoryId): void {
    this.targetCategoryId = categoryId;
    this.updatedAt = new Date();
    this.addDomainEvent(
      new CategoryRuleUpdatedEvent(this.id.getValue(), ['targetCategoryId'])
    );
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
    this.addDomainEvent(new CategoryRuleActivatedEvent(this.id.getValue()));
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
    this.addDomainEvent(new CategoryRuleDeactivatedEvent(this.id.getValue()));
  }

  markAsDeleted(): void {
    this.addDomainEvent(new CategoryRuleDeletedEvent(this.id.getValue()));
  }

  // Check if rule matches expense data
  matches(expenseData: {
    merchant?: string;
    description?: string;
    amount: number;
    paymentMethod?: string;
  }): boolean {
    if (!this.isActive) {
      return false;
    }
    return this.condition.matches(expenseData);
  }

  // Getters
  getId(): RuleId {
    return this.id;
  }

  getWorkspaceId(): WorkspaceId {
    return this.workspaceId;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  getPriority(): number {
    return this.priority;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getCondition(): RuleCondition {
    return this.condition;
  }

  getTargetCategoryId(): CategoryId {
    return this.targetCategoryId;
  }

  getCreatedBy(): UserId {
    return this.createdBy;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  /**
   * Serialize CategoryRule to DTO for API responses.
   * Static method ensures serialization is separate from domain logic.
   */
  static toDTO(rule: CategoryRule): CategoryRuleDTO {
    return {
      id: rule.id.getValue(),
      workspaceId: rule.workspaceId.getValue(),
      name: rule.name,
      description: rule.description,
      priority: rule.priority,
      isActive: rule.isActive,
      condition: {
        type: rule.condition.getConditionType(),
        value: rule.condition.getConditionValue(),
      },
      targetCategoryId: rule.targetCategoryId.getValue(),
      createdBy: rule.createdBy.getValue(),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}

export interface CategoryRuleDTO {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  priority: number;
  isActive: boolean;
  condition: {
    type: string;
    value: string;
  };
  targetCategoryId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
