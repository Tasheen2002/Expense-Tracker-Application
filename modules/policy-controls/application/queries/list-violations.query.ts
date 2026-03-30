import {
  ViolationRepository,
  ViolationFilters,
} from '../../domain/repositories/violation.repository';
import { PolicyViolation } from '../../domain/entities/policy-violation.entity';
import { ViolationStatus } from '../../domain/enums/violation-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { QueryResult } from '../../../../apps/api/src/shared/application/query-result';

export interface ListViolationsInput {
  workspaceId: string;
  status?: ViolationStatus;
  userId?: string;
  expenseId?: string;
  policyId?: string;
  pagination?: PaginationOptions;
}

export class ListViolationsHandler {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async handle(
    input: ListViolationsInput
  ): Promise<QueryResult<PaginatedResult<PolicyViolation>>> {
    let result: PaginatedResult<PolicyViolation>;

    if (input.expenseId) {
      const items = await this.violationRepository.findByExpense(
        input.expenseId
      );
      result = {
        items,
        total: items.length,
        limit: items.length,
        offset: 0,
        hasMore: false,
      };
    } else if (input.userId) {
      result = await this.violationRepository.findByUser(
        input.workspaceId,
        input.userId,
        input.pagination
      );
    } else {
      const filters: ViolationFilters = {
        status: input.status,
        policyId: input.policyId,
      };
      result = await this.violationRepository.findByWorkspace(
        input.workspaceId,
        filters,
        input.pagination
      );
    }

    return QueryResult.success(result);
  }
}
