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
      return QueryResult.fromError(error);
    }
  }
}

export type GetApprovalChainQuery = GetApprovalChainInput;
