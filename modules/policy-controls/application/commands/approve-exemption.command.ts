import { ExemptionRepository } from "../../domain/repositories/exemption.repository";
import { PolicyExemption } from "../../domain/entities/policy-exemption.entity";
import { ExemptionId } from "../../domain/value-objects/exemption-id";
import { ExemptionNotFoundError } from "../../domain/errors/policy-controls.errors";

export interface ApproveExemptionInput {
  exemptionId: string;
  approvedBy: string;
}

export class ApproveExemptionHandler {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async handle(input: ApproveExemptionInput): Promise<PolicyExemption> {
    const exemption = await this.exemptionRepository.findById(
      ExemptionId.fromString(input.exemptionId),
    );
    if (!exemption) {
      throw new ExemptionNotFoundError(input.exemptionId);
    }

    exemption.approve(input.approvedBy);
    await this.exemptionRepository.save(exemption);

    return exemption;
  }
}
