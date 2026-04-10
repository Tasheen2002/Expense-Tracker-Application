import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';

export interface CheckActiveExemptionInput {
  workspaceId: string;
  userId: string;
  policyId: string;
}

export class CheckActiveExemptionHandler {
  constructor(private readonly exemptionService: ExemptionService) {}

  async handle(input: CheckActiveExemptionInput): Promise<PolicyExemptionDTO | null> {
    return this.exemptionService.checkActiveExemption(
      input.workspaceId,
      input.userId,
      input.policyId
    );
  }
}
