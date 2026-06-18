import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface GetUserInvitationsQuery extends IQuery {
  readonly email: string;
}

export class GetUserInvitationsHandler implements IQueryHandler<
  GetUserInvitationsQuery,
  WorkspaceInvitationDTO[]
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetUserInvitationsQuery
  ): Promise<WorkspaceInvitationDTO[]> {
    const dtos = await this.invitationService.getUserInvitationDTOs(query.email);
    return dtos;
  }
}
