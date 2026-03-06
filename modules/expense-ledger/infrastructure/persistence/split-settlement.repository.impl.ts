import {
  PrismaClient,
  Prisma,
  SettlementStatus as PrismaSettlementStatus,
} from "@prisma/client";
import { SplitSettlementRepository } from "../../domain/repositories/split-settlement.repository";
import { SplitSettlement } from "../../domain/entities/split-settlement.entity";
import { SettlementId } from "../../domain/value-objects/settlement-id";
import { SplitId } from "../../domain/value-objects/split-id";
import { Money } from "../../domain/value-objects/money";
import { SettlementStatus } from "../../domain/enums/settlement-status";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

export class SplitSettlementRepositoryImpl implements SplitSettlementRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: IEventBus,
  ) {}

  async save(settlement: SplitSettlement): Promise<void> {
    await this.prisma.splitSettlement.upsert({
      where: { id: settlement.getId().getValue() },
      create: {
        id: settlement.getId().getValue(),
        splitId: settlement.getSplitId().getValue(),
        fromUserId: settlement.getFromUserId(),
        toUserId: settlement.getToUserId(),
        totalOwedAmount: settlement.getTotalOwedAmount().getAmount(),
        paidAmount: settlement.getPaidAmount().getAmount(),
        currency: settlement.getTotalOwedAmount().getCurrency(),
        status: settlement.getStatus() as PrismaSettlementStatus,
        settledAt: settlement.getSettledAt(),
        createdAt: settlement.getCreatedAt(),
        updatedAt: settlement.getUpdatedAt(),
      },
      update: {
        paidAmount: settlement.getPaidAmount().getAmount(),
        status: settlement.getStatus() as PrismaSettlementStatus,
        settledAt: settlement.getSettledAt(),
        updatedAt: settlement.getUpdatedAt(),
      },
    });

    // NOTE: SplitSettlement does not extend AggregateRoot - no domain events to dispatch
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
    return SplitSettlement.reconstitute({
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
