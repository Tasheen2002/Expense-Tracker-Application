import { describe, expect, it, vi } from 'vitest';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import { BudgetPlan } from '../domain/entities/budget-plan.entity';
import { PeriodType } from '../domain/enums/period-type.enum';
import { PlanPeriod } from '../domain/value-objects/plan-period';
import {
  BudgetPlanNotFoundError,
  UnauthorizedBudgetPlanAccessError,
} from '../domain/errors/budget-planning.errors';
import { getAuthorizedPlan } from '../application/services/plan-access';

describe('Shared plan management access', () => {
  const workspaceId = WorkspaceId.create();
  const creator = UserId.create();
  const other = UserId.create();
  const plan = BudgetPlan.create({
    workspaceId,
    createdBy: creator,
    name: 'Annual plan',
    periodType: PeriodType.YEARLY,
    period: PlanPeriod.createDateOnly(
      new Date('2026-01-01'),
      new Date('2026-12-31')
    ),
  });

  it.each([
    ['creator', creator.getValue(), false],
    ['administrator or owner', other.getValue(), true],
  ])(
    'allows the %s and scopes both lookups to the workspace',
    async (_, actorId, privileged) => {
      const repository = { findById: vi.fn().mockResolvedValue(plan) };
      const access = { isAdminOrOwner: vi.fn().mockResolvedValue(privileged) };
      await expect(
        getAuthorizedPlan(
          repository,
          access,
          actorId,
          plan.id,
          workspaceId.getValue(),
          'update'
        )
      ).resolves.toBe(plan);
      expect(repository.findById).toHaveBeenCalledWith(
        plan.id,
        workspaceId.getValue()
      );
      expect(access.isAdminOrOwner).toHaveBeenCalledWith(
        actorId,
        workspaceId.getValue()
      );
    }
  );

  it('rejects a noncreator without management permission', async () => {
    await expect(
      getAuthorizedPlan(
        { findById: vi.fn().mockResolvedValue(plan) },
        { isAdminOrOwner: vi.fn().mockResolvedValue(false) },
        other.getValue(),
        plan.id,
        workspaceId.getValue(),
        'delete'
      )
    ).rejects.toThrow(UnauthorizedBudgetPlanAccessError);
  });

  it('rejects a missing or foreign-workspace plan before checking roles', async () => {
    const access = { isAdminOrOwner: vi.fn() };
    await expect(
      getAuthorizedPlan(
        { findById: vi.fn().mockResolvedValue(null) },
        access,
        creator.getValue(),
        plan.id,
        WorkspaceId.create().getValue(),
        'update'
      )
    ).rejects.toThrow(BudgetPlanNotFoundError);
    expect(access.isAdminOrOwner).not.toHaveBeenCalled();
  });

  it('propagates an access-provider failure even for the creator', async () => {
    const failure = new Error('Identity unavailable');
    await expect(
      getAuthorizedPlan(
        { findById: vi.fn().mockResolvedValue(plan) },
        { isAdminOrOwner: vi.fn().mockRejectedValue(failure) },
        creator.getValue(),
        plan.id,
        workspaceId.getValue(),
        'update'
      )
    ).rejects.toBe(failure);
  });
});
