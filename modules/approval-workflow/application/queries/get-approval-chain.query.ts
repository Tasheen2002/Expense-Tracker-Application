import { ApprovalChainService } from '../services/approval-chain.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetApprovalChainInput extends IQuery {
  chainId: string;
  workspaceId: string;
}

export class GetApprovalChainHandler implements IQueryHandler<
  GetApprovalChainInput,
  ApprovalChainDTO
> {
  constructor(private readonly approvalChainService: ApprovalChainService) {}

  async handle(input: GetApprovalChainInput): Promise<ApprovalChainDTO> {
    return this.approvalChainService.getChain(input.chainId, input.workspaceId);
  }
}
