import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';

export interface GetInvitationByTokenQuery extends IQuery {
  token: string;
}

export class GetInvitationByTokenHandler implements IQueryHandler<
  GetInvitationByTokenQuery,
  WorkspaceInvitationDTO | null
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    query: GetInvitationByTokenQuery
  ): Promise<WorkspaceInvitationDTO | null> {
    const invitationDTO = await this.invitationService.getInvitationDTOByToken(
      query.token
    );
    return invitationDTO;
  }
}
