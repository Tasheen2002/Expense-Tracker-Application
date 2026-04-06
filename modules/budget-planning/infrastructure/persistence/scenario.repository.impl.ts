import { PrismaClient, Prisma } from "@prisma/client";
import { Scenario } from "../../domain/entities/scenario.entity";
import { IScenarioRepository } from "../../domain/repositories/scenario.repository";
import { ScenarioId } from "../../domain/value-objects/scenario-id";
import { PlanId } from "../../domain/value-objects/plan-id";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';

export class ScenarioRepositoryImpl
  extends PrismaRepository<Scenario>
  implements IScenarioRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(scenario: Scenario): Promise<void> {
    const data = {
      id: scenario.id.getValue(),
      planId: scenario.planId.getValue(),
      name: scenario.name,
      description: scenario.description,
      assumptions: scenario.assumptions ?? undefined,
      createdBy: scenario.createdBy.getValue(),
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
    };

    await this.prisma.scenario.upsert({
      where: { id: scenario.id.getValue() },
      update: data,
      create: data,
    });

    await this.dispatchEvents(scenario);
  }

  async findById(id: ScenarioId, workspaceId: string): Promise<Scenario | null> {
    const raw = await this.prisma.scenario.findFirst({
      where: { id: id.getValue(), plan: { workspaceId } },
    });

    if (!raw) return null;

    return Scenario.reconstitute({
      id: raw.id,
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
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Scenario>> {
    const where: Prisma.ScenarioWhereInput = {
      planId: planId.getValue(),
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.scenario,
      { where, orderBy: { createdAt: "desc" } },
      (raw) =>
        Scenario.reconstitute({
          id: raw.id,
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

  async delete(id: ScenarioId): Promise<void> {
    await this.prisma.scenario.delete({
      where: { id: id.getValue() },
    });
  }

  async findByName(planId: PlanId, name: string): Promise<Scenario | null> {
    const raw = await this.prisma.scenario.findFirst({
      where: {
        planId: planId.getValue(),
        name: name,
      },
    });

    if (!raw) return null;

    return Scenario.reconstitute({
      id: raw.id,
      planId: raw.planId,
      name: raw.name,
      description: raw.description,
      assumptions: raw.assumptions as Record<string, unknown> | null,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
