import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { OperationService } from '../services/operation.service';
import { WorkspaceMembershipService } from '../services/workspace-membership.service';
import { WorkspaceMembership, WorkspaceMembershipDTO } from '../../domain/entities/workspace-membership.entity';
import { MembershipNotFoundError } from '../../domain/errors/identity.errors';

export interface GetMemberQuery extends IQuery {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class GetMemberHandler implements IQueryHandler<GetMemberQuery, WorkspaceMembershipDTO> {
  constructor(
    private readonly service: WorkspaceMembershipService,
    private readonly operations: OperationService
  ) {}

  async handle(query: GetMemberQuery): Promise<WorkspaceMembershipDTO> {
    await this.operations.authorize({ actorId: query.actorId, workspaceId: query.workspaceId });
    const member = await this.service.getUserMembership(query.userId, query.workspaceId);
    if (!member) {
      throw new MembershipNotFoundError(query.userId, query.workspaceId);
    }
    return WorkspaceMembership.toDTO(member);
  }
}
