import { ScenarioId } from '../value-objects/scenario-id';
import { PlanId } from '../value-objects/plan-id';
import { UserId } from '../../../identity-workspace';

// ============================================================================
// Entity
// ============================================================================

interface ScenarioProps {
  id: ScenarioId;
  planId: PlanId;
  name: string;
  description: string | null;
  assumptions: Record<string, unknown> | null;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export class Scenario {
  private constructor(private props: ScenarioProps) {}

  static create(params: {
    planId: PlanId;
    name: string;
    description?: string | null;
    assumptions?: Record<string, unknown> | null;
    createdBy: UserId;
  }): Scenario {
    return new Scenario({
      id: ScenarioId.create(),
      planId: params.planId,
      name: params.name,
      description: params.description || null,
      assumptions: params.assumptions || null,
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
    return new Scenario({
      id: ScenarioId.fromString(params.id),
      planId: PlanId.fromString(params.planId),
      name: params.name,
      description: params.description,
      assumptions: params.assumptions,
      createdBy: UserId.fromString(params.createdBy),
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
  }

  get id(): ScenarioId { return this.props.id; }
  get planId(): PlanId { return this.props.planId; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get assumptions(): Record<string, unknown> | null { return this.props.assumptions; }
  get createdBy(): UserId { return this.props.createdBy; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateDetails(params: {
    name?: string;
    description?: string | null;
    assumptions?: Record<string, unknown> | null;
  }): void {
    if (params.name) this.props.name = params.name;
    if (params.description !== undefined) this.props.description = params.description;
    if (params.assumptions !== undefined) this.props.assumptions = params.assumptions;
    this.props.updatedAt = new Date();
  }

  static toDTO(scenario: Scenario): ScenarioDTO {
    return {
      id: scenario.props.id.getValue(),
      planId: scenario.props.planId.getValue(),
      name: scenario.props.name,
      description: scenario.props.description,
      assumptions: scenario.props.assumptions,
      createdBy: scenario.props.createdBy.getValue(),
      createdAt: scenario.props.createdAt.toISOString(),
      updatedAt: scenario.props.updatedAt.toISOString(),
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
