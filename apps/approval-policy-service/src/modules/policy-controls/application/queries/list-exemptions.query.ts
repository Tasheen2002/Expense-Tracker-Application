import { ExemptionService } from '../services/exemption.service';
import { PolicyExemptionDTO } from '../../domain/entities/policy-exemption.entity';
import { ExemptionStatus } from '../../domain/enums/exemption-status.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { OperationService } from '../../../../shared/services/operation.service';
import { UnauthorizedWorkspaceAccessError } from '../../../../shared/errors/workspace-authorization.error';

export interface ListExemptionsInput extends IQuery {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly status?: ExemptionStatus;
  readonly userId?: string;
  readonly policyId?: string;
  readonly pagination?: PaginationOptions;
  readonly authToken?: string;
}

export class ListExemptionsHandler implements IQueryHandler<ListExemptionsInput, PaginatedResult<PolicyExemptionDTO>> {
  constructor(
    private readonly exemptionService: ExemptionService,
    private readonly operations: OperationService
  ) {}

  async handle(input: ListExemptionsInput): Promise<PaginatedResult<PolicyExemptionDTO>> {
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
        throw new UnauthorizedWorkspaceAccessError('You are not authorized to view exemptions of other users');
      }
      targetUserId = input.actorId;
    }

    return this.exemptionService.listExemptions(
      input.workspaceId,
      {
        status: input.status,
        userId: targetUserId,
        policyId: input.policyId,
      },
      input.pagination
    );
  }
}
