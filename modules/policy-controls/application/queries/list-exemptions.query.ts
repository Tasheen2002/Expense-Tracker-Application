import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { ExemptionStatus } from '../../domain/enums/exemption-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';

export interface ListExemptionsInput extends IQuery {
  workspaceId: string;
  status?: ExemptionStatus;
  userId?: string;
  policyId?: string;
  pagination?: PaginationOptions;
}

export class ListExemptionsHandler implements IQueryHandler<ListExemptionsInput, PaginatedResult<PolicyExemptionDTO>> {
  constructor(private readonly exemptionService: ExemptionService) {}

  async handle(input: ListExemptionsInput): Promise<PaginatedResult<PolicyExemptionDTO>> {
    if (input.userId) {
      return this.exemptionService.listExemptionsByUser(
        input.workspaceId,
        input.userId,
        input.pagination
      );
    }
    return this.exemptionService.listExemptions(
      input.workspaceId,
      { status: input.status, policyId: input.policyId },
      input.pagination
    );
  }
}
