import { ApprovalChainService } from '../services/approval-chain.service';
import { OperationService } from '../services/operation.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface ListApprovalChainsQuery extends IQuery {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly activeOnly?: boolean;
  readonly limit?: number;
  readonly offset?: number;
  readonly authToken?: string;
}

export class ListApprovalChainsHandler implements IQueryHandler<
  ListApprovalChainsQuery,
  PaginatedResult<ApprovalChainDTO>
> {
  constructor(
    private readonly approvalChainService: ApprovalChainService,
    private readonly operations: OperationService
  ) {}

  async handle(query: ListApprovalChainsQuery): Promise<PaginatedResult<ApprovalChainDTO>> {
    await this.operations.authorize({
      actorId: query.actorId,
      workspaceId: query.workspaceId,
      authToken: query.authToken,
    });
    return this.approvalChainService.listChains(
      query.workspaceId,
      query.activeOnly,
      { limit: query.limit, offset: query.offset }
    );
  }
}
