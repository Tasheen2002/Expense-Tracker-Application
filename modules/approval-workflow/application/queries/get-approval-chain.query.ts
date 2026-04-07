import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
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

  async handle(
    input: GetApprovalChainInput
  ): Promise<QueryResult<ApprovalChainDTO>> {
    const chain = await this.approvalChainService.getChain(
      input.chainId,
      input.workspaceId
    );
    return QueryResult.success(chain);
  }
}
