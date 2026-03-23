import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChain } from '../../domain/entities/approval-chain.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface ListApprovalChainsInput extends IQuery {
  workspaceId: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export class ListApprovalChainsHandler implements IQueryHandler<
  ListApprovalChainsInput,
  QueryResult<PaginatedResult<ApprovalChain>>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(
    input: ListApprovalChainsInput
  ): Promise<QueryResult<PaginatedResult<ApprovalChain>>> {
    try {
      const result = await this.approvalChainService.listChains(
        input.workspaceId,
        input.activeOnly,
        { limit: input.limit, offset: input.offset }
      );
      return QueryResult.success(result);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}

export type ListApprovalChainsQuery = ListApprovalChainsInput;
