import { PrismaClient, Receipt as ReceiptModel } from "@prisma/client";
import { Receipt } from "../../domain/entities/receipt.entity";
import { ReceiptId } from "../../domain/value-objects/receipt-id";
import { FileInfo } from "../../domain/value-objects/file-info";
import { StorageLocation } from "../../domain/value-objects/storage-location";
import {
  IReceiptRepository,
  ReceiptFilters,
} from "../../domain/repositories/receipt.repository";
import { ReceiptStatus } from "../../domain/enums/receipt-status";
import { ReceiptType } from "../../domain/enums/receipt-type";
import { StorageProvider } from "../../domain/enums/storage-provider";

export class ReceiptRepositoryImpl implements IReceiptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(receipt: Receipt): Promise<void> {
    const fileInfo = receipt.getFileInfo();
    const storageLocation = receipt.getStorageLocation();

    await this.prisma.receipt.upsert({
      where: { id: receipt.getId().getValue() },
      create: {
        id: receipt.getId().getValue(),
        workspaceId: receipt.getWorkspaceId(),
        expenseId: receipt.getExpenseId(),
        userId: receipt.getUserId(),
        fileName: fileInfo.getFileName(),
        originalName: fileInfo.getOriginalName(),
        filePath: fileInfo.getFilePath(),
        fileSize: fileInfo.getFileSize(),
        mimeType: fileInfo.getMimeType(),
        fileHash: fileInfo.getFileHash(),
        receiptType: receipt.getReceiptType(),
        status: receipt.getStatus(),
        storageProvider: storageLocation.getProvider(),
        storageBucket: storageLocation.getBucket(),
        storageKey: storageLocation.getKey(),
        thumbnailPath: receipt.getThumbnailPath(),
        ocrText: receipt.getOcrText(),
        ocrConfidence: receipt.getOcrConfidence(),
        processedAt: receipt.getProcessedAt(),
        failureReason: receipt.getFailureReason(),
        createdAt: receipt.getCreatedAt(),
        updatedAt: receipt.getUpdatedAt(),
        deletedAt: receipt.getDeletedAt(),
      },
      update: {
        expenseId: receipt.getExpenseId(),
        fileName: fileInfo.getFileName(),
        filePath: fileInfo.getFilePath(),
        receiptType: receipt.getReceiptType(),
        status: receipt.getStatus(),
        thumbnailPath: receipt.getThumbnailPath(),
        ocrText: receipt.getOcrText(),
        ocrConfidence: receipt.getOcrConfidence(),
        processedAt: receipt.getProcessedAt(),
        failureReason: receipt.getFailureReason(),
        updatedAt: receipt.getUpdatedAt(),
        deletedAt: receipt.getDeletedAt(),
      },
    });
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
  ): Promise<Receipt[]> {
    const rows = await this.prisma.receipt.findMany({
      where: {
        expenseId,
        workspaceId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async findByWorkspace(workspaceId: string): Promise<Receipt[]> {
    const rows = await this.prisma.receipt.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async findByUserId(userId: string, workspaceId: string): Promise<Receipt[]> {
    const rows = await this.prisma.receipt.findMany({
      where: {
        userId,
        workspaceId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async findByFilters(filters: ReceiptFilters): Promise<Receipt[]> {
    const where = this.buildWhereClause(filters);

    const rows = await this.prisma.receipt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    });

    return rows.map((row) => this.toDomain(row));
  }

  async countByFilters(filters: ReceiptFilters): Promise<number> {
    const where = this.buildWhereClause(filters);

    return await this.prisma.receipt.count({ where });
  }

  private buildWhereClause(filters: ReceiptFilters): any {
    const where: any = {
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
      where.expenseId = filters.isLinked ? { not: null } : null;
    }

    if (filters.isDeleted !== undefined) {
      where.deletedAt = filters.isDeleted ? { not: null } : null;
    } else {
      where.deletedAt = null;
    }

    if (filters.fromDate) {
      where.createdAt = { ...where.createdAt, gte: filters.fromDate };
    }

    if (filters.toDate) {
      where.createdAt = { ...where.createdAt, lte: filters.toDate };
    }

    return where;
  }

  async findByFileHash(
    fileHash: string,
    workspaceId: string,
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

  async findPendingReceipts(workspaceId: string): Promise<Receipt[]> {
    const rows = await this.prisma.receipt.findMany({
      where: {
        workspaceId,
        status: ReceiptStatus.PENDING,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async findFailedReceipts(workspaceId: string): Promise<Receipt[]> {
    const rows = await this.prisma.receipt.findMany({
      where: {
        workspaceId,
        status: ReceiptStatus.FAILED,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => this.toDomain(row));
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

  async delete(id: ReceiptId, workspaceId: string): Promise<void> {
    await this.prisma.receipt.delete({
      where: {
        id: id.getValue(),
      },
    });
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
    status: ReceiptStatus,
  ): Promise<number> {
    return await this.prisma.receipt.count({
      where: {
        workspaceId,
        status,
        deletedAt: null,
      },
    });
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
    workspaceId: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.receiptMetadata.deleteMany({
        where: { receiptId: id.getValue() },
      }),
      this.prisma.receiptTag.deleteMany({
        where: { receiptId: id.getValue() },
      }),
      this.prisma.receipt.delete({
        where: {
          id: id.getValue(),
          workspaceId,
        },
      }),
    ]);
  }
}
