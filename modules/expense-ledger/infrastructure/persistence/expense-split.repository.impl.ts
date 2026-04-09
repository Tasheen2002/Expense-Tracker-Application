import {
  PrismaClient,
  Prisma,
  SplitType as PrismaSplitType,
} from '@prisma/client';
import { ExpenseSplitRepository } from '../../domain/repositories/expense-split.repository';
import { ExpenseSplit } from '../../domain/entities/expense-split.entity';
import { SplitParticipant } from '../../domain/entities/split-participant.entity';
import { SplitId } from '../../domain/value-objects/split-id';
import { ExpenseId } from '../../domain/value-objects/expense-id';
import { SplitParticipantId } from '../../domain/value-objects/split-participant-id';
import { Money } from '../../domain/value-objects/money';
import { SplitType } from '../../domain/enums/split-type';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';

export class ExpenseSplitRepositoryImpl
  extends PrismaRepository<ExpenseSplit>
  implements ExpenseSplitRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(split: ExpenseSplit): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.expenseSplit.upsert({
        where: { id: split.id.getValue() },
        create: {
          id: split.id.getValue(),
          expenseId: split.expenseId.getValue(),
          workspaceId: split.workspaceId,
          paidBy: split.paidBy,
          totalAmount: split.totalAmount.getAmount(),
          currency: split.totalAmount.getCurrency(),
          splitType: split.splitType as PrismaSplitType,
          createdAt: split.createdAt,
          updatedAt: split.updatedAt,
        },
        update: {
          totalAmount: split.totalAmount.getAmount(),
          currency: split.totalAmount.getCurrency(),
          splitType: split.splitType as PrismaSplitType,
          updatedAt: split.updatedAt,
        },
      });

      await tx.splitParticipant.deleteMany({
        where: { splitId: split.id.getValue() },
      });

      if (split.participants.length > 0) {
        await tx.splitParticipant.createMany({
          data: split.participants.map((p) => ({
            id: p.id.getValue(),
            splitId: p.splitId.getValue(),
            userId: p.userId,
            shareAmount: p.shareAmount.getAmount(),
            sharePercentage: p.sharePercentage,
            isPaid: p.isPaid,
            paidAt: p.paidAt,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })),
        });
      }
    });

    await this.dispatchEvents(split);
  }

  async findById(
    id: SplitId,
    workspaceId: string
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
    workspaceId: string
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
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseSplit>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [rows, total] = await Promise.all([
      this.prisma.expenseSplit.findMany({
        where: { workspaceId },
        include: { participants: true },
        orderBy: { createdAt: 'desc' },
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
    options?: PaginationOptions
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
        orderBy: { createdAt: 'desc' },
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
    options?: PaginationOptions
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
        orderBy: { createdAt: 'desc' },
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
    data: Prisma.ExpenseSplitGetPayload<{ include: { participants: true } }>
  ): ExpenseSplit {
    const participants = data.participants.map((p) =>
      SplitParticipant.fromPersistence({
        id: SplitParticipantId.fromString(p.id),
        splitId: SplitId.fromString(p.splitId),
        userId: p.userId,
        shareAmount: Money.create(Number(p.shareAmount), data.currency),
        sharePercentage: p.sharePercentage !== null ? Number(p.sharePercentage) : undefined,
        isPaid: p.isPaid,
        paidAt: p.paidAt ?? undefined,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })
    );

    return ExpenseSplit.fromPersistence({
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
