import { ExpenseSplitRepository } from '../../domain/repositories/expense-split.repository';
import { SplitSettlementRepository } from '../../domain/repositories/split-settlement.repository';
import { ExpenseRepository } from '../../domain/repositories/expense.repository';
import { ExpenseSplit, ExpenseSplitDTO } from '../../domain/entities/expense-split.entity';
import { SplitSettlement, SplitSettlementDTO } from '../../domain/entities/split-settlement.entity';
import { ExpenseId } from '../../domain/value-objects/expense-id';
import { SplitId } from '../../domain/value-objects/split-id';
import { SettlementId } from '../../domain/value-objects/settlement-id';
import { Money } from '../../domain/value-objects/money';
import { SplitType } from '../../domain/enums/split-type';
import { SettlementStatus } from '../../domain/enums/settlement-status';
import {
  SplitNotFoundError,
  ExpenseAlreadySplitError,
  UnauthorizedSplitAccessError,
  SettlementNotFoundError,
} from '../../domain/errors/split-expense.errors';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import { Decimal } from '@prisma/client/runtime/library';

export class ExpenseSplitService {
  constructor(
    private readonly splitRepository: ExpenseSplitRepository,
    private readonly settlementRepository: SplitSettlementRepository,
    private readonly expenseRepository?: ExpenseRepository
  ) {}

  async createSplit(params: {
    expenseId: string;
    workspaceId: string;
    userId: string;
    totalAmount: Money;
    splitType: SplitType;
    participants: Array<{
      userId: string;
      shareAmount?: number;
      sharePercentage?: number;
    }>;
  }): Promise<ExpenseSplitDTO> {
    const expenseId = ExpenseId.fromString(params.expenseId);

    const exists = await this.splitRepository.exists(
      expenseId,
      params.workspaceId
    );

    if (exists) {
      throw new ExpenseAlreadySplitError(params.expenseId);
    }

    const participantsWithMoney = params.participants.map((p) => ({
      userId: p.userId,
      shareAmount: p.shareAmount
        ? Money.create(p.shareAmount, params.totalAmount.getCurrency())
        : undefined,
      sharePercentage: p.sharePercentage
        ? new Decimal(p.sharePercentage)
        : undefined,
    }));

    const split = ExpenseSplit.create({
      expenseId,
      workspaceId: params.workspaceId,
      paidBy: params.userId,
      totalAmount: params.totalAmount,
      splitType: params.splitType,
      participants: participantsWithMoney,
    });

    await this.splitRepository.save(split);

    const settlements: SplitSettlement[] = [];
    for (const participant of split.getParticipants()) {
      if (participant.getUserId() !== params.userId) {
        const settlement = SplitSettlement.create({
          splitId: split.getId(),
          fromUserId: participant.getUserId(),
          toUserId: params.userId,
          owedAmount: participant.getShareAmount(),
        });
        settlements.push(settlement);
        await this.settlementRepository.save(settlement);
      }
    }

    return split.toJSON();
  }

  async getSplitById(
    splitId: string,
    workspaceId: string,
    userId: string
  ): Promise<ExpenseSplitDTO> {
    const split = await this.splitRepository.findById(
      SplitId.fromString(splitId),
      workspaceId
    );

    if (!split) {
      throw new SplitNotFoundError(splitId);
    }

    if (!split.isParticipant(userId) && split.getPaidBy() !== userId) {
      throw new UnauthorizedSplitAccessError(splitId, userId);
    }

    return split.toJSON();
  }

  async getSplitByExpenseId(
    expenseId: string,
    workspaceId: string,
    userId: string
  ): Promise<ExpenseSplitDTO | null> {
    const split = await this.splitRepository.findByExpenseId(
      ExpenseId.fromString(expenseId),
      workspaceId
    );

    if (!split) {
      return null;
    }

    if (!split.isParticipant(userId) && split.getPaidBy() !== userId) {
      throw new UnauthorizedSplitAccessError(split.getId().getValue(), userId);
    }

    return split.toJSON();
  }

  async listUserSplits(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<ExpenseSplitDTO>> {
    const result = await this.splitRepository.findByUser(userId, workspaceId, options);
    return { ...result, items: result.items.map((s) => s.toJSON()) };
  }

  async deleteSplit(
    splitId: string,
    workspaceId: string,
    userId: string
  ): Promise<void> {
    const split = await this.splitRepository.findById(
      SplitId.fromString(splitId),
      workspaceId
    );

    if (!split) {
      throw new SplitNotFoundError(splitId);
    }

    if (split.getPaidBy() !== userId) {
      throw new UnauthorizedSplitAccessError(splitId, userId);
    }

    split.markAsDeleted();
    await this.splitRepository.save(split);
    await this.splitRepository.delete(SplitId.fromString(splitId), workspaceId);
  }

  async recordPayment(params: {
    settlementId: string;
    workspaceId: string;
    userId: string;
    amount: number;
  }): Promise<SplitSettlementDTO> {
    const settlement = await this.settlementRepository.findById(
      SettlementId.fromString(params.settlementId),
      params.workspaceId
    );

    if (!settlement) {
      throw new SettlementNotFoundError(params.settlementId);
    }

    if (settlement.getFromUserId() !== params.userId) {
      throw new UnauthorizedSplitAccessError(
        params.settlementId,
        params.userId
      );
    }

    const paymentAmount = Money.create(
      params.amount,
      settlement.getTotalOwedAmount().getCurrency()
    );

    settlement.recordPayment(paymentAmount);

    await this.settlementRepository.save(settlement);

    const split = await this.splitRepository.findById(
      settlement.getSplitId(),
      params.workspaceId
    );

    if (split) {
      const participant = split.getParticipantByUserId(params.userId);
      if (participant && settlement.isSettled()) {
        participant.markAsPaid();
        await this.splitRepository.save(split);
      }

      if (this.expenseRepository) {
        const expense = await this.expenseRepository.findById(
          split.getExpenseId(),
          params.workspaceId
        );
        if (expense) {
          expense.recordSettlement(settlement.getId().getValue());
          await this.expenseRepository.update(expense);
        }
      }
    }

    return settlement.toJSON();
  }

  async getUserSettlements(
    userId: string,
    workspaceId: string,
    status?: SettlementStatus,
    options?: PaginationOptions
  ): Promise<PaginatedResult<SplitSettlementDTO>> {
    const result = await this.settlementRepository.findByUser(
      userId,
      workspaceId,
      status,
      options
    );
    return { ...result, items: result.items.map((s) => s.toJSON()) };
  }

  async getSplitSettlements(
    splitId: string,
    workspaceId: string,
    userId: string
  ): Promise<PaginatedResult<SplitSettlementDTO>> {
    const split = await this.splitRepository.findById(
      SplitId.fromString(splitId),
      workspaceId
    );

    if (!split) {
      throw new SplitNotFoundError(splitId);
    }

    if (!split.isParticipant(userId) && split.getPaidBy() !== userId) {
      throw new UnauthorizedSplitAccessError(splitId, userId);
    }

    const result = await this.settlementRepository.findBySplitId(
      SplitId.fromString(splitId),
      workspaceId
    );
    return { ...result, items: result.items.map((s) => s.toJSON()) };
  }
}
