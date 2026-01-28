import { PrismaClient } from "@prisma/client";
import { Scenario } from "../../domain/entities/scenario.entity";
import { ScenarioRepository } from "../../domain/repositories/scenario.repository";
import { ScenarioId } from "../../domain/value-objects/scenario-id";
import { PlanId } from "../../domain/value-objects/plan-id";

export class ScenarioRepositoryImpl implements ScenarioRepository {
  constructor(private readonly prisma: PrismaClient) {}

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

  async findByPlanId(planId: PlanId): Promise<Scenario[]> {
    const raws = await this.prisma.scenario.findMany({
      where: { planId: planId.getValue() },
      orderBy: { createdAt: "desc" },
    });

    return raws.map((raw) =>
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
