import {
  ExemptionRepository,
  ExemptionFilters,
} from '../../domain/repositories/exemption.repository';
import { PolicyExemption } from '../../domain/entities/policy-exemption.entity';
import { ExemptionStatus } from '../../domain/enums/exemption-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface ListExemptionsInput {
  workspaceId: string;
  status?: ExemptionStatus;
  userId?: string;
  policyId?: string;
  pagination?: PaginationOptions;
}

export class ListExemptionsHandler {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async handle(
    input: ListExemptionsInput
  ): Promise<QueryResult<PaginatedResult<PolicyExemption>>> {
    let result: PaginatedResult<PolicyExemption>;

    if (input.userId) {
      result = await this.exemptionRepository.findByUser(
        input.workspaceId,
        input.userId,
        input.pagination
      );
    } else {
      const filters: ExemptionFilters = {
        status: input.status,
        policyId: input.policyId,
      };
      result = await this.exemptionRepository.findByWorkspace(
        input.workspaceId,
        filters,
        input.pagination
      );
    }

    return QueryResult.success(result);
  }
}
