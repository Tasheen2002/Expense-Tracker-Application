import { BudgetPlan } from "../entities/budget-plan.entity";
import { PlanId } from "../value-objects/plan-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { PlanStatus } from "../enums/plan-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface BudgetPlanRepository {
  save(plan: BudgetPlan): Promise<void>;
  findById(id: PlanId): Promise<BudgetPlan | null>;
  findAll(
    workspaceId: WorkspaceId,
    status?: PlanStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BudgetPlan>>;
  delete(id: PlanId): Promise<void>;
}
