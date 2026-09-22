import { ApprovalChainService } from '../services/approval-chain.service';
import { OperationService } from '../services/operation.service';
import { ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetApprovalChainQuery extends IQuery {
  readonly actorId: string;
  readonly chainId: string;
  readonly workspaceId: string;
  readonly authToken?: string;
}

export class GetApprovalChainHandler implements IQueryHandler<
  GetApprovalChainQuery,
  ApprovalChainDTO
> {
  constructor(
    private readonly approvalChainService: ApprovalChainService,
    private readonly operations: OperationService
  ) {}

  async handle(query: GetApprovalChainQuery): Promise<ApprovalChainDTO> {
    await this.operations.authorize({
      actorId: query.actorId,
      workspaceId: query.workspaceId,
      authToken: query.authToken,
    });
    return this.approvalChainService.getChain(query.chainId, query.workspaceId);
  }
}
