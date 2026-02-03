import { ExemptionRepository } from "../../domain/repositories/exemption.repository";
import { PolicyExemption } from "../../domain/entities/policy-exemption.entity";
import { ExemptionId } from "../../domain/value-objects/exemption-id";
import { ExemptionNotFoundError } from "../../domain/errors/policy-controls.errors";

export interface RejectExemptionInput {
  exemptionId: string;
  rejectedBy: string;
  rejectionReason?: string;
}

export class RejectExemptionHandler {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async handle(input: RejectExemptionInput): Promise<PolicyExemption> {
    const exemption = await this.exemptionRepository.findById(
      ExemptionId.fromString(input.exemptionId),
    );
    if (!exemption) {
      throw new ExemptionNotFoundError(input.exemptionId);
    }

    exemption.reject(input.rejectedBy, input.rejectionReason);
    await this.exemptionRepository.save(exemption);

    return exemption;
  }
}
