import { PrismaClient, Prisma } from '@prisma/client';
import { IApprovalChainRepository } from '../../domain/repositories/approval-chain.repository';
import { ApprovalChain } from '../../domain/entities/approval-chain.entity';
import { ApprovalChainId } from '../../domain/value-objects/approval-chain-id';
import {  WorkspaceId, UserId  } from '@core/domain/value-objects';
import {  CategoryId  } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';

export class PrismaApprovalChainRepository
  extends PrismaRepository<ApprovalChain>
  implements IApprovalChainRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(chain: ApprovalChain): Promise<void> {
    const data = this.toPersistence(chain);

    await this.prisma.approvalChain.upsert({
      where: { id: chain.id.getValue() },
      create: data.create,
      update: data.update,
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
      OR: [{ minAmount: null }, { minAmount: { lte: params.amount } }],
      AND: [
        {
          OR: [{ maxAmount: null }, { maxAmount: { gte: params.amount } }],
        },
      ],
    };

    const rows = await this.prisma.approvalChain.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Apply remaining filters that can't be expressed in SQL (categoryId array, receipt)
    for (const row of rows) {
      const chain = this.toDomain(row);
      if (
        chain.appliesTo({
          amount: params.amount,
          categoryId: params.categoryId,
          hasReceipt: params.hasReceipt,
        })
      ) {
        return chain;
      }
    }

    return null;
  }

  async delete(chainId: ApprovalChainId): Promise<void> {
    await this.prisma.approvalChain.delete({
      where: { id: chainId.getValue() },
    });
  }

  private toPersistence(chain: ApprovalChain): {
    create: Prisma.ApprovalChainUncheckedCreateInput;
    update: Prisma.ApprovalChainUncheckedUpdateInput;
  } {
    const categoryIds =
      chain.categoryIds?.map((id) => id.getValue()) || [];
    const approverSequence = chain.approverSequence.map((id) => id.getValue());

    return {
      create: {
        id: chain.id.getValue(),
        workspaceId: chain.workspaceId.getValue(),
        name: chain.name,
        description: chain.description,
        minAmount: chain.minAmount,
        maxAmount: chain.maxAmount,
        categoryIds,
        requiresReceipt: chain.requiresReceipt,
        approverSequence,
        isActive: chain.isActive,
        createdAt: chain.createdAt,
        updatedAt: chain.updatedAt,
      },
      update: {
        name: chain.name,
        description: chain.description,
        minAmount: chain.minAmount,
        maxAmount: chain.maxAmount,
        categoryIds,
        requiresReceipt: chain.requiresReceipt,
        approverSequence,
        isActive: chain.isActive,
        updatedAt: chain.updatedAt,
      },
    };
  }

  private toDomain(row: Prisma.ApprovalChainGetPayload<object>): ApprovalChain {
    return ApprovalChain.fromPersistence({
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
