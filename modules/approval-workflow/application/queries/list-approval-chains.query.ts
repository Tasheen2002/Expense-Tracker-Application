import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface ListApprovalChainsQuery extends IQuery {
  readonly workspaceId: string;
  readonly activeOnly?: boolean;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListApprovalChainsHandler implements IQueryHandler<
  ListApprovalChainsQuery,
  PaginatedResult<ApprovalChainDTO>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(query: ListApprovalChainsQuery): Promise<PaginatedResult<ApprovalChainDTO>> {
    return this.approvalChainService.listChains(
      query.workspaceId,
      query.activeOnly,
      { limit: query.limit, offset: query.offset }
    );
  }
}
