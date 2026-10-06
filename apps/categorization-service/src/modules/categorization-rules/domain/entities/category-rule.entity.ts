import { freezeDomainEvent } from '../events/freeze-domain-event';
import { RuleExecutionId } from '../value-objects/rule-execution-id';
import { RuleId } from '../value-objects/rule-id';
import { RuleCondition } from '../value-objects/rule-condition';
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import {  CategoryId, ExpenseId  } from '@core/domain/value-objects';
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
    freezeDomainEvent(this);
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
  constructor(public readonly ruleId: string, public readonly workspaceId: string) {
    super(ruleId, 'CategoryRule');
    freezeDomainEvent(this);
  }

  get eventType(): string {
    return 'CategoryRuleActivated';
  }

  getPayload(): Record<string, unknown> {
    return { ruleId: this.ruleId, workspaceId: this.workspaceId };
  }
}

export class CategoryRuleDeactivatedEvent extends DomainEvent {
  constructor(public readonly ruleId: string, public readonly workspaceId: string) {
    super(ruleId, 'CategoryRule');
    freezeDomainEvent(this);
  }

  get eventType(): string {
    return 'CategoryRuleDeactivated';
  }

  getPayload(): Record<string, unknown> {
    return { ruleId: this.ruleId, workspaceId: this.workspaceId };
  }
}

export class CategoryRuleUpdatedEvent extends DomainEvent {
  constructor(
    public readonly ruleId: string,
    public readonly updatedFields: readonly string[],
    public readonly workspaceId: string
  ) {
    super(ruleId, 'CategoryRule');
    this.updatedFields = Object.freeze([...updatedFields]);
    freezeDomainEvent(this);
  }

  get eventType(): string {
    return 'CategoryRuleUpdated';
  }

  getPayload(): Record<string, unknown> {
    return {
      ruleId: this.ruleId,
      updatedFields: [...this.updatedFields],
      workspaceId: this.workspaceId,
    };
  }
}

export class CategoryRuleDeletedEvent extends DomainEvent {
  constructor(public readonly ruleId: string, public readonly workspaceId: string) {
    super(ruleId, 'CategoryRule');
    freezeDomainEvent(this);
  }

  get eventType(): string {
    return 'CategoryRuleDeleted';
  }

  getPayload(): Record<string, unknown> {
    return { ruleId: this.ruleId, workspaceId: this.workspaceId };
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
    freezeDomainEvent(this);
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
  deletedAt?: Date | null;
  version?: number;
}

export class CategoryRule extends AggregateRoot {
  private props: CategoryRuleProps;

  private constructor(props: CategoryRuleProps) {
    super();
    if (!(props.id instanceof RuleId) || !(props.workspaceId instanceof WorkspaceId) ||
        !(props.targetCategoryId instanceof CategoryId) || !(props.createdBy instanceof UserId) ||
        !(props.condition instanceof RuleCondition)) {
      throw new InvalidRuleError('Invalid rule identifiers or condition');
    }
    const name = CategoryRule.validateName(props.name);
    if (!Number.isInteger(props.version ?? 1) || (props.version ?? 1) < 1 || (props.version ?? 1) > 2147483647) {
      throw new InvalidRuleError('Invalid persisted rule version');
    }
    const description = CategoryRule.validateDescription(props.description);
    CategoryRule.validatePriority(props.priority);
    if (!(props.createdAt instanceof Date) || !Number.isFinite(props.createdAt.getTime()) ||
        !(props.updatedAt instanceof Date) || !Number.isFinite(props.updatedAt.getTime()) ||
        props.updatedAt < props.createdAt || typeof props.isActive !== 'boolean') {
      throw new InvalidRuleError('Invalid rule timestamps or active state');
    }
    if (props.deletedAt != null && (!(props.deletedAt instanceof Date) ||
        !Number.isFinite(props.deletedAt.getTime()) || props.deletedAt < props.createdAt ||
        props.deletedAt > props.updatedAt || props.isActive)) {
      throw new InvalidRuleError('Deleted rules must be inactive and have a valid deletion timestamp');
    }
    this.props = { ...props, name, description, createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt), deletedAt: props.deletedAt ? new Date(props.deletedAt) : null };
  }

