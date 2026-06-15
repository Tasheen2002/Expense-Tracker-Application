import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { WorkspaceMembershipService } from '../services/workspace-membership.service';
import { WorkspaceMembershipDTO } from '../../domain/entities/workspace-membership.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface ListWorkspaceMembersQuery extends IQuery {
  readonly workspaceId: string;
}

export class ListWorkspaceMembersHandler implements IQueryHandler<
  ListWorkspaceMembersQuery,
  PaginatedResult<WorkspaceMembershipDTO>
> {
  constructor(private readonly membershipService: WorkspaceMembershipService) {}

  async handle(
    query: ListWorkspaceMembersQuery
  ): Promise<PaginatedResult<WorkspaceMembershipDTO>> {
    const members = await this.membershipService.getWorkspaceMembers(
      query.workspaceId
    );
    return members;
  }
}
