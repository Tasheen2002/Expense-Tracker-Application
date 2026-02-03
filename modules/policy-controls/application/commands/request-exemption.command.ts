import { ExemptionRepository } from "../../domain/repositories/exemption.repository";
import { PolicyRepository } from "../../domain/repositories/policy.repository";
import { PolicyExemption } from "../../domain/entities/policy-exemption.entity";
import { PolicyId } from "../../domain/value-objects/policy-id";
import { PolicyNotFoundError } from "../../domain/errors/policy-controls.errors";

export interface RequestExemptionInput {
  workspaceId: string;
  policyId: string;
  userId: string;
  requestedBy: string;
  reason: string;
  startDate: Date;
  endDate: Date;
}

export class RequestExemptionHandler {
  constructor(
    private readonly exemptionRepository: ExemptionRepository,
    private readonly policyRepository: PolicyRepository,
  ) {}

  async handle(input: RequestExemptionInput): Promise<PolicyExemption> {
    // Verify policy exists
    const policy = await this.policyRepository.findById(
      PolicyId.fromString(input.policyId),
    );
    if (!policy) {
      throw new PolicyNotFoundError(input.policyId);
    }

    const exemption = PolicyExemption.create({
      workspaceId: input.workspaceId,
      policyId: input.policyId,
      userId: input.userId,
      requestedBy: input.requestedBy,
      reason: input.reason,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    await this.exemptionRepository.save(exemption);

    return exemption;
  }
}
