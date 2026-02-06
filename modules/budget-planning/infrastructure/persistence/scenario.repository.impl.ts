import { PrismaClient, Prisma } from "@prisma/client";
import { Scenario } from "../../domain/entities/scenario.entity";
import { ScenarioRepository } from "../../domain/repositories/scenario.repository";
import { ScenarioId } from "../../domain/value-objects/scenario-id";
import { PlanId } from "../../domain/value-objects/plan-id";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";
import { PrismaRepository } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";

export class ScenarioRepositoryImpl
  extends PrismaRepository<Scenario>
  implements ScenarioRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(scenario: Scenario): Promise<void> {
    const data = {
      id: scenario.getId().getValue(),
      planId: scenario.getPlanId().getValue(),
      name: scenario.getName(),
      description: scenario.getDescription(),
      assumptions: scenario.getAssumptions() ?? undefined,
      createdBy: scenario.getCreatedBy().getValue(),
      createdAt: scenario.getCreatedAt(),
      updatedAt: scenario.getUpdatedAt(),
    };

    await this.prisma.scenario.upsert({
      where: { id: scenario.getId().getValue() },
      update: data,
      create: data,
    });

    await this.dispatchEvents(scenario);
  }

  async findById(id: ScenarioId): Promise<Scenario | null> {
    const raw = await this.prisma.scenario.findUnique({
      where: { id: id.getValue() },
    });

    if (!raw) return null;

    return Scenario.reconstitute({
      id: raw.id,
      planId: raw.planId,
      name: raw.name,
      description: raw.description,
      assumptions: raw.assumptions as Record<string, any> | null,
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
          assumptions: raw.assumptions as Record<string, any> | null,
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
      assumptions: raw.assumptions as Record<string, any> | null,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
