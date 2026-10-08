import { randomUUID } from 'node:crypto';
import {
  ReceiptNotFoundError,
  ReceiptMetadataNotFoundError,
  ReceiptMetadataAlreadyExistsError,
  ReceiptMetadataWriteConflictError,
} from '../../domain/errors/receipt.errors';
import { isUniqueConstraint } from '@shared/infrastructure/persistence/constraint-errors';
import Decimal from 'decimal.js';
import { JsonValue } from '../../domain/entities/receipt-validation';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  ReceiptMetadata,
  LineItem,
} from '../../domain/entities/receipt-metadata.entity';
import { MetadataId } from '../../domain/value-objects/metadata-id';
import { ReceiptId } from '../../domain/value-objects/receipt-id';
import { IReceiptMetadataRepository } from '../../domain/repositories/receipt-metadata.repository';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';

export class ReceiptMetadataRepositoryImpl
  extends PrismaRepository<ReceiptMetadata>
  implements IReceiptMetadataRepository
{
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async save(metadata: ReceiptMetadata, workspaceId: string): Promise<void> {
    const context: Record<string, unknown> = { workspaceId };
    try {
      await this.persistWithEvents(
        metadata,
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM receipt_vault.receipts WHERE id = ${metadata.receiptId.getValue()}::uuid AND workspace_id = ${workspaceId}::uuid AND deleted_at IS NULL FOR UPDATE`;
          const parent = await tx.receipt.findFirst({
            where: {
              id: metadata.receiptId.getValue(),
              workspaceId,
              deletedAt: null,
            },
          });
          if (!parent)
            throw new ReceiptNotFoundError(
              metadata.receiptId.getValue(),
              workspaceId
            );
          context.userId = parent.userId;
          if (metadata.expectedVersion === undefined) {
            await tx.receiptMetadata.create({
              data: {
                version: 0,
                id: metadata.id.getValue(),
                receiptId: metadata.receiptId.getValue(),
                merchantName: metadata.merchantName,
                merchantAddress: metadata.merchantAddress,
                merchantPhone: metadata.merchantPhone,
                merchantTaxId: metadata.merchantTaxId,
                transactionDate: metadata.transactionDate,
                transactionTime: metadata.transactionTime,
                subtotal: metadata.subtotal,
                taxAmount: metadata.taxAmount,
                tipAmount: metadata.tipAmount,
                totalAmount: metadata.totalAmount,
                currency: metadata.currency,
                paymentMethod: metadata.paymentMethod,
                lastFourDigits: metadata.lastFourDigits,
                invoiceNumber: metadata.invoiceNumber,
                poNumber: metadata.poNumber,
                lineItems:
                  metadata.lineItems as unknown as Prisma.InputJsonValue,
                notes: metadata.notes,
                customFields:
                  metadata.customFields as unknown as Prisma.InputJsonValue,
                createdAt: metadata.createdAt,
                updatedAt: metadata.updatedAt,
              },
            });
          } else {
            const result = await tx.receiptMetadata.updateMany({
              where: {
                id: metadata.id.getValue(),
                receiptId: metadata.receiptId.getValue(),
                receipt: { workspaceId },
                version: metadata.expectedVersion,
              },
              data: {
                version: { increment: 1 },
                merchantName: metadata.merchantName ?? null,
                merchantAddress: metadata.merchantAddress ?? null,
                merchantPhone: metadata.merchantPhone ?? null,
                merchantTaxId: metadata.merchantTaxId ?? null,
                transactionDate: metadata.transactionDate ?? null,
                transactionTime: metadata.transactionTime ?? null,
                subtotal: metadata.subtotal ?? null,
                taxAmount: metadata.taxAmount ?? null,
                tipAmount: metadata.tipAmount ?? null,
                totalAmount: metadata.totalAmount ?? null,
                currency: metadata.currency ?? null,
                paymentMethod: metadata.paymentMethod ?? null,
                lastFourDigits: metadata.lastFourDigits ?? null,
                invoiceNumber: metadata.invoiceNumber ?? null,
                poNumber: metadata.poNumber ?? null,
                lineItems:
                  metadata.lineItems === undefined
                    ? Prisma.DbNull
                    : (metadata.lineItems as unknown as Prisma.InputJsonValue),
                notes: metadata.notes ?? null,
                customFields:
                  metadata.customFields === undefined
                    ? Prisma.DbNull
                    : (metadata.customFields as unknown as Prisma.InputJsonValue),
                updatedAt: metadata.updatedAt,
              },
            });
            if (result.count !== 1)
              throw new ReceiptMetadataWriteConflictError(
                metadata.id.getValue()
              );
          }
        },
        context
      );
      metadata.acknowledgePersistence();
    } catch (error) {
      if (
        isUniqueConstraint(
          error,
          'receipt_id',
          'receipt_metadata_receipt_id_key'
        )
      )
        throw new ReceiptMetadataAlreadyExistsError(
          metadata.receiptId.getValue()
        );
      throw error;
    }
  }

  async findById(
    id: MetadataId,
    workspaceId: string
  ): Promise<ReceiptMetadata | null> {
    const row = await this.prisma.receiptMetadata.findUnique({
      where: { id: id.getValue(), receipt: { workspaceId } },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByReceiptId(
    receiptId: ReceiptId,
    workspaceId: string
  ): Promise<ReceiptMetadata | null> {
    const row = await this.prisma.receiptMetadata.findUnique({
      where: { receiptId: receiptId.getValue(), receipt: { workspaceId } },
    });

    return row ? this.toDomain(row) : null;
  }

  async delete(id: MetadataId, workspaceId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.receiptMetadata.findFirst({
        where: { id: id.getValue(), receipt: { workspaceId } },
        include: { receipt: true },
      });
      if (!row) throw new ReceiptMetadataNotFoundError(id.getValue());
      await tx.receiptMetadata.delete({
        where: { id: row.id, receipt: { workspaceId } },
      });
      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          aggregateId: row.id,
          aggregateType: 'ReceiptMetadata',
          eventType: 'ReceiptMetadataDeleted',
          status: 'PENDING',
          payload: {
            metadataId: row.id,
            receiptId: row.receiptId,
            workspaceId,
            userId: row.receipt.userId,
          },
        },
      });
    });
  }
  async deleteByReceiptId(
    receiptId: ReceiptId,
    workspaceId: string
  ): Promise<void> {
    const metadata = await this.findByReceiptId(receiptId, workspaceId);
    if (metadata) await this.delete(metadata.id, workspaceId);
  }

  async exists(id: MetadataId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.receiptMetadata.count({
      where: { id: id.getValue(), receipt: { workspaceId } },
    });

    return count > 0;
  }

  private toDomain(
    row: Prisma.ReceiptMetadataGetPayload<object>
  ): ReceiptMetadata {
    return ReceiptMetadata.fromPersistence({
      id: MetadataId.fromString(row.id),
      version: row.version,
      receiptId: ReceiptId.fromString(row.receiptId),
      merchantName: row.merchantName ?? undefined,
      merchantAddress: row.merchantAddress ?? undefined,
      merchantPhone: row.merchantPhone ?? undefined,
      merchantTaxId: row.merchantTaxId ?? undefined,
      transactionDate: row.transactionDate ?? undefined,
      transactionTime: row.transactionTime ?? undefined,
      subtotal:
        row.subtotal === null
          ? undefined
          : new Decimal(row.subtotal.toString()),
      taxAmount:
        row.taxAmount === null
          ? undefined
          : new Decimal(row.taxAmount.toString()),
      tipAmount:
        row.tipAmount === null
          ? undefined
          : new Decimal(row.tipAmount.toString()),
      totalAmount:
        row.totalAmount === null
          ? undefined
          : new Decimal(row.totalAmount.toString()),
      currency: row.currency ?? undefined,
      paymentMethod: row.paymentMethod ?? undefined,
      lastFourDigits: row.lastFourDigits ?? undefined,
      invoiceNumber: row.invoiceNumber ?? undefined,
      poNumber: row.poNumber ?? undefined,
      lineItems: (row.lineItems as LineItem[] | null) ?? undefined,
      notes: row.notes ?? undefined,
      customFields:
        (row.customFields as Record<string, JsonValue> | null) ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
