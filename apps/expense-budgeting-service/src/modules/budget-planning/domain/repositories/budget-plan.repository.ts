import { BudgetPlan } from "../entities/budget-plan.entity";
import { PlanId } from "../value-objects/plan-id";
import {  WorkspaceId  } from '@core/domain/value-objects';
import { PlanStatus } from "../enums/plan-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

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
