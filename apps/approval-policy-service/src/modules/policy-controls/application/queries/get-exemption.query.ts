import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface GetExemptionInput extends IQuery {
  readonly exemptionId: string;
  readonly workspaceId: string;
}

export class GetExemptionHandler implements IQueryHandler<GetExemptionInput, PolicyExemptionDTO> {
  constructor(private readonly exemptionService: ExemptionService) {}

  async handle(input: GetExemptionInput): Promise<PolicyExemptionDTO> {
    return this.exemptionService.getExemption(input.exemptionId, input.workspaceId);
  }
}
