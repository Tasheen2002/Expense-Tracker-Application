import { BudgetPlan } from "../entities/budget-plan.entity";
import { PlanId } from "../value-objects/plan-id";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { PlanStatus } from "../enums/plan-status.enum";

export interface BudgetPlanRepository {
  save(plan: BudgetPlan): Promise<void>;
  findById(id: PlanId): Promise<BudgetPlan | null>;
  findAll(workspaceId: WorkspaceId, status?: PlanStatus): Promise<BudgetPlan[]>;
  delete(id: PlanId): Promise<void>;
}
