import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChain } from '../../domain/entities/approval-chain.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetApprovalChainInput extends IQuery {
  chainId: string;
  workspaceId: string;
}

export class GetApprovalChainHandler implements IQueryHandler<
  GetApprovalChainInput,
  QueryResult<ApprovalChain>
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
  ): Promise<QueryResult<ApprovalChain>> {
    try {
      const chain = await this.approvalChainService.getChain(
        input.chainId,
        input.workspaceId
      );
      return QueryResult.success(chain);
    } catch (error: unknown) {
      return QueryResult.failure(
        error instanceof Error ? error.message : 'Query failed',
        this.getStatusCode(error)
      );
    }
  }
}
