import { PrismaClient, Prisma } from "@prisma/client";
import { Scenario } from "../../domain/entities/scenario.entity";
import { IScenarioRepository } from "../../domain/repositories/scenario.repository";
import { ScenarioId } from "../../domain/value-objects/scenario-id";
import { PlanId } from "../../domain/value-objects/plan-id";
import {
  BudgetPlanNotFoundError,
  ScenarioNotFoundError,
  ValidationError,
} from "../../domain/errors/budget-planning.errors";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';

export class ScenarioRepositoryImpl
  implements IScenarioRepository
{
  protected readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  protected get client(): PrismaClient | Prisma.TransactionClient {
    return PrismaUnitOfWork.getClient(this.prisma);
  }

  async save(scenario: Scenario): Promise<void> {
    const wsId = scenario.workspaceId.getValue();
    const planId = scenario.planId.getValue();
    const id = scenario.id.getValue();

    // Verify parent budget plan exists in the same workspace
    const parentPlan = await this.client.budgetPlan.findFirst({
      where: { id: planId, workspaceId: wsId },
      select: { id: true },
    });
    if (!parentPlan) {
      throw new BudgetPlanNotFoundError(planId, wsId);
    }

    const existing = await this.client.scenario.findUnique({
      where: { id },
      select: { id: true, workspaceId: true, planId: true },
    });

    const assumptionsValue = (scenario.assumptions
      ? (scenario.assumptions as Prisma.InputJsonValue)
      : Prisma.JsonNull) as Prisma.InputJsonValue;

    if (existing) {
      if (existing.workspaceId !== wsId) {
        throw new ValidationError("Cannot update scenario belonging to another workspace");
      }
      if (existing.planId !== planId) {
        throw new ValidationError("Cannot reassign scenario to a different budget plan");
      }

      const updateResult = await this.client.scenario.updateMany({
        where: { id, workspaceId: wsId },
        data: {
          name: scenario.name,
          description: scenario.description,
          assumptions: assumptionsValue,
          updatedAt: scenario.updatedAt,
        },
      });

      if (updateResult.count === 0) {
        throw new ScenarioNotFoundError(id, wsId);
      }
    } else {
      await this.client.scenario.create({
        data: {
          id,
          workspaceId: wsId,
          planId,
          name: scenario.name,
          description: scenario.description,
          assumptions: assumptionsValue,
          createdBy: scenario.createdBy.getValue(),
          createdAt: scenario.createdAt,
          updatedAt: scenario.updatedAt,
        },
      });
    }
  }

  async findById(id: ScenarioId, workspaceId: string): Promise<Scenario | null> {
    const raw = await this.client.scenario.findFirst({
      where: { id: id.getValue(), workspaceId },
    });

    if (!raw) return null;

    return Scenario.fromPersistence({
      id: raw.id,
      workspaceId: raw.workspaceId,
      planId: raw.planId,
      name: raw.name,
      description: raw.description,
      assumptions: raw.assumptions as Record<string, unknown> | null,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findByPlanId(
    planId: PlanId,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Scenario>> {
    const where: Prisma.ScenarioWhereInput = {
      planId: planId.getValue(),
      workspaceId,
    };

    return PrismaRepositoryHelper.paginate(
      this.client.scenario,
      { where, orderBy: { createdAt: "desc" } },
      (raw) =>
        Scenario.fromPersistence({
          id: raw.id,
          workspaceId: raw.workspaceId,
          planId: raw.planId,
          name: raw.name,
          description: raw.description,
          assumptions: raw.assumptions as Record<string, unknown> | null,
          createdBy: raw.createdBy,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        }),
      options,
    );
  }

  async delete(id: ScenarioId, workspaceId: string): Promise<void> {
    if (!workspaceId || workspaceId.trim() === '') {
      throw new ValidationError('Workspace ID is required for deleting a scenario');
    }

    const result = await this.client.scenario.deleteMany({
      where: { id: id.getValue(), workspaceId },
    });
    if (result.count === 0) {
      throw new ScenarioNotFoundError(id.getValue(), workspaceId);
    }
  }

  async findByName(planId: PlanId, name: string, workspaceId: string): Promise<Scenario | null> {
    const raw = await this.client.scenario.findFirst({
      where: {
        planId: planId.getValue(),
        name,
        workspaceId,
      },
    });

    if (!raw) return null;

    return Scenario.fromPersistence({
      id: raw.id,
      workspaceId: raw.workspaceId,
      planId: raw.planId,
      name: raw.name,
      description: raw.description,
      assumptions: raw.assumptions as Record<string, unknown> | null,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async countByPlanId(planId: PlanId, workspaceId: string): Promise<number> {
    return this.client.scenario.count({
      where: {
        planId: planId.getValue(),
        workspaceId,
      },
    });
  }
}
