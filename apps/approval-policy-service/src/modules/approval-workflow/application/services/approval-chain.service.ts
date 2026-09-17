import { IApprovalChainRepository } from '../../domain/repositories/approval-chain.repository';
import { ApprovalChain, ApprovalChainDTO } from '../../domain/entities/approval-chain.entity';
import { ApprovalChainId } from '../../domain/value-objects';
import { WorkspaceId, CategoryId } from '@core/domain/value-objects';
import {
  ApprovalChainNotFoundError,
  ApprovalChainInUseError,
} from '../../domain/errors/approval-workflow.errors';
import { IWorkspaceAuthorizationService } from '../../../../shared/ports/workspace-authorization.port';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface CreateApprovalChainParams {
  workspaceId: string;
  name: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  categoryIds?: string[];
  requiresReceipt: boolean;
  approverSequence: string[];
  authToken?: string;
}

export interface UpdateApprovalChainParams {
  chainId: string;
  workspaceId: string;
  name?: string;
  description?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  categoryIds?: string[];
  requiresReceipt?: boolean;
  approverSequence?: string[];
  authToken?: string;
}

export interface ChainWorkspaceParams {
  chainId: string;
  workspaceId: string;
}

export interface ListApprovalChainsParams {
  workspaceId: string;
  activeOnly?: boolean;
  options?: PaginationOptions;
}

export interface FindApplicableChainParams {
  workspaceId: string;
  amount: number;
  categoryId?: string;
  hasReceipt: boolean;
}

export class ApprovalChainService {
  constructor(
    private readonly chainRepository: IApprovalChainRepository,
    private readonly workspaceAuthService: IWorkspaceAuthorizationService
  ) {}

