import { ViolationRepository } from "../../domain/repositories/violation.repository";
import { PolicyViolation } from "../../domain/entities/policy-violation.entity";
import { ViolationId } from "../../domain/value-objects/violation-id";
import { ViolationNotFoundError } from "../../domain/errors/policy-controls.errors";

export interface AcknowledgeViolationInput {
  violationId: string;
  acknowledgedBy: string;
}

export class AcknowledgeViolationHandler {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async handle(input: AcknowledgeViolationInput): Promise<PolicyViolation> {
    const violation = await this.violationRepository.findById(
      ViolationId.fromString(input.violationId),
    );
    if (!violation) {
      throw new ViolationNotFoundError(input.violationId);
    }

    violation.acknowledge(input.acknowledgedBy);
    await this.violationRepository.save(violation);

    return violation;
  }
}
