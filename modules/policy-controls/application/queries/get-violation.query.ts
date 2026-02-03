import { ViolationRepository } from "../../domain/repositories/violation.repository";
import { PolicyViolation } from "../../domain/entities/policy-violation.entity";
import { ViolationId } from "../../domain/value-objects/violation-id";

export interface GetViolationInput {
  violationId: string;
}

export class GetViolationHandler {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async handle(input: GetViolationInput): Promise<PolicyViolation | null> {
    return this.violationRepository.findById(
      ViolationId.fromString(input.violationId),
    );
  }
}
