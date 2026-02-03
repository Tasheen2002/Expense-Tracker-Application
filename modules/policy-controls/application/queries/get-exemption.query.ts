import { ExemptionRepository } from "../../domain/repositories/exemption.repository";
import { PolicyExemption } from "../../domain/entities/policy-exemption.entity";
import { ExemptionId } from "../../domain/value-objects/exemption-id";

export interface GetExemptionInput {
  exemptionId: string;
}

export class GetExemptionHandler {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async handle(input: GetExemptionInput): Promise<PolicyExemption | null> {
    return this.exemptionRepository.findById(
      ExemptionId.fromString(input.exemptionId),
    );
  }
}
