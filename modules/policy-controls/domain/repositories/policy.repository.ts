import { ExpensePolicy } from "../entities/expense-policy.entity";
import { PolicyId } from "../value-objects/policy-id";
import { PolicyType } from "../enums/policy-type.enum";

export interface PolicyRepository {
  save(policy: ExpensePolicy): Promise<void>;
  findById(id: PolicyId): Promise<ExpensePolicy | null>;
  findByWorkspace(workspaceId: string): Promise<ExpensePolicy[]>;
  findActiveByWorkspace(workspaceId: string): Promise<ExpensePolicy[]>;
  findByType(workspaceId: string, type: PolicyType): Promise<ExpensePolicy[]>;
  findByNameInWorkspace(
    workspaceId: string,
    name: string,
  ): Promise<ExpensePolicy | null>;
  delete(id: PolicyId): Promise<void>;
}
