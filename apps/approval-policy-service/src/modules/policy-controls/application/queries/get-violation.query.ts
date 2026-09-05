import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface GetViolationInput extends IQuery {
  readonly violationId: string;
  readonly workspaceId: string;
}

export class GetViolationHandler implements IQueryHandler<GetViolationInput, PolicyViolationDTO> {
  constructor(private readonly violationService: ViolationService) {}

  async handle(input: GetViolationInput): Promise<PolicyViolationDTO> {
    return this.violationService.getViolation(input.violationId, input.workspaceId);
  }
}
