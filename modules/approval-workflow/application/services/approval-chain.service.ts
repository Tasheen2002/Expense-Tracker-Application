import { ApprovalChainRepository } from "../../domain/repositories/approval-chain.repository";
import { ApprovalChain } from "../../domain/entities/approval-chain.entity";
import { ApprovalChainId } from "../../domain/value-objects/approval-chain-id";
import { ApprovalChainNotFoundError } from "../../domain/errors/approval-workflow.errors";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class ApprovalChainService {
  constructor(private readonly chainRepository: ApprovalChainRepository) {}

  async createChain(params: {
    workspaceId: string;
    name: string;
    description?: string;
    minAmount?: number;
    maxAmount?: number;
    categoryIds?: string[];
    requiresReceipt: boolean;
    approverSequence: string[];
  }): Promise<ApprovalChain> {
    const chain = ApprovalChain.create({
      workspaceId: params.workspaceId,
      name: params.name,
      description: params.description,
      minAmount: params.minAmount,
      maxAmount: params.maxAmount,
      categoryIds: params.categoryIds,
      requiresReceipt: params.requiresReceipt,
      approverSequence: params.approverSequence,
    });

    await this.chainRepository.save(chain);

    return chain;
  }

  async updateChain(params: {
    chainId: string;
    workspaceId: string;
    name?: string;
    description?: string;
    minAmount?: number;
    maxAmount?: number;
    approverSequence?: string[];
  }): Promise<ApprovalChain> {
    const chainId = ApprovalChainId.fromString(params.chainId);
    const chain = await this.chainRepository.findById(chainId);

    if (!chain || chain.getWorkspaceId().getValue() !== params.workspaceId) {
      throw new ApprovalChainNotFoundError(params.chainId);
    }

    if (params.name) {
      chain.updateName(params.name);
    }

    if (params.description !== undefined) {
      chain.updateDescription(params.description);
    }

    if (params.minAmount !== undefined || params.maxAmount !== undefined) {
      chain.updateAmountRange(params.minAmount, params.maxAmount);
    }

    if (params.approverSequence) {
      chain.updateApproverSequence(params.approverSequence);
    }

    await this.chainRepository.save(chain);

    return chain;
  }

  async getChain(chainId: string, workspaceId: string): Promise<ApprovalChain> {
    const chain = await this.chainRepository.findById(
      ApprovalChainId.fromString(chainId),
    );

    if (!chain || chain.getWorkspaceId().getValue() !== workspaceId) {
      throw new ApprovalChainNotFoundError(chainId);
    }

    return chain;
  }

  async listChains(
    workspaceId: string,
    activeOnly = false,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ApprovalChain>> {
    if (activeOnly) {
      return await this.chainRepository.findActiveByWorkspace(
        workspaceId,
        options,
      );
    }

    return await this.chainRepository.findByWorkspace(workspaceId, options);
  }

  async activateChain(
    chainId: string,
    workspaceId: string,
  ): Promise<ApprovalChain> {
    const chain = await this.getChain(chainId, workspaceId);
    chain.activate();
    await this.chainRepository.save(chain);
    return chain;
  }

  async deactivateChain(
    chainId: string,
    workspaceId: string,
  ): Promise<ApprovalChain> {
    const chain = await this.getChain(chainId, workspaceId);
    chain.deactivate();
    await this.chainRepository.save(chain);
    return chain;
  }

  async deleteChain(chainId: string, workspaceId: string): Promise<void> {
    const chain = await this.getChain(chainId, workspaceId);
    await this.chainRepository.delete(chain.getId());
  }

  async findApplicableChain(params: {
    workspaceId: string;
    amount: number;
    categoryId?: string;
    hasReceipt: boolean;
  }): Promise<ApprovalChain | null> {
    return await this.chainRepository.findApplicableChain(params);
  }
}
