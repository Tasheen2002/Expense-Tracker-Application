import { PrismaClient, Prisma } from '@prisma/client';
import { IApprovalChainRepository } from '../../domain/repositories/approval-chain.repository';
import { ApprovalChain } from '../../domain/entities/approval-chain.entity';
import { ApprovalChainId } from '../../domain/value-objects/approval-chain-id';
import { WorkspaceId, UserId } from '../../../identity-workspace';
import { CategoryId } from '../../../expense-ledger';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '../../../../apps/api/src/shared/domain/events/domain-event';

export class PrismaApprovalChainRepository
  extends PrismaRepository<ApprovalChain>
  implements IApprovalChainRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(chain: ApprovalChain): Promise<void> {
    await this.prisma.approvalChain.upsert({
      where: { id: chain.getId().getValue() },
      create: {
        id: chain.getId().getValue(),
        workspaceId: chain.getWorkspaceId().getValue(),
        name: chain.getName(),
        description: chain.getDescription(),
        minAmount: chain.getMinAmount(),
        maxAmount: chain.getMaxAmount(),
        categoryIds: chain.getCategoryIds()?.map((id) => id.getValue()) || [],
        requiresReceipt: chain.requiresReceipt(),
        approverSequence: chain
          .getApproverSequence()
          .map((id) => id.getValue()),
        isActive: chain.isActive(),
        createdAt: chain.getCreatedAt(),
        updatedAt: chain.getUpdatedAt(),
      },
      update: {
        name: chain.getName(),
        description: chain.getDescription(),
        minAmount: chain.getMinAmount(),
        maxAmount: chain.getMaxAmount(),
        categoryIds: chain.getCategoryIds()?.map((id) => id.getValue()) || [],
        requiresReceipt: chain.requiresReceipt(),
        approverSequence: chain
          .getApproverSequence()
          .map((id) => id.getValue()),
        isActive: chain.isActive(),
        updatedAt: chain.getUpdatedAt(),
      },
    });
    await this.dispatchEvents(chain);
  }

  async findById(chainId: ApprovalChainId): Promise<ApprovalChain | null> {
    const row = await this.prisma.approvalChain.findUnique({
      where: { id: chainId.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ApprovalChain>> {
    const where: Prisma.ApprovalChainWhereInput = { workspaceId };

    return PrismaRepositoryHelper.paginate(
      this.prisma.approvalChain,
      { where, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findActiveByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ApprovalChain>> {
    const where: Prisma.ApprovalChainWhereInput = {
      workspaceId,
      isActive: true,
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.approvalChain,
      { where, orderBy: { createdAt: 'desc' } },
      (record) => this.toDomain(record),
      options
    );
  }

  async findApplicableChain(params: {
    workspaceId: string;
    amount: number;
    categoryId?: string;
    hasReceipt: boolean;
  }): Promise<ApprovalChain | null> {
    const where: Prisma.ApprovalChainWhereInput = {
      workspaceId: params.workspaceId,
      isActive: true,
      // Amount range: no minimum set, OR minimum is <= the expense amount
      OR: [{ minAmount: null }, { minAmount: { lte: params.amount } }],
      AND: [
        // Amount range: no maximum set, OR maximum is >= the expense amount
        {
          OR: [{ maxAmount: null }, { maxAmount: { gte: params.amount } }],
        },
        // Category: chain has no category restriction, OR it includes this expense's category
        {
          OR: [
            { categoryIds: { isEmpty: true } },
            ...(params.categoryId !== undefined
              ? [{ categoryIds: { has: params.categoryId } }]
              : []),
          ],
        },
        // Receipt: if the expense has no receipt, skip chains that require one
        ...(params.hasReceipt ? [] : [{ requiresReceipt: false }]),
      ],
    };

    const row = await this.prisma.approvalChain.findFirst({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return row ? this.toDomain(row) : null;
  }

  async delete(chain: ApprovalChain): Promise<void> {
    await this.prisma.approvalChain.delete({
      where: { id: chain.getId().getValue() },
    });
    await this.dispatchEvents(chain);
  }

  private toDomain(row: Prisma.ApprovalChainGetPayload<object>): ApprovalChain {
    return ApprovalChain.reconstitute({
      chainId: ApprovalChainId.fromString(row.id),
      workspaceId: WorkspaceId.fromString(row.workspaceId),
      name: row.name,
      description: row.description ?? undefined,
      minAmount: row.minAmount ? Number(row.minAmount) : undefined,
      maxAmount: row.maxAmount ? Number(row.maxAmount) : undefined,
      categoryIds:
        row.categoryIds?.length > 0
          ? row.categoryIds.map((id: string) => CategoryId.fromString(id))
          : undefined,
      requiresReceipt: row.requiresReceipt,
      approverSequence: row.approverSequence.map((id: string) =>
        UserId.fromString(id)
      ),
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
