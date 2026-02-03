import { ViolationRepository } from "../../domain/repositories/violation.repository";
import { ExemptionRepository } from "../../domain/repositories/exemption.repository";
import { PolicyViolation } from "../../domain/entities/policy-violation.entity";
import { ViolationId } from "../../domain/value-objects/violation-id";
import { ExemptionId } from "../../domain/value-objects/exemption-id";
import {
  ViolationNotFoundError,
  ExemptionNotFoundError,
} from "../../domain/errors/policy-controls.errors";

export interface ExemptViolationInput {
  violationId: string;
  exemptedBy: string;
}

export class ExemptViolationHandler {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async handle(input: ExemptViolationInput): Promise<PolicyViolation> {
    const violation = await this.violationRepository.findById(
      ViolationId.fromString(input.violationId),
    );
    if (!violation) {
      throw new ViolationNotFoundError(input.violationId);
    }

    violation.exempt(input.exemptedBy);
    await this.violationRepository.save(violation);

    return violation;
  }
}
