import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity';
import { OperationService } from '../services/operation.service';
import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface GetPendingInvitationsQuery extends IQuery {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly options?: PaginationOptions;
}

export class GetPendingInvitationsHandler implements IQueryHandler<
  GetPendingInvitationsQuery,
  PaginatedResult<WorkspaceInvitationDTO>
> {
  constructor(
    private readonly invitationService: WorkspaceInvitationService,
    private readonly operations: OperationService
  ) {}

  async handle(
    query: GetPendingInvitationsQuery
  ): Promise<PaginatedResult<WorkspaceInvitationDTO>> {
    await this.operations.authorize({ actorId: query.actorId, workspaceId: query.workspaceId, role: WorkspaceRole.ADMIN });
    const result = await this.invitationService.getPendingInvitationDTOs(
      query.workspaceId,
      query.options
    );
    return result;
  }
}
