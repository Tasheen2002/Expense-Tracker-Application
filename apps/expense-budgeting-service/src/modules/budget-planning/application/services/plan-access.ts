import { BudgetPlan } from '../../domain/entities/budget-plan.entity';
import { IBudgetPlanRepository } from '../../domain/repositories/budget-plan.repository';
import { IWorkspaceAccessPort } from '../../domain/ports/workspace-access.port';
import { PlanId } from '../../domain/value-objects/plan-id';
import {
  BudgetPlanNotFoundError,
  UnauthorizedBudgetPlanAccessError,
} from '../../domain/errors/budget-planning.errors';

/** Loads the workspace-scoped plan and applies the shared management policy. */
export async function getAuthorizedPlan(
  repository: Pick<IBudgetPlanRepository, 'findById'>,
  workspaceAccess: IWorkspaceAccessPort,
  userId: string,
  planId: PlanId,
  workspaceId: string,
  action: string
): Promise<BudgetPlan> {
  const plan = await repository.findById(planId, workspaceId);
  if (!plan) throw new BudgetPlanNotFoundError(planId.getValue(), workspaceId);

  const isCreator = plan.createdBy.getValue() === userId;
  const isAdminOrOwner = await workspaceAccess.isAdminOrOwner(
    userId,
    plan.workspaceId.getValue()
  );
  if (!isCreator && !isAdminOrOwner)
    throw new UnauthorizedBudgetPlanAccessError(action);
  return plan;
}