  private static validateName(name: string): string {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      throw new InvalidRuleError('Rule name must contain 1 to 100 nonblank characters');
    }
    return name.trim();
  }

  private static validateDescription(description: string | null | undefined): string | null {
    if (description != null && (typeof description !== 'string' || description.trim().length > 500)) {
      throw new InvalidRuleError('Rule description cannot exceed 500 characters');
    }
    return description?.trim() || null;
  }

  private static validatePriority(priority: number): void {
    if (!Number.isInteger(priority) || priority < 0 || priority > 2147483647) {
      throw new InvalidRuleError('Priority must be a non-negative 32-bit integer');
    }
  }

  private ensureNotDeleted(): void {
    if (this.props.deletedAt) throw new InvalidRuleError('Deleted rules cannot be changed or executed');
  }

  private touch(): void {
    this.props.updatedAt = new Date(Math.max(Date.now(), this.props.updatedAt.getTime()));
  }

  static create(props: {
    workspaceId: WorkspaceId; name: string; description?: string; priority?: number;
    condition: RuleCondition; targetCategoryId: CategoryId; createdBy: UserId;
  }): CategoryRule {
    const now = new Date();
    const rule = new CategoryRule({ ...props, id: RuleId.create(), description: props.description ?? null,
      priority: props.priority === undefined ? 0 : props.priority, isActive: true, createdAt: now, updatedAt: now });
    rule.addDomainEvent(new CategoryRuleCreatedEvent(rule.id.getValue(), rule.workspaceId.getValue(),
      rule.name, rule.targetCategoryId.getValue(), rule.createdBy.getValue()));
    return rule;
  }

  static fromPersistence(props: CategoryRuleProps): CategoryRule {
    return new CategoryRule(props);
  }

  updateDetails(params: { name?: string; description?: string | null; priority?: number }): void {
    this.ensureNotDeleted();
    // Validate the entire proposal before mutating any field.
    const name = params.name === undefined ? this.props.name : CategoryRule.validateName(params.name);
    const description = params.description === undefined ? this.props.description : CategoryRule.validateDescription(params.description);
    const priority = params.priority === undefined ? this.props.priority : params.priority;
    CategoryRule.validatePriority(priority);
    const changedFields: string[] = [];
    if (name !== this.props.name) changedFields.push('name');
    if (description !== this.props.description) changedFields.push('description');
    if (priority !== this.props.priority) changedFields.push('priority');
    if (!changedFields.length) return;
    Object.assign(this.props, { name, description, priority });
    this.touch();
    this.addDomainEvent(new CategoryRuleUpdatedEvent(this.id.getValue(), changedFields, this.workspaceId.getValue()));
  }

  updateName(name: string): void { this.updateDetails({ name }); }
  updateDescription(description: string | null): void { this.updateDetails({ description }); }
  updatePriority(priority: number): void { this.updateDetails({ priority }); }

  updateCondition(condition: RuleCondition): void {
    this.ensureNotDeleted();
    if (!(condition instanceof RuleCondition)) throw new InvalidRuleError('Invalid rule condition');
    if (this.props.condition.equals(condition)) return;
    this.props.condition = condition;
    this.touch();
    this.addDomainEvent(new CategoryRuleUpdatedEvent(this.id.getValue(), ['condition'], this.workspaceId.getValue()));
  }

  updateTargetCategory(categoryId: CategoryId): void {
    this.ensureNotDeleted();
    if (!(categoryId instanceof CategoryId)) throw new InvalidRuleError('Invalid target category');
    if (this.props.targetCategoryId.equals(categoryId)) return;
    this.props.targetCategoryId = categoryId;
    this.touch();
    this.addDomainEvent(new CategoryRuleUpdatedEvent(this.id.getValue(), ['targetCategoryId'], this.workspaceId.getValue()));
  }

  activate(): void {
    this.ensureNotDeleted();
    if (this.props.isActive) return;
    this.props.isActive = true;
    this.touch();
    this.addDomainEvent(new CategoryRuleActivatedEvent(this.id.getValue(), this.workspaceId.getValue()));
  }

  deactivate(): void {
    this.ensureNotDeleted();
    if (!this.props.isActive) return;
    this.props.isActive = false;
    this.touch();
    this.addDomainEvent(new CategoryRuleDeactivatedEvent(this.id.getValue(), this.workspaceId.getValue()));
  }

  markAsDeleted(): void {
    if (this.props.deletedAt) return;
    this.touch();
    this.props.deletedAt = new Date(this.props.updatedAt);
    this.props.isActive = false;
    this.addDomainEvent(new CategoryRuleDeletedEvent(this.id.getValue(), this.workspaceId.getValue()));
  }

  matches(expenseData: { merchant?: string; description?: string; amount: number; paymentMethod?: string }): boolean {
    return this.props.isActive && !this.props.deletedAt && this.props.condition.matches(expenseData);
  }

  recordExecution(executionId: string, expenseId: string, matched: boolean): void {
    this.ensureNotDeleted();
    if (!this.props.isActive) throw new InvalidRuleError('Inactive rules cannot record executions');
    const execution = RuleExecutionId.fromString(executionId);
    const expense = ExpenseId.fromString(expenseId);
    if (typeof matched !== 'boolean') throw new InvalidRuleError('Execution match must be boolean');
    this.addDomainEvent(new RuleExecutedEvent(this.id.getValue(), this.workspaceId.getValue(),
      expense.getValue(), execution.getValue(), matched));
  }

  get id(): RuleId { return this.props.id; }
  get version(): number { return this.props.version ?? 1; }
  acknowledgePersistence(version: number): void {
    if (!Number.isInteger(version) || version !== this.version + 1 || version > 2147483647) {
      throw new InvalidRuleError('Persisted rule version must advance by one');
    }
    this.props.version = version;
  }
  override get domainEvents(): DomainEvent[] { return [...super.domainEvents]; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get priority(): number { return this.props.priority; }
  get isActive(): boolean { return this.props.isActive; }
  get condition(): RuleCondition { return this.props.condition; }
  get targetCategoryId(): CategoryId { return this.props.targetCategoryId; }
  get createdBy(): UserId { return this.props.createdBy; }
  get createdAt(): Date { return new Date(this.props.createdAt); }
  get updatedAt(): Date { return new Date(this.props.updatedAt); }
  get deletedAt(): Date | null { return this.props.deletedAt ? new Date(this.props.deletedAt) : null; }

  static toDTO(rule: CategoryRule): CategoryRuleDTO {
    return { id: rule.id.getValue(), workspaceId: rule.workspaceId.getValue(), name: rule.name,
      description: rule.description, priority: rule.priority, isActive: rule.isActive,
      condition: { type: rule.condition.getConditionType(), value: rule.condition.getConditionValue() },
      targetCategoryId: rule.targetCategoryId.getValue(), createdBy: rule.createdBy.getValue(),
      createdAt: rule.createdAt.toISOString(), updatedAt: rule.updatedAt.toISOString() };
  }
}
