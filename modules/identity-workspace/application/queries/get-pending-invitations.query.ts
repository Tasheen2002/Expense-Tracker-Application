import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface GetPendingInvitationsQuery extends IQuery {
  workspaceId: string;
  options?: PaginationOptions;
}

export class GetPendingInvitationsHandler implements IQueryHandler<
  GetPendingInvitationsQuery,
  PaginatedResult<WorkspaceInvitationDTO>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetPendingInvitationsQuery
  ): Promise<PaginatedResult<WorkspaceInvitationDTO>> {
    const result = await this.invitationService.getPendingInvitationDTOs(
      query.workspaceId,
      query.options
    );
    return result;
  }
}
