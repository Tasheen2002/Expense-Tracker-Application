import { ScenarioId } from '../value-objects/scenario-id';
import { PlanId } from '../value-objects/plan-id';
import { WorkspaceId, UserId } from '@core/domain/value-objects';
import { ValidationError } from '../errors/budget-planning.errors';
import { PLANNING_CONSTANTS } from '../constants/planning.constants';

// ============================================================================
// Helpers
// ============================================================================

function deepCloneJson<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const prop = (obj as any)[key];
    if (prop !== null && typeof prop === 'object' && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  }
  return obj;
}

function assertValidJsonValue(value: unknown, path: string = ''): void {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return;
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      throw new ValidationError(
        `Assumptions cannot contain NaN or Infinity${path ? ` at "${path}"` : ''}`
      );
    }
    return;
  }
  if (typeof value === 'undefined') {
    throw new ValidationError(
      `Assumptions cannot contain undefined values${path ? ` at "${path}"` : ''}`
    );
  }
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    throw new ValidationError(
      `Assumptions cannot contain non-serializable type "${typeof value}"${path ? ` at "${path}"` : ''}`
    );
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      assertValidJsonValue(value[i], `${path}[${i}]`);
    }
    return;
  }
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype) {
      throw new ValidationError(
        `Assumptions cannot contain class instances or complex objects${path ? ` at "${path}"` : ''}`
      );
    }
    for (const key of Object.keys(value as Record<string, unknown>)) {
      assertValidJsonValue((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key);
    }
    return;
  }
  throw new ValidationError(`Assumptions contains unsupported value${path ? ` at "${path}"` : ''}`);
}

function validateAndCloneAssumptions(
  assumptions: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (assumptions === null || assumptions === undefined) {
    return null;
  }
  if (typeof assumptions !== 'object' || Array.isArray(assumptions)) {
    throw new ValidationError('Assumptions must be a valid JSON object or null');
  }
  assertValidJsonValue(assumptions);
  return deepCloneJson(assumptions);
}

// ============================================================================
// Entity
// ============================================================================

export interface ScenarioDTO {
  id: string;
  workspaceId: string;
  planId: string;
  name: string;
  description: string | null;
  assumptions: Record<string, unknown> | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ScenarioProps {
  id: ScenarioId;
  workspaceId: WorkspaceId;
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
    workspaceId: WorkspaceId;
    planId: PlanId;
    name: string;
    description?: string | null;
    assumptions?: Record<string, unknown> | null;
    createdBy: UserId;
  }): Scenario {
    const trimmedName = params.name ? params.name.trim() : '';
    if (
      trimmedName.length < PLANNING_CONSTANTS.NAME_MIN_LENGTH ||
      trimmedName.length > PLANNING_CONSTANTS.SCENARIO_NAME_MAX_LENGTH
    ) {
      throw new ValidationError(
        `Scenario name must be between ${PLANNING_CONSTANTS.NAME_MIN_LENGTH} and ${PLANNING_CONSTANTS.SCENARIO_NAME_MAX_LENGTH} characters`
      );
    }
    const trimmedDesc =
      params.description !== undefined && params.description !== null
        ? params.description.trim()
        : null;
    if (trimmedDesc && trimmedDesc.length > PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH) {
      throw new ValidationError(
        `Scenario description cannot exceed ${PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH} characters`
      );
    }

    const validatedAssumptions = validateAndCloneAssumptions(params.assumptions);

    return new Scenario({
      id: ScenarioId.create(),
      workspaceId: params.workspaceId,
      planId: params.planId,
      name: trimmedName,
      description: trimmedDesc || null,
      assumptions: validatedAssumptions,
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(params: {
    id: string;
    workspaceId: string;
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
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      planId: PlanId.fromString(params.planId),
      name: params.name,
      description: params.description,
      assumptions: validateAndCloneAssumptions(params.assumptions),
      createdBy: UserId.fromString(params.createdBy),
      createdAt: new Date(params.createdAt.getTime()),
      updatedAt: new Date(params.updatedAt.getTime()),
    });
  }

  get id(): ScenarioId { return this.props.id; }
  get workspaceId(): WorkspaceId { return this.props.workspaceId; }
  get planId(): PlanId { return this.props.planId; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get assumptions(): Record<string, unknown> | null {
    if (!this.props.assumptions) return null;
    return deepFreeze(deepCloneJson(this.props.assumptions));
  }
  get createdBy(): UserId { return this.props.createdBy; }
  get createdAt(): Date { return new Date(this.props.createdAt.getTime()); }
  get updatedAt(): Date { return new Date(this.props.updatedAt.getTime()); }

  updateDetails(params: {
    name?: string;
    description?: string | null;
    assumptions?: Record<string, unknown> | null;
  }): void {
    let validatedName = this.props.name;
    let validatedDesc = this.props.description;
    let validatedAssumptions = this.props.assumptions;

    if (params.name !== undefined) {
      const trimmedName = params.name ? params.name.trim() : '';
      if (
        trimmedName.length < PLANNING_CONSTANTS.NAME_MIN_LENGTH ||
        trimmedName.length > PLANNING_CONSTANTS.SCENARIO_NAME_MAX_LENGTH
      ) {
        throw new ValidationError(
          `Scenario name must be between ${PLANNING_CONSTANTS.NAME_MIN_LENGTH} and ${PLANNING_CONSTANTS.SCENARIO_NAME_MAX_LENGTH} characters`
        );
      }
      validatedName = trimmedName;
    }

    if (params.description !== undefined) {
      const trimmedDesc = params.description !== null ? params.description.trim() : null;
      if (trimmedDesc !== null && trimmedDesc.length > PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH) {
        throw new ValidationError(
          `Scenario description cannot exceed ${PLANNING_CONSTANTS.DESCRIPTION_MAX_LENGTH} characters`
        );
      }
      validatedDesc = trimmedDesc;
    }

    if (params.assumptions !== undefined) {
      validatedAssumptions = validateAndCloneAssumptions(params.assumptions);
    }

    // Assign together only after all validations pass
    if (params.name !== undefined) this.props.name = validatedName;
    if (params.description !== undefined) this.props.description = validatedDesc;
    if (params.assumptions !== undefined) this.props.assumptions = validatedAssumptions;
    this.props.updatedAt = new Date();
  }

  static toDTO(scenario: Scenario): ScenarioDTO {
    return {
      id: scenario.props.id.getValue(),
      workspaceId: scenario.props.workspaceId.getValue(),
      planId: scenario.props.planId.getValue(),
      name: scenario.props.name,
      description: scenario.props.description,
      assumptions: scenario.props.assumptions ? deepCloneJson(scenario.props.assumptions) : null,
      createdBy: scenario.props.createdBy.getValue(),
      createdAt: scenario.props.createdAt.toISOString(),
      updatedAt: scenario.props.updatedAt.toISOString(),
    };
  }
}
