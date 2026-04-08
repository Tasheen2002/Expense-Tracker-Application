import { IApprovalChainRepository } from '../../domain/repositories/approval-chain.repository';
import { ApprovalChain, ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import { ApprovalChainId } from '../../domain/value-objects/approval-chain-id';
import { ApprovalChainNotFoundError } from '../../domain/errors/approval-workflow.errors';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export class ApprovalChainService {
  constructor(private readonly chainRepository: IApprovalChainRepository) {}

  async createChain(params: {
    workspaceId: string;
    name: string;
    description?: string;
    minAmount?: number;
    maxAmount?: number;
    categoryIds?: string[];
    requiresReceipt: boolean;
    approverSequence: string[];
  }): Promise<ApprovalChainDTO> {
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

    return ApprovalChain.toDTO(chain);
  }

  async updateChain(params: {
    chainId: string;
    workspaceId: string;
    name?: string;
    description?: string;
    minAmount?: number;
    maxAmount?: number;
    categoryIds?: string[];
    requiresReceipt?: boolean;
    approverSequence?: string[];
  }): Promise<ApprovalChainDTO> {
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

    if (params.categoryIds !== undefined) {
      chain.updateCategoryIds(params.categoryIds);
    }

    if (params.requiresReceipt !== undefined) {
      chain.updateRequiresReceipt(params.requiresReceipt);
    }

    if (params.approverSequence) {
      chain.updateApproverSequence(params.approverSequence);
    }

    await this.chainRepository.save(chain);

    return ApprovalChain.toDTO(chain);
  }

  async getChain(chainId: string, workspaceId: string): Promise<ApprovalChainDTO> {
    const chain = await this.chainRepository.findById(
      ApprovalChainId.fromString(chainId)
    );

    if (!chain || chain.getWorkspaceId().getValue() !== workspaceId) {
      throw new ApprovalChainNotFoundError(chainId);
    }

    return ApprovalChain.toDTO(chain);
  }

  async listChains(
    workspaceId: string,
    activeOnly = false,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ApprovalChainDTO>> {
    let result: PaginatedResult<ApprovalChain>;

    if (activeOnly) {
      result = await this.chainRepository.findActiveByWorkspace(
        workspaceId,
        options
      );
    } else {
      result = await this.chainRepository.findByWorkspace(workspaceId, options);
    }

    return { ...result, items: result.items.map((chain) => ApprovalChain.toDTO(chain)) };
  }

  async activateChain(
    chainId: string,
    workspaceId: string
  ): Promise<ApprovalChainDTO> {
    const chainIdObj = ApprovalChainId.fromString(chainId);
    const chain = await this.chainRepository.findById(chainIdObj);

    if (!chain || chain.getWorkspaceId().getValue() !== workspaceId) {
      throw new ApprovalChainNotFoundError(chainId);
    }

    chain.activate();
    await this.chainRepository.save(chain);
    return ApprovalChain.toDTO(chain);
  }

  async deactivateChain(
    chainId: string,
    workspaceId: string
  ): Promise<ApprovalChainDTO> {
    const chainIdObj = ApprovalChainId.fromString(chainId);
    const chain = await this.chainRepository.findById(chainIdObj);

    if (!chain || chain.getWorkspaceId().getValue() !== workspaceId) {
      throw new ApprovalChainNotFoundError(chainId);
    }

    chain.deactivate();
    await this.chainRepository.save(chain);
    return ApprovalChain.toDTO(chain);
  }

  async deleteChain(chainId: string, workspaceId: string): Promise<void> {
    const chainIdObj = ApprovalChainId.fromString(chainId);
    const chain = await this.chainRepository.findById(chainIdObj);

    if (!chain || chain.getWorkspaceId().getValue() !== workspaceId) {
      throw new ApprovalChainNotFoundError(chainId);
    }

    chain.markAsDeleted();
    await this.chainRepository.delete(chain.getId());
  }

  async findApplicableChain(params: {
    workspaceId: string;
    amount: number;
    categoryId?: string;
    hasReceipt: boolean;
  }): Promise<ApprovalChainDTO | null> {
    const chain = await this.chainRepository.findApplicableChain(params);
    return chain ? ApprovalChain.toDTO(chain) : null;
  }
}
