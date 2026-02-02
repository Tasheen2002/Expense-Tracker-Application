import { RuleId } from "../value-objects/rule-id";
import { RuleCondition } from "../value-objects/rule-condition";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { CategoryId } from "../../../expense-ledger/domain/value-objects/category-id";
import { InvalidRuleError } from "../errors/categorization-rules.errors";

export class CategoryRule {
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
      throw new InvalidRuleError("Rule name cannot be empty");
    }

    if (props.name.length > 100) {
      throw new InvalidRuleError("Rule name cannot exceed 100 characters");
    }

    if (props.description && props.description.length > 500) {
      throw new InvalidRuleError(
        "Rule description cannot exceed 500 characters",
      );
    }

    const priority = props.priority ?? 0;
    if (priority < 0) {
      throw new InvalidRuleError("Priority cannot be negative");
    }

    const now = new Date();

    return new CategoryRule({
      id: RuleId.create(),
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
    if (props.name !== undefined) {
      if (!props.name || props.name.trim().length === 0) {
        throw new InvalidRuleError("Rule name cannot be empty");
      }
      if (props.name.length > 100) {
        throw new InvalidRuleError("Rule name cannot exceed 100 characters");
      }
      this.name = props.name.trim();
    }

    if (props.description !== undefined) {
      if (props.description && props.description.length > 500) {
        throw new InvalidRuleError(
          "Rule description cannot exceed 500 characters",
        );
      }
      this.description = props.description?.trim() || null;
    }

    if (props.priority !== undefined) {
      if (props.priority < 0) {
        throw new InvalidRuleError("Priority cannot be negative");
      }
      this.priority = props.priority;
    }

    this.updatedAt = new Date();
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new InvalidRuleError("Rule name cannot be empty");
    }
    if (name.length > 100) {
      throw new InvalidRuleError("Rule name cannot exceed 100 characters");
    }
    this.name = name.trim();
    this.updatedAt = new Date();
  }

  updateDescription(description: string | null): void {
    if (description && description.length > 500) {
      throw new InvalidRuleError(
        "Rule description cannot exceed 500 characters",
      );
    }
    this.description = description?.trim() || null;
    this.updatedAt = new Date();
  }

  updatePriority(priority: number): void {
    if (priority < 0) {
      throw new InvalidRuleError("Priority cannot be negative");
    }
    this.priority = priority;
    this.updatedAt = new Date();
  }

  updateCondition(condition: RuleCondition): void {
    this.condition = condition;
    this.updatedAt = new Date();
  }

  updateTargetCategory(categoryId: CategoryId): void {
    this.targetCategoryId = categoryId;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
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
}
