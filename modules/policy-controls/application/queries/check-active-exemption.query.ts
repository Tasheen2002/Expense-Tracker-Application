import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface CheckActiveExemptionInput {
  workspaceId: string;
  userId: string;
  policyId: string;
}

export class CheckActiveExemptionHandler {
  constructor(private readonly exemptionService: ExemptionService) {}

  async handle(
    input: CheckActiveExemptionInput
  ): Promise<QueryResult<PolicyExemptionDTO | null>> {
    const dto = await this.exemptionService.checkActiveExemption(
      input.workspaceId,
      input.userId,
      input.policyId
    );
    return QueryResult.success(dto);
  }
}
