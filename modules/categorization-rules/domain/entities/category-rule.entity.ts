import { RuleId } from '../value-objects/rule-id';
import { RuleCondition } from '../value-objects/rule-condition';
import { WorkspaceId, UserId } from '../../../identity-workspace';
import { CategoryId } from '../../../expense-ledger';
import { InvalidRuleError } from '../errors/categorization-rules.errors';
import { DomainEvent } from '@core/domain/events/domain-event';
import { AggregateRoot } from '@core/domain/aggregate-root';

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
  createdAt: string;
  updatedAt: string;
}

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

export class RuleExecutedEvent extends DomainEvent {
  constructor(
    public readonly ruleId: string,
    public readonly workspaceId: string,
    public readonly expenseId: string,
    public readonly executionId: string,
    public readonly matched: boolean
  ) {
    super(ruleId, 'CategoryRule');
  }

  get eventType(): string {
    return 'category_rule.executed';
  }

  getPayload(): Record<string, unknown> {
    return {
      ruleId: this.ruleId,
      workspaceId: this.workspaceId,
      expenseId: this.expenseId,
      executionId: this.executionId,
      matched: this.matched,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

interface CategoryRuleProps {
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
}

export class CategoryRule extends AggregateRoot {
  private constructor(private props: CategoryRuleProps) {
    super();
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

  static fromPersistence(props: {
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
  updateDetails(params: {
    name?: string;
    description?: string | null;
    priority?: number;
  }): void {
    const changedFields: string[] = [];

    if (params.name !== undefined) {
      if (!params.name || params.name.trim().length === 0) {
        throw new InvalidRuleError('Rule name cannot be empty');
      }
      if (params.name.length > 100) {
        throw new InvalidRuleError('Rule name cannot exceed 100 characters');
      }
      this.props.name = params.name.trim();
      changedFields.push('name');
    }

    if (params.description !== undefined) {
      if (params.description && params.description.length > 500) {
        throw new InvalidRuleError('Rule description cannot exceed 500 characters');
      }
      this.props.description = params.description?.trim() || null;
      changedFields.push('description');
    }

    if (params.priority !== undefined) {
      if (params.priority < 0) {
        throw new InvalidRuleError('Priority cannot be negative');
      }
      this.props.priority = params.priority;
      changedFields.push('priority');
    }

    this.props.updatedAt = new Date();
    if (changedFields.length > 0) {
      this.addDomainEvent(new CategoryRuleUpdatedEvent(this.props.id.getValue(), changedFields));
    }
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new InvalidRuleError('Rule name cannot be empty');
    }
    if (name.length > 100) {
      throw new InvalidRuleError('Rule name cannot exceed 100 characters');
    }
    this.props.name = name.trim();
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryRuleUpdatedEvent(this.props.id.getValue(), ['name']));
  }

  updateDescription(description: string | null): void {
    if (description && description.length > 500) {
      throw new InvalidRuleError('Rule description cannot exceed 500 characters');
    }
    this.props.description = description?.trim() || null;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryRuleUpdatedEvent(this.props.id.getValue(), ['description']));
  }

  updatePriority(priority: number): void {
    if (priority < 0) {
      throw new InvalidRuleError('Priority cannot be negative');
    }
    this.props.priority = priority;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryRuleUpdatedEvent(this.props.id.getValue(), ['priority']));
  }

  updateCondition(condition: RuleCondition): void {
    this.props.condition = condition;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryRuleUpdatedEvent(this.props.id.getValue(), ['condition']));
  }

  updateTargetCategory(categoryId: CategoryId): void {
    this.props.targetCategoryId = categoryId;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryRuleUpdatedEvent(this.props.id.getValue(), ['targetCategoryId']));
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryRuleActivatedEvent(this.props.id.getValue()));
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new CategoryRuleDeactivatedEvent(this.props.id.getValue()));
  }

  markAsDeleted(): void {
    this.addDomainEvent(new CategoryRuleDeletedEvent(this.props.id.getValue()));
  }

  matches(expenseData: {
    merchant?: string;
    description?: string;
    amount: number;
    paymentMethod?: string;
  }): boolean {
    if (!this.props.isActive) return false;
    return this.props.condition.matches(expenseData);
  }

  recordExecution(executionId: string, expenseId: string, matched: boolean): void {
    this.addDomainEvent(
      new RuleExecutedEvent(
        this.props.id.getValue(),
        this.props.workspaceId.getValue(),
        expenseId,
        executionId,
        matched,
      )
    );
  }

  // Getters
  get id(): RuleId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get priority(): number { return this.props.priority; }
  get isActive(): boolean { return this.props.isActive; }
  get condition(): RuleCondition { return this.props.condition; }
  get targetCategoryId(): CategoryId { return this.props.targetCategoryId; }
  get createdBy(): UserId { return this.props.createdBy; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  static toDTO(rule: CategoryRule): CategoryRuleDTO {
    return {
      id: rule.props.id.getValue(),
      workspaceId: rule.props.workspaceId.getValue(),
      name: rule.props.name,
      description: rule.props.description,
      priority: rule.props.priority,
      isActive: rule.props.isActive,
      condition: {
        type: rule.props.condition.getConditionType(),
        value: rule.props.condition.getConditionValue(),
      },
      targetCategoryId: rule.props.targetCategoryId.getValue(),
      createdBy: rule.props.createdBy.getValue(),
      createdAt: rule.props.createdAt.toISOString(),
      updatedAt: rule.props.updatedAt.toISOString(),
    };
  }
}
