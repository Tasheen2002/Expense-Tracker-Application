import { FastifyRequest, FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";
import { CreateSplitHandler } from "../../../application/commands/create-split.command";
import { DeleteSplitHandler } from "../../../application/commands/delete-split.command";
import { RecordPaymentHandler } from "../../../application/commands/record-payment.command";
import { GetSplitHandler } from "../../../application/queries/get-split.query";
import { ListUserSplitsHandler } from "../../../application/queries/list-user-splits.query";
import { ListUserSettlementsHandler } from "../../../application/queries/list-user-settlements.query";
import { ExpenseSplitService } from "../../../application/services/expense-split.service";
import { SplitType } from "../../../domain/enums/split-type";
import { SettlementStatus } from "../../../domain/enums/settlement-status";

export class ExpenseSplitController {
  private readonly createSplitHandler: CreateSplitHandler;
  private readonly deleteSplitHandler: DeleteSplitHandler;
  private readonly recordPaymentHandler: RecordPaymentHandler;
  private readonly getSplitHandler: GetSplitHandler;
  private readonly listUserSplitsHandler: ListUserSplitsHandler;
  private readonly listUserSettlementsHandler: ListUserSettlementsHandler;

  constructor(private readonly splitService: ExpenseSplitService) {
    this.createSplitHandler = new CreateSplitHandler(splitService);
    this.deleteSplitHandler = new DeleteSplitHandler(splitService);
    this.recordPaymentHandler = new RecordPaymentHandler(splitService);
    this.getSplitHandler = new GetSplitHandler(splitService);
    this.listUserSplitsHandler = new ListUserSplitsHandler(splitService);
    this.listUserSettlementsHandler = new ListUserSettlementsHandler(
      splitService,
    );
  }

  async createSplit(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
      Body: {
        splitType: SplitType;
        participants: Array<{
          userId: string;
          shareAmount?: number;
          sharePercentage?: number;
        }>;
      };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId, expenseId } = request.params;
    const { splitType, participants } = request.body;
    const userId = request.user.userId;

    const split = await this.createSplitHandler.handle({
      expenseId,
      workspaceId,
      userId,
      splitType,
      participants,
    });

    return reply.status(201).send({
      id: split.getId().getValue(),
      expenseId: split.getExpenseId().getValue(),
      paidBy: split.getPaidBy(),
      totalAmount: split.getTotalAmount().getAmount(),
      currency: split.getTotalAmount().getCurrency(),
      splitType: split.getSplitType(),
      participants: split.getParticipants().map((p) => ({
        id: p.getId().getValue(),
        userId: p.getUserId(),
        shareAmount: p.getShareAmount().getAmount(),
        sharePercentage: p.getSharePercentage()?.toNumber(),
        isPaid: p.isPaidStatus(),
        paidAt: p.getPaidAt(),
      })),
      isFullySettled: split.isFullySettled(),
      outstandingAmount: split.getOutstandingAmount().getAmount(),
      createdAt: split.getCreatedAt(),
      updatedAt: split.getUpdatedAt(),
    });
  }

  async getSplit(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; splitId: string };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId, splitId } = request.params;
    const userId = request.user.userId;

    const split = await this.getSplitHandler.handle({
      splitId,
      workspaceId,
      userId,
    });

    if (!split) {
      return reply.status(404).send({ error: "Split not found" });
    }

    return reply.send({
      id: split.getId().getValue(),
      expenseId: split.getExpenseId().getValue(),
      paidBy: split.getPaidBy(),
      totalAmount: split.getTotalAmount().getAmount(),
      currency: split.getTotalAmount().getCurrency(),
      splitType: split.getSplitType(),
      participants: split.getParticipants().map((p) => ({
        id: p.getId().getValue(),
        userId: p.getUserId(),
        shareAmount: p.getShareAmount().getAmount(),
        sharePercentage: p.getSharePercentage()?.toNumber(),
        isPaid: p.isPaidStatus(),
        paidAt: p.getPaidAt(),
      })),
      isFullySettled: split.isFullySettled(),
      outstandingAmount: split.getOutstandingAmount().getAmount(),
      createdAt: split.getCreatedAt(),
      updatedAt: split.getUpdatedAt(),
    });
  }

  async getSplitByExpense(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; expenseId: string };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId, expenseId } = request.params;
    const userId = request.user.userId;

    const split = await this.splitService.getSplitByExpenseId(
      expenseId,
      workspaceId,
      userId,
    );

    if (!split) {
      return reply.status(404).send({ error: "Split not found" });
    }

    return reply.send({
      id: split.getId().getValue(),
      expenseId: split.getExpenseId().getValue(),
      paidBy: split.getPaidBy(),
      totalAmount: split.getTotalAmount().getAmount(),
      currency: split.getTotalAmount().getCurrency(),
      splitType: split.getSplitType(),
      participants: split.getParticipants().map((p) => ({
        id: p.getId().getValue(),
        userId: p.getUserId(),
        shareAmount: p.getShareAmount().getAmount(),
        sharePercentage: p.getSharePercentage()?.toNumber(),
        isPaid: p.isPaidStatus(),
        paidAt: p.getPaidAt(),
      })),
      isFullySettled: split.isFullySettled(),
      outstandingAmount: split.getOutstandingAmount().getAmount(),
      createdAt: split.getCreatedAt(),
      updatedAt: split.getUpdatedAt(),
    });
  }

  async listUserSplits(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: number; offset?: number };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId } = request.params;
    const { limit, offset } = request.query;
    const userId = request.user.userId;

    const result = await this.listUserSplitsHandler.handle({
      userId,
      workspaceId,
      limit,
      offset,
    });

    return reply.send({
      items: result.items.map((split) => ({
        id: split.getId().getValue(),
        expenseId: split.getExpenseId().getValue(),
        paidBy: split.getPaidBy(),
        totalAmount: split.getTotalAmount().getAmount(),
        currency: split.getTotalAmount().getCurrency(),
        splitType: split.getSplitType(),
        participantCount: split.getParticipants().length,
        isFullySettled: split.isFullySettled(),
        outstandingAmount: split.getOutstandingAmount().getAmount(),
        createdAt: split.getCreatedAt(),
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }

  async deleteSplit(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; splitId: string };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId, splitId } = request.params;
    const userId = request.user.userId;

    await this.deleteSplitHandler.handle({
      splitId,
      workspaceId,
      userId,
    });

    return reply.status(204).send();
  }

  async recordPayment(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; settlementId: string };
      Body: { amount: number };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId, settlementId } = request.params;
    const { amount } = request.body;
    const userId = request.user.userId;

    const settlement = await this.recordPaymentHandler.handle({
      settlementId,
      workspaceId,
      userId,
      amount,
    });

    return reply.send({
      id: settlement.getId().getValue(),
      splitId: settlement.getSplitId().getValue(),
      fromUserId: settlement.getFromUserId(),
      toUserId: settlement.getToUserId(),
      totalOwedAmount: settlement.getTotalOwedAmount().getAmount(),
      paidAmount: settlement.getPaidAmount().getAmount(),
      remainingAmount: settlement.getRemainingAmount().getAmount(),
      status: settlement.getStatus(),
      settledAt: settlement.getSettledAt(),
      updatedAt: settlement.getUpdatedAt(),
    });
  }

  async listUserSettlements(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: {
        status?: SettlementStatus;
        limit?: number;
        offset?: number;
      };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId } = request.params;
    const { status, limit, offset } = request.query;
    const userId = request.user.userId;

    const result = await this.listUserSettlementsHandler.handle({
      userId,
      workspaceId,
      status,
      limit,
      offset,
    });

    return reply.send({
      items: result.items.map((s) => ({
        id: s.getId().getValue(),
        splitId: s.getSplitId().getValue(),
        fromUserId: s.getFromUserId(),
        toUserId: s.getToUserId(),
        totalOwedAmount: s.getTotalOwedAmount().getAmount(),
        paidAmount: s.getPaidAmount().getAmount(),
        remainingAmount: s.getRemainingAmount().getAmount(),
        status: s.getStatus(),
        settledAt: s.getSettledAt(),
        createdAt: s.getCreatedAt(),
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }

  async getSplitSettlements(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; splitId: string };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId, splitId } = request.params;
    const userId = request.user.userId;

    const settlements = await this.splitService.getSplitSettlements(
      splitId,
      workspaceId,
      userId,
    );

    return reply.send({
      items: settlements.map((s) => ({
        id: s.getId().getValue(),
        fromUserId: s.getFromUserId(),
        toUserId: s.getToUserId(),
        totalOwedAmount: s.getTotalOwedAmount().getAmount(),
        paidAmount: s.getPaidAmount().getAmount(),
        remainingAmount: s.getRemainingAmount().getAmount(),
        status: s.getStatus(),
        settledAt: s.getSettledAt(),
        createdAt: s.getCreatedAt(),
      })),
    });
  }
}
