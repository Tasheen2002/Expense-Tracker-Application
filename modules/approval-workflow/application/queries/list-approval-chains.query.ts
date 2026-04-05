import { ApprovalChainService } from '../services/approval-chain.service';
import {
  ApprovalChain,
  ApprovalChainDTO,
} from '../../domain/entities/approval-chain.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface ListApprovalChainsInput extends IQuery {
  workspaceId: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export class ListApprovalChainsHandler implements IQueryHandler<
  ListApprovalChainsInput,
  QueryResult<PaginatedResult<ApprovalChainDTO>>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  private getStatusCode(error: unknown): number {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return (error as { statusCode: number }).statusCode;
    }
    return 500;
  }

  async handle(
    input: ListApprovalChainsInput
  ): Promise<QueryResult<PaginatedResult<ApprovalChainDTO>>> {
    try {
      const result = await this.approvalChainService.listChains(
        input.workspaceId,
        input.activeOnly,
        { limit: input.limit, offset: input.offset }
      );
      return QueryResult.success({
        ...result,
        items: result.items.map((chain) => ApprovalChain.toDTO(chain)),
      });
    } catch (error: unknown) {
      return QueryResult.failure(
        error instanceof Error ? error.message : 'Query failed',
        this.getStatusCode(error)
      );
    }
  }
}
