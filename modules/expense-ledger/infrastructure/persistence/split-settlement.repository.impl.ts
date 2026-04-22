import {
  PrismaClient,
  Prisma,
  SettlementStatus as PrismaSettlementStatus,
} from "@prisma/client";
import { ISplitSettlementRepository } from "../../domain/repositories/split-settlement.repository";
import { SplitSettlement } from "../../domain/entities/split-settlement.entity";
import { SettlementId } from "../../domain/value-objects/settlement-id";
import { SplitId } from "../../domain/value-objects/split-id";
import { Money } from "../../domain/value-objects/money";
import { SettlementStatus } from "../../domain/enums/settlement-status";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

export class SplitSettlementRepositoryImpl
  implements ISplitSettlementRepository
{
  constructor(protected readonly prisma: PrismaClient) {}

  async save(settlement: SplitSettlement): Promise<void> {
    await this.prisma.splitSettlement.upsert({
      where: { id: settlement.id.getValue() },
      create: {
        id: settlement.id.getValue(),
        splitId: settlement.splitId.getValue(),
        fromUserId: settlement.fromUserId,
        toUserId: settlement.toUserId,
        totalOwedAmount: settlement.totalOwedAmount.getAmount(),
        paidAmount: settlement.paidAmount.getAmount(),
        currency: settlement.totalOwedAmount.getCurrency(),
        status: settlement.status as PrismaSettlementStatus,
        settledAt: settlement.settledAt,
        createdAt: settlement.createdAt,
        updatedAt: settlement.updatedAt,
      },
      update: {
        paidAmount: settlement.paidAmount.getAmount(),
        status: settlement.status as PrismaSettlementStatus,
        settledAt: settlement.settledAt,
        updatedAt: settlement.updatedAt,
      },
    });
  }

  async findById(
    id: SettlementId,
    workspaceId: string,
  ): Promise<SplitSettlement | null> {
    const settlement = await this.prisma.splitSettlement.findFirst({
      where: {
        id: id.getValue(),
        split: { workspaceId },
      },
    });

    if (!settlement) return null;

    return this.toDomain(settlement);
  }

  async findBySplitId(
    splitId: SplitId,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SplitSettlement>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.splitSettlement,
      {
        where: {
          splitId: splitId.getValue(),
          split: { workspaceId },
        },
        orderBy: { createdAt: "desc" },
      },
      (settlement) => this.toDomain(settlement),
      options,
    );
  }

  async findByUser(
    userId: string,
    workspaceId: string,
    status?: SettlementStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SplitSettlement>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const where: Prisma.SplitSettlementWhereInput = {
      split: { workspaceId },
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    };

    if (status) {
      where.status = status;
    }

    const [rows, total] = await Promise.all([
      this.prisma.splitSettlement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.splitSettlement.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async findPendingForUser(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<SplitSettlement>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.splitSettlement,
      {
        where: {
          fromUserId: userId,
          split: { workspaceId },
          status: { in: ["PENDING", "PARTIAL"] },
        },
        orderBy: { createdAt: "desc" },
      },
      (settlement) => this.toDomain(settlement),
      options,
    );
  }

  async delete(id: SettlementId, workspaceId: string): Promise<void> {
    await this.prisma.splitSettlement.delete({
      where: {
        id: id.getValue(),
        split: { workspaceId },
      },
    });
  }

  private toDomain(
    data: Prisma.SplitSettlementGetPayload<{}>,
  ): SplitSettlement {
    return SplitSettlement.fromPersistence({
      id: SettlementId.fromString(data.id),
      splitId: SplitId.fromString(data.splitId),
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      totalOwedAmount: Money.create(
        Number(data.totalOwedAmount),
        data.currency,
      ),
      paidAmount: Money.create(Number(data.paidAmount), data.currency),
      status: data.status as SettlementStatus,
      settledAt: data.settledAt ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
