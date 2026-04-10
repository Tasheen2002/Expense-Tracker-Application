import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ViolationStatus } from '../../domain/enums/violation-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListViolationsInput {
  workspaceId: string;
  status?: ViolationStatus;
  userId?: string;
  expenseId?: string;
  policyId?: string;
  pagination?: PaginationOptions;
}

export class ListViolationsHandler {
  constructor(private readonly violationService: ViolationService) {}

  async handle(input: ListViolationsInput): Promise<PaginatedResult<PolicyViolationDTO>> {
    if (input.expenseId) {
      const items = await this.violationService.listViolationsByExpense(input.expenseId);
      return { items, total: items.length, limit: items.length, offset: 0, hasMore: false };
    }
    if (input.userId) {
      return this.violationService.listViolationsByUser(
        input.workspaceId,
        input.userId,
        input.pagination
      );
    }
    return this.violationService.listViolations(
      input.workspaceId,
      { status: input.status, policyId: input.policyId },
      input.pagination
    );
  }
}
