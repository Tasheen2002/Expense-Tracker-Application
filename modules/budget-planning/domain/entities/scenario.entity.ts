import { ScenarioId } from '../value-objects/scenario-id';
import { PlanId } from '../value-objects/plan-id';
import { UserId } from '../../../identity-workspace';

// ============================================================================
// Entity
// ============================================================================

export class Scenario {
  private constructor(
    private readonly _id: ScenarioId,
    private readonly _planId: PlanId,
    private _name: string,
    private _description: string | null,
    private _assumptions: Record<string, unknown> | null,
    private readonly _createdBy: UserId,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(params: {
    planId: PlanId;
    name: string;
    description?: string | null;
    assumptions?: Record<string, unknown> | null;
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
      new Date()
    );

    return scenario;
  }

  static fromPersistence(params: {
    id: string;
    planId: string;
    name: string;
    description: string | null;
    assumptions: Record<string, unknown> | null;
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
      params.updatedAt
    );
  }

  get id(): ScenarioId {
    return this._id;
  }

  get planId(): PlanId {
    return this._planId;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | null {
    return this._description;
  }

  get assumptions(): Record<string, unknown> | null {
    return this._assumptions;
  }

  get createdBy(): UserId {
    return this._createdBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateDetails(params: {
    name?: string;
    description?: string | null;
    assumptions?: Record<string, unknown> | null;
  }): void {
    const changes: Record<string, unknown> = {};
    if (params.name) {
      this._name = params.name;
      changes.name = params.name;
    }
    if (params.description !== undefined) {
      this._description = params.description;
      changes.description = params.description;
    }
    if (params.assumptions !== undefined) {
      this._assumptions = params.assumptions;
      changes.assumptions = params.assumptions;
    }
    this._updatedAt = new Date();
  }

  static toDTO(scenario: Scenario): ScenarioDTO {
    return {
      id: scenario.id.getValue(),
      planId: scenario.planId.getValue(),
      name: scenario.name,
      description: scenario.description,
      assumptions: scenario.assumptions,
      createdBy: scenario.createdBy.getValue(),
      createdAt: scenario.createdAt.toISOString(),
      updatedAt: scenario.updatedAt.toISOString(),
    };
  }
}

export interface ScenarioDTO {
  id: string;
  planId: string;
  name: string;
  description: string | null;
  assumptions: Record<string, unknown> | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
