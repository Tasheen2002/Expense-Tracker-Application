import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface GetWorkspaceInvitationsQuery extends IQuery {
  readonly workspaceId: string;
}

export class GetWorkspaceInvitationsHandler implements IQueryHandler<
  GetWorkspaceInvitationsQuery,
  WorkspaceInvitationDTO[]
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetWorkspaceInvitationsQuery
  ): Promise<WorkspaceInvitationDTO[]> {
    const dtos = await this.invitationService.getWorkspaceInvitationDTOs(query.workspaceId);
    return dtos;
  }
}
