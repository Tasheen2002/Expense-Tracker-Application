import {
  PrismaClient,
  Prisma,
  SplitType as PrismaSplitType,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { ExpenseSplitRepository } from "../../domain/repositories/expense-split.repository";
import { ExpenseSplit } from "../../domain/entities/expense-split.entity";
import { SplitParticipant } from "../../domain/entities/split-participant.entity";
import { SplitId } from "../../domain/value-objects/split-id";
import { ExpenseId } from "../../domain/value-objects/expense-id";
import { SplitParticipantId } from "../../domain/value-objects/split-participant-id";
import { Money } from "../../domain/value-objects/money";
import { SplitType } from "../../domain/enums/split-type";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events/domain-event";

export class ExpenseSplitRepositoryImpl implements ExpenseSplitRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: IEventBus,
  ) {}

  async save(split: ExpenseSplit): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.expenseSplit.upsert({
        where: { id: split.getId().getValue() },
        create: {
          id: split.getId().getValue(),
          expenseId: split.getExpenseId().getValue(),
          workspaceId: split.getWorkspaceId(),
          paidBy: split.getPaidBy(),
          totalAmount: split.getTotalAmount().getAmount(),
          currency: split.getTotalAmount().getCurrency(),
          splitType: split.getSplitType() as PrismaSplitType,
          createdAt: split.getCreatedAt(),
          updatedAt: split.getUpdatedAt(),
        },
        update: {
          totalAmount: split.getTotalAmount().getAmount(),
          currency: split.getTotalAmount().getCurrency(),
          splitType: split.getSplitType() as PrismaSplitType,
          updatedAt: split.getUpdatedAt(),
        },
      });

      await tx.splitParticipant.deleteMany({
        where: { splitId: split.getId().getValue() },
      });

      if (split.getParticipants().length > 0) {
        await tx.splitParticipant.createMany({
          data: split.getParticipants().map((p) => ({
            id: p.getId().getValue(),
            splitId: p.getSplitId().getValue(),
            userId: p.getUserId(),
            shareAmount: p.getShareAmount().getAmount(),
            sharePercentage: p.getSharePercentage()?.toNumber(),
            isPaid: p.isPaidStatus(),
            paidAt: p.getPaidAt(),
            createdAt: p.getCreatedAt(),
            updatedAt: p.getUpdatedAt(),
          })),
        });
      }
    });

    // NOTE: ExpenseSplit does not extend AggregateRoot - no domain events to dispatch
  }

  async findById(
    id: SplitId,
    workspaceId: string,
  ): Promise<ExpenseSplit | null> {
    const split = await this.prisma.expenseSplit.findUnique({
      where: {
        id: id.getValue(),
        workspaceId,
      },
      include: {
        participants: true,
      },
    });

    if (!split) return null;

    return this.toDomain(split);
  }

  async findByExpenseId(
    expenseId: ExpenseId,
    workspaceId: string,
  ): Promise<ExpenseSplit | null> {
    const split = await this.prisma.expenseSplit.findUnique({
      where: {
        expenseId: expenseId.getValue(),
        workspaceId,
      },
      include: {
        participants: true,
      },
    });

    if (!split) return null;

    return this.toDomain(split);
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpenseSplit>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [rows, total] = await Promise.all([
      this.prisma.expenseSplit.findMany({
        where: { workspaceId },
        include: { participants: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.expenseSplit.count({ where: { workspaceId } }),
    ]);

    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async findByUser(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpenseSplit>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const where = {
      workspaceId,
      participants: {
        some: { userId },
      },
    };

    const [rows, total] = await Promise.all([
      this.prisma.expenseSplit.findMany({
        where,
        include: { participants: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.expenseSplit.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async findByPaidBy(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ExpenseSplit>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const where = {
      workspaceId,
      paidBy: userId,
    };

    const [rows, total] = await Promise.all([
      this.prisma.expenseSplit.findMany({
        where,
        include: { participants: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.expenseSplit.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    };
  }

  async delete(id: SplitId, workspaceId: string): Promise<void> {
    await this.prisma.expenseSplit.delete({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });
  }

  async exists(expenseId: ExpenseId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.expenseSplit.count({
      where: {
        expenseId: expenseId.getValue(),
        workspaceId,
      },
    });
    return count > 0;
  }

  private toDomain(
    data: Prisma.ExpenseSplitGetPayload<{ include: { participants: true } }>,
  ): ExpenseSplit {
    const participants = data.participants.map((p) =>
      SplitParticipant.reconstitute({
        id: SplitParticipantId.fromString(p.id),
        splitId: SplitId.fromString(p.splitId),
        userId: p.userId,
        shareAmount: Money.create(Number(p.shareAmount), data.currency),
        sharePercentage: p.sharePercentage
          ? new Decimal(p.sharePercentage)
          : undefined,
        isPaid: p.isPaid,
        paidAt: p.paidAt ?? undefined,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }),
    );

    return ExpenseSplit.reconstitute({
      id: SplitId.fromString(data.id),
      expenseId: ExpenseId.fromString(data.expenseId),
      workspaceId: data.workspaceId,
      paidBy: data.paidBy,
      totalAmount: Money.create(Number(data.totalAmount), data.currency),
      splitType: data.splitType as SplitType,
      participants,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