  async createChain(params: CreateApprovalChainParams): Promise<ApprovalChainDTO> {
    await Promise.all(
      params.approverSequence.map((userId) =>
        this.workspaceAuthService.authorize({
          userId,
          workspaceId: params.workspaceId,
          authToken: params.authToken,
        })
      )
    );

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

  async updateChain(params: UpdateApprovalChainParams): Promise<ApprovalChainDTO> {
    const chainId = ApprovalChainId.fromString(params.chainId);
    const wsId = WorkspaceId.fromString(params.workspaceId);
    const chain = await this.chainRepository.findById(chainId);

    if (!chain || !chain.workspaceId.equals(wsId)) {
      throw new ApprovalChainNotFoundError(params.chainId);
    }

    if (params.name) {
      chain.updateName(params.name);
    }

    if (params.description !== undefined) {
      chain.updateDescription(params.description ?? undefined);
    }

    if (params.minAmount !== undefined || params.maxAmount !== undefined) {
      const effectiveMin =
        params.minAmount === undefined
          ? chain.minApprovalAmount
          : params.minAmount === null
            ? undefined
            : params.minAmount;

      const effectiveMax =
        params.maxAmount === undefined
          ? chain.maxApprovalAmount
          : params.maxAmount === null
            ? undefined
            : params.maxAmount;

      chain.updateAmountRange(effectiveMin, effectiveMax);
    }

    if (params.categoryIds !== undefined) {
      chain.updateCategoryIds(params.categoryIds);
    }

    if (params.requiresReceipt !== undefined) {
      chain.updateRequiresReceipt(params.requiresReceipt);
    }

    if (params.approverSequence) {
      await Promise.all(
        params.approverSequence.map((userId) =>
          this.workspaceAuthService.authorize({
            userId,
            workspaceId: params.workspaceId,
            authToken: params.authToken,
          })
        )
      );
      chain.updateApproverSequence(params.approverSequence);
    }

    await this.chainRepository.save(chain);

    return ApprovalChain.toDTO(chain);
  }

  async getChain(params: ChainWorkspaceParams): Promise<ApprovalChainDTO>;
  async getChain(chainId: string, workspaceId: string): Promise<ApprovalChainDTO>;
  async getChain(
    chainIdOrParams: string | ChainWorkspaceParams,
    workspaceId?: string
  ): Promise<ApprovalChainDTO> {
    const chainId =
      typeof chainIdOrParams === 'string'
        ? chainIdOrParams
        : chainIdOrParams.chainId;
    const wsIdStr =
      typeof chainIdOrParams === 'string'
        ? workspaceId!
        : chainIdOrParams.workspaceId;

    const chainIdObj = ApprovalChainId.fromString(chainId);
    const wsId = WorkspaceId.fromString(wsIdStr);
    const chain = await this.chainRepository.findById(chainIdObj);

    if (!chain || !chain.workspaceId.equals(wsId)) {
      throw new ApprovalChainNotFoundError(chainId);
    }

    return ApprovalChain.toDTO(chain);
  }

  async listChains(params: ListApprovalChainsParams): Promise<PaginatedResult<ApprovalChainDTO>>;
  async listChains(
    workspaceId: string,
    activeOnly?: boolean,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ApprovalChainDTO>>;
  async listChains(
    workspaceIdOrParams: string | ListApprovalChainsParams,
    activeOnly = false,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ApprovalChainDTO>> {
    const wsIdStr =
      typeof workspaceIdOrParams === 'string'
        ? workspaceIdOrParams
        : workspaceIdOrParams.workspaceId;
    const shouldFilterActive =
      typeof workspaceIdOrParams === 'string'
        ? activeOnly
        : (workspaceIdOrParams.activeOnly ?? false);
    const pagination =
      typeof workspaceIdOrParams === 'string'
        ? options
        : workspaceIdOrParams.options;

    const wsId = WorkspaceId.fromString(wsIdStr);
    let result: PaginatedResult<ApprovalChain>;

    if (shouldFilterActive) {
      result = await this.chainRepository.findActiveByWorkspaceId(
        wsId,
        pagination
      );
    } else {
      result = await this.chainRepository.findByWorkspaceId(wsId, pagination);
    }

    return { ...result, items: result.items.map((chain) => ApprovalChain.toDTO(chain)) };
  }

  async activateChain(params: ChainWorkspaceParams): Promise<ApprovalChainDTO>;
  async activateChain(chainId: string, workspaceId: string): Promise<ApprovalChainDTO>;
  async activateChain(
    chainIdOrParams: string | ChainWorkspaceParams,
    workspaceId?: string
  ): Promise<ApprovalChainDTO> {
    const chainId =
      typeof chainIdOrParams === 'string'
        ? chainIdOrParams
        : chainIdOrParams.chainId;
    const wsIdStr =
      typeof chainIdOrParams === 'string'
        ? workspaceId!
        : chainIdOrParams.workspaceId;

    const chainIdObj = ApprovalChainId.fromString(chainId);
    const wsId = WorkspaceId.fromString(wsIdStr);
    const chain = await this.chainRepository.findById(chainIdObj);

    if (!chain || !chain.workspaceId.equals(wsId)) {
      throw new ApprovalChainNotFoundError(chainId);
    }

    chain.activate();
    await this.chainRepository.save(chain);
    return ApprovalChain.toDTO(chain);
  }

  async deactivateChain(params: ChainWorkspaceParams): Promise<ApprovalChainDTO>;
  async deactivateChain(chainId: string, workspaceId: string): Promise<ApprovalChainDTO>;
  async deactivateChain(
    chainIdOrParams: string | ChainWorkspaceParams,
    workspaceId?: string
  ): Promise<ApprovalChainDTO> {
    const chainId =
      typeof chainIdOrParams === 'string'
        ? chainIdOrParams
        : chainIdOrParams.chainId;
    const wsIdStr =
      typeof chainIdOrParams === 'string'
        ? workspaceId!
        : chainIdOrParams.workspaceId;

    const chainIdObj = ApprovalChainId.fromString(chainId);
    const wsId = WorkspaceId.fromString(wsIdStr);
    const chain = await this.chainRepository.findById(chainIdObj);

    if (!chain || !chain.workspaceId.equals(wsId)) {
      throw new ApprovalChainNotFoundError(chainId);
    }

    chain.deactivate();
    await this.chainRepository.save(chain);
    return ApprovalChain.toDTO(chain);
  }

  async deleteChain(params: ChainWorkspaceParams): Promise<void>;
  async deleteChain(chainId: string, workspaceId: string): Promise<void>;
  async deleteChain(
    chainIdOrParams: string | ChainWorkspaceParams,
    workspaceId?: string
  ): Promise<void> {
    const chainId =
      typeof chainIdOrParams === 'string'
        ? chainIdOrParams
        : chainIdOrParams.chainId;
    const wsIdStr =
      typeof chainIdOrParams === 'string'
        ? workspaceId!
        : chainIdOrParams.workspaceId;

    const chainIdObj = ApprovalChainId.fromString(chainId);
    const wsId = WorkspaceId.fromString(wsIdStr);
    const chain = await this.chainRepository.findById(chainIdObj);

    if (!chain || !chain.workspaceId.equals(wsId)) {
      throw new ApprovalChainNotFoundError(chainId);
    }

    const inUse = await this.chainRepository.hasReferencingWorkflows(chainIdObj);
    if (inUse) {
      throw new ApprovalChainInUseError(chainId);
    }

    chain.markAsDeleted();
    await this.chainRepository.delete(chain);
  }

  async findApplicableChain(params: FindApplicableChainParams): Promise<ApprovalChainDTO | null> {
    const chain = await this.chainRepository.findApplicableChain({
      workspaceId: WorkspaceId.fromString(params.workspaceId),
      amount: params.amount,
      categoryId: params.categoryId ? CategoryId.fromString(params.categoryId) : undefined,
      hasReceipt: params.hasReceipt,
    });
    return chain ? ApprovalChain.toDTO(chain) : null;
  }
}
