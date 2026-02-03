import { ViolationRepository } from "../../domain/repositories/violation.repository";
import { PolicyViolation } from "../../domain/entities/policy-violation.entity";
import { ViolationId } from "../../domain/value-objects/violation-id";
import { ViolationNotFoundError } from "../../domain/errors/policy-controls.errors";

export interface OverrideViolationInput {
  violationId: string;
  overriddenBy: string;
  overrideReason: string;
}

export class OverrideViolationHandler {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async handle(input: OverrideViolationInput): Promise<PolicyViolation> {
    const violation = await this.violationRepository.findById(
      ViolationId.fromString(input.violationId),
    );
    if (!violation) {
      throw new ViolationNotFoundError(input.violationId);
    }

    violation.override(input.overriddenBy, input.overrideReason);
    await this.violationRepository.save(violation);

    return violation;
  }
}
