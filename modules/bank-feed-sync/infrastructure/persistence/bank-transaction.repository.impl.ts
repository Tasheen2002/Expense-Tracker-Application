import { PrismaClient } from "@prisma/client";
import { WorkspaceId } from "../../../identity-workspace/domain/value-objects/workspace-id.vo";
import { BankTransaction } from "../../domain/entities/bank-transaction.entity";
import { BankTransactionId } from "../../domain/value-objects/bank-transaction-id";
import { BankConnectionId } from "../../domain/value-objects/bank-connection-id";
import { SyncSessionId } from "../../domain/value-objects/sync-session-id";
import { IBankTransactionRepository } from "../../domain/repositories/bank-transaction.repository";
import { TransactionStatus } from "../../domain/enums/transaction-status.enum";
import { DUPLICATE_TIME_THRESHOLD_MINUTES } from "../../domain/constants/bank-feed-sync.constants";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";
import { PrismaRepositoryHelper } from "../../../../apps/api/src/shared/infrastructure/persistence/prisma-repository.helper";

export class PrismaBankTransactionRepository implements IBankTransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(transaction: BankTransaction): Promise<void> {
    const data = {
      id: transaction.getId().getValue(),
      workspaceId: transaction.getWorkspaceId().getValue(),
      connectionId: transaction.getConnectionId().getValue(),
      sessionId: transaction.getSessionId().getValue(),
      externalId: transaction.getExternalId(),
      amount: transaction.getAmount(),
      currency: transaction.getCurrency(),
      description: transaction.getDescription(),
      merchantName: transaction.getMerchantName(),
      categoryName: transaction.getCategoryName(),
      transactionDate: transaction.getTransactionDate(),
      postedDate: transaction.getPostedDate(),
      status: transaction.getStatus(),
      expenseId: transaction.getExpenseId(),
      metadata: transaction.getMetadata() as any,
      createdAt: transaction.getCreatedAt(),
      updatedAt: transaction.getUpdatedAt(),
    };

    await this.prisma.bankTransaction.upsert({
      where: { id: transaction.getId().getValue() },
      create: data,
      update: data,
    });
  }

  async saveBatch(transactions: BankTransaction[]): Promise<void> {
    const data = transactions.map((t) => ({
      id: t.getId().getValue(),
      workspaceId: t.getWorkspaceId().getValue(),
      connectionId: t.getConnectionId().getValue(),
      sessionId: t.getSessionId().getValue(),
      externalId: t.getExternalId(),
      amount: t.getAmount(),
      currency: t.getCurrency(),
      description: t.getDescription(),
      merchantName: t.getMerchantName(),
      categoryName: t.getCategoryName(),
      transactionDate: t.getTransactionDate(),
      postedDate: t.getPostedDate(),
      status: t.getStatus(),
      expenseId: t.getExpenseId(),
      metadata: t.getMetadata() as any,
      createdAt: t.getCreatedAt(),
      updatedAt: t.getUpdatedAt(),
    }));

    await this.prisma.bankTransaction.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async findById(
    id: BankTransactionId,
    workspaceId: WorkspaceId,
  ): Promise<BankTransaction | null> {
    const record = await this.prisma.bankTransaction.findFirst({
      where: {
        id: id.getValue(),
        workspaceId: workspaceId.getValue(),
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByExternalId(
    workspaceId: WorkspaceId,
    externalId: string,
  ): Promise<BankTransaction | null> {
    const record = await this.prisma.bankTransaction.findFirst({
      where: {
        workspaceId: workspaceId.getValue(),
        externalId,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByConnection(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BankTransaction>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.bankTransaction,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          connectionId: connectionId.getValue(),
        },
        orderBy: {
          transactionDate: "desc",
        },
      },
      (r) => this.toDomain(r),
      options,
    );
  }

  async findBySession(
    workspaceId: WorkspaceId,
    sessionId: SyncSessionId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BankTransaction>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.bankTransaction,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          sessionId: sessionId.getValue(),
        },
        orderBy: {
          transactionDate: "desc",
        },
      },
      (r) => this.toDomain(r),
      options,
    );
  }

  async findByStatus(
    workspaceId: WorkspaceId,
    status: TransactionStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BankTransaction>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.bankTransaction,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          status,
        },
        orderBy: {
          transactionDate: "desc",
        },
      },
      (r) => this.toDomain(r),
      options,
    );
  }

  async findByConnectionAndStatus(
    workspaceId: WorkspaceId,
    connectionId: BankConnectionId,
    status: TransactionStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<BankTransaction>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.bankTransaction,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          connectionId: connectionId.getValue(),
          status,
        },
        orderBy: {
          transactionDate: "desc",
        },
      },
      (r) => this.toDomain(r),
      options,
    );
  }

  async findPotentialDuplicates(
    workspaceId: WorkspaceId,
    amount: number,
    transactionDate: Date,
    description: string,
  ): Promise<BankTransaction[]> {
    const startDate = new Date(
      transactionDate.getTime() - DUPLICATE_TIME_THRESHOLD_MINUTES * 60 * 1000,
    );
    const endDate = new Date(
      transactionDate.getTime() + DUPLICATE_TIME_THRESHOLD_MINUTES * 60 * 1000,
    );

    const records = await this.prisma.bankTransaction.findMany({
      where: {
        workspaceId: workspaceId.getValue(),
        amount,
        description,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: any): BankTransaction {
    return BankTransaction.fromPersistence({
      id: BankTransactionId.fromString(record.id),
      workspaceId: WorkspaceId.fromString(record.workspaceId),
      connectionId: BankConnectionId.fromString(record.connectionId),
      sessionId: SyncSessionId.fromString(record.sessionId),
      externalId: record.externalId,
      amount: record.amount,
      currency: record.currency,
      description: record.description,
      merchantName: record.merchantName,
      categoryName: record.categoryName,
      transactionDate: record.transactionDate,
      postedDate: record.postedDate,
      status: record.status as TransactionStatus,
      expenseId: record.expenseId,
      metadata: record.metadata,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
