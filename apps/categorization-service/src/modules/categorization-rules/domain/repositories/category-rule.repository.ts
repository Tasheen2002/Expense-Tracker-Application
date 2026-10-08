import { CategoryRule } from "../entities/category-rule.entity";
import { RuleId } from "../value-objects/rule-id";
import {  WorkspaceId  } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface ICategoryRuleRepository {
  /** Persist state and pending events atomically; never change an existing row's workspace. */
  save(rule: CategoryRule): Promise<void>;
  findById(id: RuleId, workspaceId: WorkspaceId): Promise<CategoryRule | null>;
  findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: Pick<PaginationOptions, 'limit' | 'offset'>,
  ): Promise<PaginatedResult<CategoryRule>>;
  findActiveByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: Pick<PaginationOptions, 'limit' | 'offset'>,
  ): Promise<PaginatedResult<CategoryRule>>;
  /** Name reservation lookup includes deleted rules. */
  findByName(
    name: string,
    workspaceId: WorkspaceId,
  ): Promise<CategoryRule | null>;
  /** Workspace-scoped history lookup includes deleted rules. */
  findIncludingDeleted(id: RuleId, workspaceId: WorkspaceId): Promise<CategoryRule | null>;
  /** Retain the rule and its name for execution history; hide it from operational reads. */
  delete(rule: CategoryRule): Promise<void>;
}
