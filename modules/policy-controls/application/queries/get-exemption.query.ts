import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
export interface GetExemptionInput extends IQuery {
  exemptionId: string;
  workspaceId: string;
}

export class GetExemptionHandler implements IQueryHandler<
  GetExemptionInput,
  QueryResult<PolicyExemptionDTO>
> {
  constructor(private readonly exemptionService: ExemptionService) {}

  async handle(
    input: GetExemptionInput
  ): Promise<QueryResult<PolicyExemptionDTO>> {
    const dto = await this.exemptionService.getExemption(input.exemptionId, input.workspaceId);
    return QueryResult.success(dto);
  }
}
