import { RuleExecutionId } from '../value-objects/rule-execution-id';
import { RuleId } from '../value-objects/rule-id';
import {  WorkspaceId  } from '@core/domain/value-objects';
import {  ExpenseId, CategoryId  } from '@core/domain/value-objects';
import { InvalidRuleExecutionError } from '../errors/categorization-rules.errors';

export interface RuleExecutionDTO {
  id: string;
  ruleId: string;
  expenseId: string;
  workspaceId: string;
  appliedCategoryId: string;
  executedAt: Date;
}

// ============================================================================
// Entity
// ============================================================================

interface RuleExecutionProps {
  id: RuleExecutionId;
  ruleId: RuleId;
  expenseId: ExpenseId;
  workspaceId: WorkspaceId;
  appliedCategoryId: CategoryId;
  executedAt: Date;
}

export class RuleExecution {
  private readonly props: Readonly<RuleExecutionProps>;

  private constructor(props: RuleExecutionProps) {
    if (!(props.id instanceof RuleExecutionId) || !(props.ruleId instanceof RuleId) ||
        !(props.workspaceId instanceof WorkspaceId) || !(props.expenseId instanceof ExpenseId) ||
        !(props.appliedCategoryId instanceof CategoryId) || !(props.executedAt instanceof Date) ||
        !Number.isFinite(props.executedAt.getTime())) {
      throw new InvalidRuleExecutionError('Invalid execution identifiers or timestamp');
    }
    this.props = Object.freeze({ ...props, executedAt: new Date(props.executedAt) });
  }

  static create(params: {
    ruleId: RuleId;
    expenseId: ExpenseId;
    workspaceId: WorkspaceId;
    appliedCategoryId: CategoryId;
  }): RuleExecution {
    return new RuleExecution({
      id: RuleExecutionId.create(),
      ruleId: params.ruleId,
      expenseId: params.expenseId,
      workspaceId: params.workspaceId,
      appliedCategoryId: params.appliedCategoryId,
      executedAt: new Date(),
    });
  }

  static fromPersistence(params: {
    id: RuleExecutionId;
    ruleId: RuleId;
    expenseId: ExpenseId;
    workspaceId: WorkspaceId;
    appliedCategoryId: CategoryId;
    executedAt: Date;
  }): RuleExecution {
    return new RuleExecution(params);
  }

  // Getters
  get id(): RuleExecutionId {
    return this.props.id;
  }
  get ruleId(): RuleId {
    return this.props.ruleId;
  }
  get expenseId(): ExpenseId {
    return this.props.expenseId;
  }
  get workspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }
  get appliedCategoryId(): CategoryId {
    return this.props.appliedCategoryId;
  }
  get executedAt(): Date {
    return new Date(this.props.executedAt);
  }

  static toDTO(execution: RuleExecution): RuleExecutionDTO {
    return {
      id: execution.props.id.getValue(),
      ruleId: execution.props.ruleId.getValue(),
      expenseId: execution.props.expenseId.getValue(),
      workspaceId: execution.props.workspaceId.getValue(),
      appliedCategoryId: execution.props.appliedCategoryId.getValue(),
      executedAt: execution.executedAt,
    };
  }
}
