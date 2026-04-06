import { ApprovalChainService } from '../services/approval-chain.service';
import {
  ApprovalChain,
  ApprovalChainDTO,
} from '../../domain/entities/approval-chain.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetApprovalChainInput extends IQuery {
  chainId: string;
  workspaceId: string;
}

export class GetApprovalChainHandler implements IQueryHandler<
  GetApprovalChainInput,
  QueryResult<ApprovalChainDTO>
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  private getStatusCode(error: unknown): number {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return (error as { statusCode: number }).statusCode;
    }
    return 500;
  }

  async handle(
    input: GetApprovalChainInput
  ): Promise<QueryResult<ApprovalChainDTO>> {
    try {
      const chain = await this.approvalChainService.getChain(
        input.chainId,
        input.workspaceId
      );
      return QueryResult.success(ApprovalChain.toDTO(chain));
    } catch (error: unknown) {
      return QueryResult.failure(
        error instanceof Error ? error.message : 'Query failed',
        this.getStatusCode(error)
      );
    }
  }
}
