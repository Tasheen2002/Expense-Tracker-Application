import { OperationService } from '../services/operation.service';
import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface GetUserInvitationsQuery extends IQuery {
  readonly actorId: string;
  readonly email: string;
}

export class GetUserInvitationsHandler implements IQueryHandler<
  GetUserInvitationsQuery,
  WorkspaceInvitationDTO[]
> {
  constructor(
    private readonly invitationService: WorkspaceInvitationService,
    private readonly operations: OperationService
  ) {}

  async handle(
    query: GetUserInvitationsQuery
  ): Promise<WorkspaceInvitationDTO[]> {
    await this.operations.authorizeEmailLookup(query.actorId, query.email);
    const dtos = await this.invitationService.getUserInvitationDTOs(query.email);
    return dtos;
  }
}
