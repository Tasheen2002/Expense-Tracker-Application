import { ScenarioId } from "../value-objects/scenario-id";
import { PlanId } from "../value-objects/plan-id";
import { UserId } from "../../../identity-workspace/domain/value-objects/user-id.vo";
import { AggregateRoot } from "../../../../apps/api/src/shared/domain/aggregate-root";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events/domain-event";

// ============================================================================
// Domain Events
// ============================================================================

export class ScenarioCreatedEvent extends DomainEvent {
  constructor(
    public readonly scenarioId: string,
    public readonly planId: string,
    public readonly name: string,
    public readonly createdBy: string,
  ) {
    super(scenarioId, "Scenario");
  }

  get eventType(): string {
    return "ScenarioCreated";
  }

  getPayload(): Record<string, unknown> {
    return {
      scenarioId: this.scenarioId,
      planId: this.planId,
      name: this.name,
      createdBy: this.createdBy,
    };
  }
}

export class ScenarioUpdatedEvent extends DomainEvent {
  constructor(
    public readonly scenarioId: string,
    public readonly changes: Record<string, unknown>,
  ) {
    super(scenarioId, "Scenario");
  }

  get eventType(): string {
    return "ScenarioUpdated";
  }

  getPayload(): Record<string, unknown> {
    return {
      scenarioId: this.scenarioId,
      changes: this.changes,
    };
  }
}

// ============================================================================
// Entity
// ============================================================================

export class Scenario extends AggregateRoot {
  private constructor(
    private readonly id: ScenarioId,
    private readonly planId: PlanId,
    private name: string,
    private description: string | null,
    private assumptions: Record<string, any> | null,
    private readonly createdBy: UserId,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    super();
  }

  static create(params: {
    planId: PlanId;
    name: string;
    description?: string | null;
    assumptions?: Record<string, any> | null;
    createdBy: UserId;
  }): Scenario {
    const scenario = new Scenario(
      ScenarioId.create(),
      params.planId,
      params.name,
      params.description || null,
      params.assumptions || null,
      params.createdBy,
      new Date(),
      new Date(),
    );

    scenario.addDomainEvent(
      new ScenarioCreatedEvent(
        scenario.id.getValue(),
        params.planId.getValue(),
        params.name,
        params.createdBy.getValue(),
      ),
    );

    return scenario;
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
    const changes: Record<string, unknown> = {};
    if (params.name) {
      this.name = params.name;
      changes.name = params.name;
    }
    if (params.description !== undefined) {
      this.description = params.description;
      changes.description = params.description;
    }
    if (params.assumptions !== undefined) {
      this.assumptions = params.assumptions;
      changes.assumptions = params.assumptions;
    }
    this.updatedAt = new Date();

    if (Object.keys(changes).length > 0) {
      this.addDomainEvent(
        new ScenarioUpdatedEvent(this.id.getValue(), changes),
      );
    }
  }
}
