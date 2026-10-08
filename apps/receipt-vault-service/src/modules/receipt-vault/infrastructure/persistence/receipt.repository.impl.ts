import { PrismaClient, Prisma, Receipt as ReceiptModel } from '@prisma/client';
import { Receipt } from '../../domain/entities/receipt.entity';
import { ReceiptId } from '../../domain/value-objects/receipt-id';
import { FileInfo } from '../../domain/value-objects/file-info';
import { StorageLocation } from '../../domain/value-objects/storage-location';
import {
  IReceiptRepository,
  ReceiptFilters,
} from '../../domain/repositories/receipt.repository';
import { ReceiptStatus } from '../../domain/enums/receipt-status';
import { ReceiptType } from '../../domain/enums/receipt-type';
import { randomUUID } from 'node:crypto';
import {
  DuplicateReceiptError,
  ReceiptNotFoundError,
  ReceiptWriteConflictError,
} from '../../domain/errors/receipt.errors';
import { StorageProvider } from '../../domain/enums/storage-provider';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';

import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { isUniqueConstraint } from '@shared/infrastructure/persistence/constraint-errors';

export class ReceiptRepositoryImpl
  extends PrismaRepository<Receipt>
  implements IReceiptRepository
{
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async save(receipt: Receipt): Promise<void> {
    const fileInfo = receipt.fileInfo;
    const storageLocation = receipt.storageLocation;

    try {
      await this.persistWithEvents(
        receipt,
        async (tx) => {
          if (receipt.expectedVersion === undefined) {
            await tx.receipt.create({
              data: {
                id: receipt.id.getValue(),
                workspaceId: receipt.workspaceId,
                expenseId: receipt.expenseId,
                userId: receipt.userId,
                fileName: fileInfo.getFileName(),
                originalName: fileInfo.getOriginalName(),
                filePath: fileInfo.getFilePath(),
                fileSize: fileInfo.getFileSize(),
                mimeType: fileInfo.getMimeType(),
                fileHash: fileInfo.getFileHash(),
                receiptType: receipt.receiptType,
                status: receipt.status,
                storageProvider: storageLocation.getProvider(),
                storageBucket: storageLocation.getBucket(),
                storageKey: storageLocation.getKey(),
                thumbnailPath: receipt.thumbnailPath,
                ocrText: receipt.ocrText,
                ocrConfidence: receipt.ocrConfidence,
                processedAt: receipt.processedAt,
                failureReason: receipt.failureReason,
                createdAt: receipt.createdAt,
                updatedAt: receipt.updatedAt,
                deletedAt: receipt.deletedAt,
                version: 0,
              },
            });
          } else {
            const result = await tx.receipt.updateMany({
              where: {
                id: receipt.id.getValue(),
                workspaceId: receipt.workspaceId,
                version: receipt.expectedVersion,
              },
              data: {
                expenseId: receipt.expenseId ?? null,
                fileName: fileInfo.getFileName(),
                filePath: fileInfo.getFilePath(),
                receiptType: receipt.receiptType,
                status: receipt.status,
                thumbnailPath: receipt.thumbnailPath,
                ocrText: receipt.ocrText ?? null,
                ocrConfidence: receipt.ocrConfidence ?? null,
                processedAt: receipt.processedAt ?? null,
                failureReason: receipt.failureReason ?? null,
                updatedAt: receipt.updatedAt,
                deletedAt: receipt.deletedAt ?? null,
                version: { increment: 1 },
              },
            });
            if (result.count !== 1)
              throw new ReceiptWriteConflictError(receipt.id.getValue());
          }
        },
        { workspaceId: receipt.workspaceId, userId: receipt.userId }
      );
      receipt.acknowledgePersistence();
    } catch (error) {
      if (
        isUniqueConstraint(error, 'file_hash', 'receipt_active_workspace_hash')
      ) {
        throw new DuplicateReceiptError(
          receipt.fileInfo.getFileHash() ?? 'unknown'
        );
      }
      throw error;
    }
  }

  async findById(id: ReceiptId, workspaceId: string): Promise<Receipt | null> {
    const row = await this.prisma.receipt.findFirst({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByExpenseId(
    expenseId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Receipt>> {
    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.receipt.findMany({
          where: {
            expenseId,
            workspaceId,
            deletedAt: null,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...page,
        }),
      () =>
        this.prisma.receipt.count({
          where: {
            expenseId,
            workspaceId,
            deletedAt: null,
          },
        }),
      (row) => this.toDomain(row),
      options
    );
  }

  async findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Receipt>> {
    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.receipt.findMany({
          where: {
            workspaceId,
            deletedAt: null,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...page,
        }),
      () =>
        this.prisma.receipt.count({
          where: {
            workspaceId,
            deletedAt: null,
          },
        }),
      (row) => this.toDomain(row),
      options
    );
  }

  async findByUserId(
    userId: string,
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Receipt>> {
    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.receipt.findMany({
          where: {
            userId,
            workspaceId,
            deletedAt: null,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...page,
        }),
      () =>
        this.prisma.receipt.count({
          where: {
            userId,
            workspaceId,
            deletedAt: null,
          },
        }),
      (row) => this.toDomain(row),
      options
    );
  }

  async findByFilters(
    filters: ReceiptFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Receipt>> {
    const where = this.buildWhereClause(filters);

    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.receipt.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...page,
        }),
      () => this.prisma.receipt.count({ where }),
      (row) => this.toDomain(row),
      options
    );
  }

  async countByFilters(filters: ReceiptFilters): Promise<number> {
    const where = this.buildWhereClause(filters);

    return await this.prisma.receipt.count({ where });
  }

  private buildWhereClause(filters: ReceiptFilters): Prisma.ReceiptWhereInput {
    const where: Prisma.ReceiptWhereInput = {
      workspaceId: filters.workspaceId,
    };

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.expenseId) {
      where.expenseId = filters.expenseId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.receiptType) {
      where.receiptType = filters.receiptType;
    }

    if (filters.isLinked !== undefined) {
      where.AND = [{ expenseId: filters.isLinked ? { not: null } : null }];
    }

    if (filters.isDeleted !== undefined) {
      where.deletedAt = filters.isDeleted ? { not: null } : null;
    } else {
      where.deletedAt = null;
    }

    if (filters.fromDate) {
      where.createdAt = {
        ...(typeof where.createdAt === 'object' ? where.createdAt : {}),
        gte: filters.fromDate,
      };
    }

    if (filters.toDate) {
      where.createdAt = {
        ...(typeof where.createdAt === 'object' ? where.createdAt : {}),
        lte: filters.toDate,
      };
    }

    return where;
  }

  async findByFileHash(
    fileHash: string,
    workspaceId: string
  ): Promise<Receipt | null> {
    const row = await this.prisma.receipt.findFirst({
      where: {
        fileHash,
        workspaceId,
        deletedAt: null,
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async findPendingReceipts(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Receipt>> {
    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.receipt.findMany({
          where: {
            workspaceId,
            status: ReceiptStatus.PENDING,
            deletedAt: null,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          ...page,
        }),
      () =>
        this.prisma.receipt.count({
          where: {
            workspaceId,
            status: ReceiptStatus.PENDING,
            deletedAt: null,
          },
        }),
      (row) => this.toDomain(row),
      options
    );
  }

  async findFailedReceipts(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Receipt>> {
    return PrismaRepositoryHelper.paginate(
      (page) =>
        this.prisma.receipt.findMany({
          where: {
            workspaceId,
            status: ReceiptStatus.FAILED,
            deletedAt: null,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...page,
        }),
      () =>
        this.prisma.receipt.count({
          where: {
            workspaceId,
            status: ReceiptStatus.FAILED,
            deletedAt: null,
          },
        }),
      (row) => this.toDomain(row),
      options
    );
  }

  async exists(id: ReceiptId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.receipt.count({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    });

    return count > 0;
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    return await this.prisma.receipt.count({
      where: {
        workspaceId,
        deletedAt: null,
      },
    });
  }

  async countByStatus(
    workspaceId: string,
    status: ReceiptStatus
  ): Promise<number> {
    return await this.prisma.receipt.count({
      where: {
        workspaceId,
        status,
        deletedAt: null,
      },
    });
  }

  async getStatusCounts(workspaceId: string): Promise<Record<string, number>> {
    const groups = await this.prisma.receipt.groupBy({
      by: ['status'],
      where: {
        workspaceId,
        deletedAt: null,
      },
      _count: { status: true },
    });

    const counts: Record<string, number> = {};
    for (const group of groups) {
      counts[group.status] = group._count.status;
    }
    return counts;
  }

  private toDomain(row: ReceiptModel): Receipt {
    const fileInfo = FileInfo.create({
      fileName: row.fileName,
      originalName: row.originalName,
      filePath: row.filePath,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      fileHash: row.fileHash ?? undefined,
    });

    const storageLocation = StorageLocation.create({
      provider: row.storageProvider as StorageProvider,
      bucket: row.storageBucket ?? undefined,
      key: row.storageKey ?? undefined,
    });

    return Receipt.fromPersistence({
      id: ReceiptId.fromString(row.id),
      version: row.version,
      workspaceId: row.workspaceId,
      expenseId: row.expenseId ?? undefined,
      userId: row.userId,
      fileInfo,
      receiptType: row.receiptType as ReceiptType,
      status: row.status as ReceiptStatus,
      storageLocation,
      thumbnailPath: row.thumbnailPath ?? undefined,
      ocrText: row.ocrText ?? undefined,
      ocrConfidence: row.ocrConfidence ?? undefined,
      processedAt: row.processedAt ?? undefined,
      failureReason: row.failureReason ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? undefined,
    });
  }
  async deleteWithDependencies(
    id: ReceiptId,
    workspaceId: string
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.receipt.findUnique({
        where: { id: id.getValue(), workspaceId },
      });
      if (!row) throw new ReceiptNotFoundError(id.getValue(), workspaceId);
      const context = { workspaceId, userId: row.userId, receiptId: row.id };
      if (row.storageKey)
        await tx.outboxEvent.create({
          data: {
            id: randomUUID(),
            aggregateId: row.id,
            aggregateType: 'Receipt',
            eventType: 'ReceiptFileDeletionRequested',
            status: 'PENDING',
            payload: {
              ...context,
              key: row.storageKey,
              bucket: row.storageBucket ?? 'local',
              provider: row.storageProvider,
            },
          },
        });
      await tx.receipt.delete({ where: { id: row.id, workspaceId } });
      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          aggregateId: row.id,
          aggregateType: 'Receipt',
          eventType: 'ReceiptDeleted',
          status: 'PENDING',
          payload: context,
        },
      });
    });
  }
}
