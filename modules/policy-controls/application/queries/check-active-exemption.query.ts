import { ExemptionRepository } from "../../domain/repositories/exemption.repository";
import { PolicyExemption } from "../../domain/entities/policy-exemption.entity";

export interface CheckActiveExemptionInput {
  workspaceId: string;
  userId: string;
  policyId: string;
}

export class CheckActiveExemptionHandler {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async handle(
    input: CheckActiveExemptionInput,
  ): Promise<PolicyExemption | null> {
    return this.exemptionRepository.findActiveForUser(
      input.workspaceId,
      input.userId,
      input.policyId,
    );
  }
}
