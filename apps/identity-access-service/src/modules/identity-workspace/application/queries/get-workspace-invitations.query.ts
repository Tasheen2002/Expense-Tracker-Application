import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity';
import { OperationService } from '../services/operation.service';
import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface GetWorkspaceInvitationsQuery extends IQuery {
  readonly actorId: string;
  readonly workspaceId: string;
}

export class GetWorkspaceInvitationsHandler implements IQueryHandler<
  GetWorkspaceInvitationsQuery,
  WorkspaceInvitationDTO[]
> {
  constructor(
    private readonly invitationService: WorkspaceInvitationService,
    private readonly operations: OperationService
  ) {}

  async handle(
    query: GetWorkspaceInvitationsQuery
  ): Promise<WorkspaceInvitationDTO[]> {
    await this.operations.authorize({ actorId: query.actorId, workspaceId: query.workspaceId, role: WorkspaceRole.ADMIN });
    const dtos = await this.invitationService.getWorkspaceInvitationDTOs(query.workspaceId);
    return dtos;
  }
}
