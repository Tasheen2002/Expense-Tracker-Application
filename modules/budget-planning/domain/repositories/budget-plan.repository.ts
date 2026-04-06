import { BudgetPlan } from "../entities/budget-plan.entity";
import { PlanId } from "../value-objects/plan-id";
import { WorkspaceId } from "../../../identity-workspace";
import { PlanStatus } from "../enums/plan-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface IBudgetPlanRepository {
  save(plan: BudgetPlan): Promise<void>;
  findById(id: PlanId, workspaceId: string): Promise<BudgetPlan | null>;
  findAll(
    workspaceId: WorkspaceId,
    status?: PlanStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetPlan>>;
  delete(id: PlanId): Promise<void>;
}
