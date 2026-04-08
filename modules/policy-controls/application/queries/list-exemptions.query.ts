import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { ExemptionStatus } from '../../domain/enums/exemption-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface ListExemptionsInput {
  workspaceId: string;
  status?: ExemptionStatus;
  userId?: string;
  policyId?: string;
  pagination?: PaginationOptions;
}

export class ListExemptionsHandler {
  constructor(private readonly exemptionService: ExemptionService) {}

  async handle(
    input: ListExemptionsInput
  ): Promise<QueryResult<PaginatedResult<PolicyExemptionDTO>>> {
    let result: PaginatedResult<PolicyExemptionDTO>;

    if (input.userId) {
      result = await this.exemptionService.listExemptionsByUser(
        input.workspaceId,
        input.userId,
        input.pagination
      );
    } else {
      result = await this.exemptionService.listExemptions(
        input.workspaceId,
        {
          status: input.status,
          policyId: input.policyId,
        },
        input.pagination
      );
    }

    return QueryResult.success(result);
  }
}
