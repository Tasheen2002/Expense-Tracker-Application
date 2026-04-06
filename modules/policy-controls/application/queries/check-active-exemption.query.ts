import { ExemptionRepository } from '../../domain/repositories/exemption.repository';
import { PolicyExemption } from '../../domain/entities/policy-exemption.entity';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface CheckActiveExemptionInput {
  workspaceId: string;
  userId: string;
  policyId: string;
}

export class CheckActiveExemptionHandler {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async handle(
    input: CheckActiveExemptionInput
  ): Promise<QueryResult<PolicyExemption | null>> {
    const exemption = await this.exemptionRepository.findActiveForUser(
      input.workspaceId,
      input.userId,
      input.policyId
    );
    return QueryResult.success(exemption);
  }
}
