import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
export interface GetViolationInput extends IQuery {
  violationId: string;
  workspaceId: string;
}

export class GetViolationHandler implements IQueryHandler<
  GetViolationInput,
  QueryResult<PolicyViolationDTO>
> {
  constructor(private readonly violationService: ViolationService) {}

  async handle(
    input: GetViolationInput
  ): Promise<QueryResult<PolicyViolationDTO>> {
    const dto = await this.violationService.getViolation(input.violationId, input.workspaceId);
    return QueryResult.success(dto);
  }
}
