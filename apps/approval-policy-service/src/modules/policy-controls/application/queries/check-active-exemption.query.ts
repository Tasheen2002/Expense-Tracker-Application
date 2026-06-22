import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface CheckActiveExemptionInput extends IQuery {
  readonly workspaceId: string;
  readonly userId: string;
  readonly policyId: string;
}

export class CheckActiveExemptionHandler implements IQueryHandler<CheckActiveExemptionInput, PolicyExemptionDTO | null> {
  constructor(private readonly exemptionService: ExemptionService) {}

  async handle(input: CheckActiveExemptionInput): Promise<PolicyExemptionDTO | null> {
    return this.exemptionService.checkActiveExemption(
      input.workspaceId,
      input.userId,
      input.policyId
    );
  }
}
