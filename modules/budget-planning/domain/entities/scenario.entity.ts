import { ScenarioId } from "../value-objects/scenario-id";
import { PlanId } from "../value-objects/plan-id";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";

export class Scenario {
  private constructor(
    private readonly id: ScenarioId,
    private readonly planId: PlanId,
    private name: string,
    private description: string | null,
    private assumptions: Record<string, any> | null,
    private readonly createdBy: UserId,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: {
    planId: PlanId;
    name: string;
    description?: string | null;
    assumptions?: Record<string, any> | null;
    createdBy: UserId;
  }): Scenario {
    return new Scenario(
      ScenarioId.create(),
      params.planId,
      params.name,
      params.description || null,
      params.assumptions || null,
      params.createdBy,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(params: {
    id: string;
    planId: string;
    name: string;
    description: string | null;
    assumptions: Record<string, any> | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): Scenario {
    return new Scenario(
      ScenarioId.fromString(params.id),
      PlanId.fromString(params.planId),
      params.name,
      params.description,
      params.assumptions,
      UserId.fromString(params.createdBy),
      params.createdAt,
      params.updatedAt,
    );
  }

  getId(): ScenarioId {
    return this.id;
  }

  getPlanId(): PlanId {
    return this.planId;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  getAssumptions(): Record<string, any> | null {
    return this.assumptions;
  }

  getCreatedBy(): UserId {
    return this.createdBy;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateDetails(params: {
    name?: string;
    description?: string | null;
    assumptions?: Record<string, any> | null;
  }): void {
    if (params.name) this.name = params.name;
    if (params.description !== undefined) this.description = params.description;
    if (params.assumptions !== undefined) this.assumptions = params.assumptions;
    this.updatedAt = new Date();
  }
}
