import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetApprovalChainQuery extends IQuery {
  readonly chainId: string;
  readonly workspaceId: string;
}

export class GetApprovalChainHandler implements IQueryHandler<
  GetApprovalChainQuery,
  ApprovalChainDTO
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(query: GetApprovalChainQuery): Promise<ApprovalChainDTO> {
    return this.approvalChainService.getChain(query.chainId, query.workspaceId);
  }
}
