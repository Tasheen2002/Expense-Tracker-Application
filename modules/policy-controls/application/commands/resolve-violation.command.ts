import { ViolationRepository } from "../../domain/repositories/violation.repository";
import { PolicyViolation } from "../../domain/entities/policy-violation.entity";
import { ViolationId } from "../../domain/value-objects/violation-id";
import { ViolationNotFoundError } from "../../domain/errors/policy-controls.errors";

export interface ResolveViolationInput {
  violationId: string;
  resolvedBy: string;
  resolutionNote?: string;
}

export class ResolveViolationHandler {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async handle(input: ResolveViolationInput): Promise<PolicyViolation> {
    const violation = await this.violationRepository.findById(
      ViolationId.fromString(input.violationId),
    );
    if (!violation) {
      throw new ViolationNotFoundError(input.violationId);
    }

    violation.resolve(input.resolvedBy, input.resolutionNote);
    await this.violationRepository.save(violation);

    return violation;
  }
}
