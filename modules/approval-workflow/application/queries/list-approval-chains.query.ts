import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface ListApprovalChainsInput extends IQuery {
  workspaceId: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export class ListApprovalChainsHandler implements IQueryHandler<
  ListApprovalChainsInput,
  PaginatedResult<ApprovalChainDTO>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(input: ListApprovalChainsInput): Promise<PaginatedResult<ApprovalChainDTO>> {
    return this.approvalChainService.listChains(
      input.workspaceId,
      input.activeOnly,
      { limit: input.limit, offset: input.offset }
    );
  }
}
