import { CategoryRule } from "../entities/category-rule.entity";
import { RuleId } from "../value-objects/rule-id";
import { WorkspaceId } from "../../../identity-workspace";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface ICategoryRuleRepository {
  save(rule: CategoryRule): Promise<void>;
  findById(id: RuleId, workspaceId: WorkspaceId): Promise<CategoryRule | null>;
  findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CategoryRule>>;
  findActiveByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<CategoryRule>>;
  findByName(
    name: string,
    workspaceId: WorkspaceId,
  ): Promise<CategoryRule | null>;
  delete(id: RuleId): Promise<void>;
}
