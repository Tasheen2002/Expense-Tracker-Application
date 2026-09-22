import { OperationService } from '../services/operation.service';
import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { WorkspaceMembershipService } from '../services/workspace-membership.service';
import { WorkspaceMembershipDTO } from '../../domain/entities/workspace-membership.entity';
import { PaginatedResult, PaginationOptions } from '@core/domain/interfaces/paginated-result.interface';

export interface ListWorkspaceMembersQuery extends IQuery {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly options?: PaginationOptions;
}

export class ListWorkspaceMembersHandler implements IQueryHandler<
  ListWorkspaceMembersQuery,
  PaginatedResult<WorkspaceMembershipDTO>
> {
  constructor(
    private readonly membershipService: WorkspaceMembershipService,
    private readonly operations: OperationService
  ) {}

  async handle(
    query: ListWorkspaceMembersQuery
  ): Promise<PaginatedResult<WorkspaceMembershipDTO>> {
    await this.operations.authorize({ actorId: query.actorId, workspaceId: query.workspaceId });
    const members = await this.membershipService.getWorkspaceMembers(
      query.workspaceId,
      query.options
    );
    return members;
  }
}
