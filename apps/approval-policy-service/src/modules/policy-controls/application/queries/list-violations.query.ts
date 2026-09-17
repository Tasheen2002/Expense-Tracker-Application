import { ViolationService } from '../services/violation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ViolationStatus } from '../../domain/enums/violation-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { OperationService } from '../../../../shared/services/operation.service';
import { UnauthorizedViolationActionError } from '../../domain/errors/policy-controls.errors';
import { UnauthorizedWorkspaceAccessError } from '../../../../shared/errors/workspace-authorization.error';

export interface ListViolationsInput extends IQuery {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly status?: ViolationStatus;
  readonly userId?: string;
  readonly expenseId?: string;
  readonly policyId?: string;
  readonly pagination?: PaginationOptions;
  readonly authToken?: string;
}

export class ListViolationsHandler implements IQueryHandler<ListViolationsInput, PaginatedResult<PolicyViolationDTO>> {
  constructor(
    private readonly violationService: ViolationService,
    private readonly operations: OperationService
  ) {}

  async handle(input: ListViolationsInput): Promise<PaginatedResult<PolicyViolationDTO>> {
    if (!input.actorId) {
      throw new UnauthorizedWorkspaceAccessError('Actor ID is required for query authorization');
    }

    let targetUserId = input.userId;

    const membership = await this.operations.authorize({
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      authToken: input.authToken,
    });

    const role = membership.role.toUpperCase();
    const isElevated = ['ADMIN', 'OWNER', 'FINANCE_APPROVER', 'AUDITOR', 'SYSTEM'].includes(role);

    if (!isElevated) {
      if (input.userId && input.userId.toLowerCase() !== input.actorId.toLowerCase()) {
        throw new UnauthorizedViolationActionError(input.actorId, 'view violations of other users');
      }
      targetUserId = input.actorId;
    }

    return this.violationService.listViolations(
      input.workspaceId,
      {
        status: input.status,
        userId: targetUserId,
        expenseId: input.expenseId,
        policyId: input.policyId,
      },
      input.pagination
    );
  }
}
