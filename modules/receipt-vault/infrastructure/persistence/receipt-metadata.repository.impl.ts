import { PrismaClient, Prisma } from '@prisma/client';
import {
  ReceiptMetadata,
  LineItem,
} from '../../domain/entities/receipt-metadata.entity';
import { MetadataId } from '../../domain/value-objects/metadata-id';
import { ReceiptId } from '../../domain/value-objects/receipt-id';
import { IReceiptMetadataRepository } from '../../domain/repositories/receipt-metadata.repository';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { IEventBus } from '@core/domain/events/domain-event';

export class ReceiptMetadataRepositoryImpl
  extends PrismaRepository<ReceiptMetadata>
  implements IReceiptMetadataRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(metadata: ReceiptMetadata): Promise<void> {
    await this.prisma.receiptMetadata.upsert({
      where: { id: metadata.id.getValue() },
      create: {
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
        lineItems: metadata.lineItems as unknown as Prisma.InputJsonValue,
        notes: metadata.notes,
        customFields: metadata.customFields as unknown as Prisma.InputJsonValue,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
      },
      update: {
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
        lineItems: metadata.lineItems as unknown as Prisma.InputJsonValue,
        notes: metadata.notes,
        customFields: metadata.customFields as unknown as Prisma.InputJsonValue,
        updatedAt: metadata.updatedAt,
      },
    });
    await this.dispatchEvents(metadata);
  }

  async findById(id: MetadataId): Promise<ReceiptMetadata | null> {
    const row = await this.prisma.receiptMetadata.findUnique({
      where: { id: id.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByReceiptId(receiptId: ReceiptId): Promise<ReceiptMetadata | null> {
    const row = await this.prisma.receiptMetadata.findUnique({
      where: { receiptId: receiptId.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async delete(id: MetadataId): Promise<void> {
    await this.prisma.receiptMetadata.delete({
      where: { id: id.getValue() },
    });
  }

  async deleteByReceiptId(receiptId: ReceiptId): Promise<void> {
    await this.prisma.receiptMetadata.deleteMany({
      where: { receiptId: receiptId.getValue() },
    });
  }

  async exists(id: MetadataId): Promise<boolean> {
    const count = await this.prisma.receiptMetadata.count({
      where: { id: id.getValue() },
    });

    return count > 0;
  }

  private toDomain(
    row: Prisma.ReceiptMetadataGetPayload<object>
  ): ReceiptMetadata {
    return ReceiptMetadata.fromPersistence({
      id: MetadataId.fromString(row.id),
      receiptId: ReceiptId.fromString(row.receiptId),
      merchantName: row.merchantName ?? undefined,
      merchantAddress: row.merchantAddress ?? undefined,
      merchantPhone: row.merchantPhone ?? undefined,
      merchantTaxId: row.merchantTaxId ?? undefined,
      transactionDate: row.transactionDate ?? undefined,
      transactionTime: row.transactionTime ?? undefined,
      subtotal: row.subtotal ?? undefined,
      taxAmount: row.taxAmount ?? undefined,
      tipAmount: row.tipAmount ?? undefined,
      totalAmount: row.totalAmount ?? undefined,
      currency: row.currency ?? undefined,
      paymentMethod: row.paymentMethod ?? undefined,
      lastFourDigits: row.lastFourDigits ?? undefined,
      invoiceNumber: row.invoiceNumber ?? undefined,
      poNumber: row.poNumber ?? undefined,
      lineItems: (row.lineItems as LineItem[] | null) ?? undefined,
      notes: row.notes ?? undefined,
      customFields:
        (row.customFields as Record<string, any> | null) ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
