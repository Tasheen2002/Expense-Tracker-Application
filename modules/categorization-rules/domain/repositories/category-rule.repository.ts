import { CategoryRule } from "../entities/category-rule.entity";
import { RuleId } from "../value-objects/rule-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface CategoryRuleRepository {
  save(rule: CategoryRule): Promise<void>;
  findById(id: RuleId): Promise<CategoryRule | null>;
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
