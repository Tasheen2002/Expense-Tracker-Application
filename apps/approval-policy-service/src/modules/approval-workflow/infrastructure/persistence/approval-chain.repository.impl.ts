import { PrismaClient } from '@shared/infrastructure/persistence/prisma.client';
import type { Prisma } from '@prisma/client';
import {
  IApprovalChainRepository,
  ApplicableChainParams,
} from '../../domain/repositories/approval-chain.repository';
import { ApprovalChain } from '../../domain/entities/approval-chain.entity';
import { ApprovalChainId } from '../../domain/value-objects';
import { ApprovalChainInUseError, ConcurrencyConflictError } from '../../domain/errors/approval-workflow.errors';
import { WorkspaceId, UserId, CategoryId } from '@core/domain/value-objects';
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
    const chainId = chain.id.getValue();
    const expectedVersion = chain.version;
    let nextVersion: number | null = null;

    await this.prisma.$transaction(async (tx) => {
      // Query current version for optimistic concurrency check
      const existing = await tx.approvalChain.findUnique({
        where: { id: chainId },
        select: { version: true },
      });

      if (!existing) {
        await tx.approvalChain.create({
          data: {
            ...data.create,
            version: expectedVersion,
          },
        });
      } else {
        const updateResult = await tx.approvalChain.updateMany({
          where: {
            id: chainId,
            version: expectedVersion,
          },
          data: {
            ...data.update,
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new ConcurrencyConflictError(chainId);
        }

        nextVersion = expectedVersion + 1;
      }

      await this.persistOutboxEvents(tx, chain);
    });

    if (nextVersion !== null) {
      chain.synchronizeVersion(nextVersion);
    }

    await this.dispatchEvents(chain);
  }

  async findById(chainId: ApprovalChainId): Promise<ApprovalChain | null> {
    const row = await this.prisma.approvalChain.findUnique({
      where: { id: chainId.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ApprovalChain>> {
    const where: Prisma.ApprovalChainWhereInput = { workspaceId: workspaceId.getValue() };

    return PrismaRepositoryHelper.paginate(
      this.prisma.approvalChain,
      { where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] },
      (record) => this.toDomain(record),
      options
    );
  }

  async findActiveByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ApprovalChain>> {
    const where: Prisma.ApprovalChainWhereInput = {
      workspaceId: workspaceId.getValue(),
      isActive: true,
    };

    return PrismaRepositoryHelper.paginate(
      this.prisma.approvalChain,
      { where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] },
      (record) => this.toDomain(record),
      options
    );
  }

  async findApplicableChain(params: ApplicableChainParams): Promise<ApprovalChain | null> {
    const wsId = params.workspaceId.getValue();
    const catId = params.categoryId?.getValue();

    const where: Prisma.ApprovalChainWhereInput = {
      workspaceId: wsId,
      isActive: true,
      AND: [
        {
          OR: [{ minAmount: null }, { minAmount: { lte: params.amount } }],
        },
        {
          OR: [{ maxAmount: null }, { maxAmount: { gte: params.amount } }],
        },
        ...(catId
          ? [
              {
                OR: [
                  { categoryIds: { isEmpty: true } },
                  { categoryIds: { has: catId } },
                ],
              },
            ]
          : [{ categoryIds: { isEmpty: true } }]),
        ...(!params.hasReceipt ? [{ requiresReceipt: false }] : []),
      ],
    };

    const rows = await this.prisma.approvalChain.findMany({
      where,
    });

    if (!rows || rows.length === 0) {
      return null;
    }

    // Convert to domain and filter to chains that genuinely apply
    const matchingChains: { chain: ApprovalChain; score: number; createdAt: Date; id: string }[] = [];

    for (const row of rows) {
      const chain = this.toDomain(row);
      if (
        chain.appliesTo({
          amount: params.amount,
          categoryId: catId,
          hasReceipt: params.hasReceipt,
        })
      ) {
        // Specificity scoring:
        // 1. Explicit Category Match: A targeted category chain (+100) takes precedence over catch-all (+0).
        // 2. Receipt Requirement: Explicit receipt requirement (+10) is more specific than optional (+0).
        // 3. Amount Constraints: Explicit lower (+5) or upper (+5) bound is more specific than unbounded (+0).
        let score = 0;
        if (catId && chain.categoryIds && chain.categoryIds.some((c) => c.getValue() === catId)) {
          score += 100;
        }
        if (chain.requiresReceipt) {
          score += 10;
        }
        if (chain.minAmount !== undefined) {
          score += 5;
        }
        if (chain.maxAmount !== undefined) {
          score += 5;
        }

        matchingChains.push({
          chain,
          score,
          createdAt: row.createdAt,
          id: row.id,
        });
      }
    }

    if (matchingChains.length === 0) {
      return null;
    }

    // Sort by:
    // 1. Specificity score DESC (highest specificity wins)
    // 2. Creation date DESC (newer configuration overrides older configuration of equal specificity)
    // 3. ID ASC (deterministic tie-breaker)
    matchingChains.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      return a.id.localeCompare(b.id);
    });

    return matchingChains[0].chain;
  }

  async delete(chain: ApprovalChain): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.approvalChain.delete({
          where: { id: chain.id.getValue() },
        });

        await this.persistOutboxEvents(tx, chain);
      });

      await this.dispatchEvents(chain);
    } catch (error: any) {
      if (error?.code === 'P2003') {
        throw new ApprovalChainInUseError(chain.id.getValue());
      }
      throw error;
    }
  }

  async exists(chainId: ApprovalChainId): Promise<boolean> {
    const count = await this.prisma.approvalChain.count({
      where: { id: chainId.getValue() },
    });
    return count > 0;
  }

  async countByWorkspaceId(workspaceId: WorkspaceId): Promise<number> {
    return this.prisma.approvalChain.count({
      where: { workspaceId: workspaceId.getValue() },
    });
  }

  async hasReferencingWorkflows(chainId: ApprovalChainId): Promise<boolean> {
    const count = await this.prisma.expenseWorkflow.count({
      where: { chainId: chainId.getValue() },
    });
    return count > 0;
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
        description: chain.description ?? null,
        minAmount: chain.minAmount ?? null,
        maxAmount: chain.maxAmount ?? null,
        categoryIds,
        requiresReceipt: chain.requiresReceipt,
        approverSequence,
        isActive: chain.isActive,
        version: chain.version,
        createdAt: chain.createdAt,
        updatedAt: chain.updatedAt,
      },
      update: {
        name: chain.name,
        description: chain.description ?? null,
        minAmount: chain.minAmount ?? null,
        maxAmount: chain.maxAmount ?? null,
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
      minAmount:
        row.minAmount !== null && row.minAmount !== undefined
          ? Number(row.minAmount)
          : undefined,
      maxAmount:
        row.maxAmount !== null && row.maxAmount !== undefined
          ? Number(row.maxAmount)
          : undefined,
      categoryIds:
        row.categoryIds && row.categoryIds.length > 0
          ? row.categoryIds.map((id: string) => CategoryId.fromString(id))
          : undefined,
      requiresReceipt: row.requiresReceipt,
      approverSequence: row.approverSequence.map((id: string) =>
        UserId.fromString(id)
      ),
      isActive: row.isActive,
      version: row.version ?? 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
