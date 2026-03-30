import { ExpensePolicy } from "../entities/expense-policy.entity";
import { PolicyId } from "../value-objects/policy-id";
import { PolicyType } from "../enums/policy-type.enum";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PaginationOptions } from "../../../../apps/api/src/shared/domain/interfaces/pagination-options.interface";

export interface PolicyRepository {
  save(policy: ExpensePolicy): Promise<void>;
  findById(id: PolicyId): Promise<ExpensePolicy | null>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpensePolicy>>;
  findActiveByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpensePolicy>>;
  findByType(
    workspaceId: string,
    type: PolicyType,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpensePolicy>>;
  findByNameInWorkspace(
    workspaceId: string,
    name: string,
  ): Promise<ExpensePolicy | null>;
  delete(id: PolicyId): Promise<void>;
}
