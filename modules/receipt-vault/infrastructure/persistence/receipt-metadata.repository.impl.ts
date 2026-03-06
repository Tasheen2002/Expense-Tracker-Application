import { PrismaClient, Prisma } from "@prisma/client";
import {
  ReceiptMetadata,
  LineItem,
} from "../../domain/entities/receipt-metadata.entity";
import { MetadataId } from "../../domain/value-objects/metadata-id";
import { ReceiptId } from "../../domain/value-objects/receipt-id";
import { IReceiptMetadataRepository } from "../../domain/repositories/receipt-metadata.repository";

export class ReceiptMetadataRepositoryImpl implements IReceiptMetadataRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(metadata: ReceiptMetadata): Promise<void> {
    await this.prisma.receiptMetadata.upsert({
      where: { id: metadata.getId().getValue() },
      create: {
        id: metadata.getId().getValue(),
        receiptId: metadata.getReceiptId().getValue(),
        merchantName: metadata.getMerchantName(),
        merchantAddress: metadata.getMerchantAddress(),
        merchantPhone: metadata.getMerchantPhone(),
        merchantTaxId: metadata.getMerchantTaxId(),
        transactionDate: metadata.getTransactionDate(),
        transactionTime: metadata.getTransactionTime(),
        subtotal: metadata.getSubtotal(),
        taxAmount: metadata.getTaxAmount(),
        tipAmount: metadata.getTipAmount(),
        totalAmount: metadata.getTotalAmount(),
        currency: metadata.getCurrency(),
        paymentMethod: metadata.getPaymentMethod(),
        lastFourDigits: metadata.getLastFourDigits(),
        invoiceNumber: metadata.getInvoiceNumber(),
        poNumber: metadata.getPoNumber(),
        lineItems: metadata.getLineItems() as unknown as Prisma.InputJsonValue,
        notes: metadata.getNotes(),
        customFields:
          metadata.getCustomFields() as unknown as Prisma.InputJsonValue,
        createdAt: metadata.getCreatedAt(),
        updatedAt: metadata.getUpdatedAt(),
      },
      update: {
        merchantName: metadata.getMerchantName(),
        merchantAddress: metadata.getMerchantAddress(),
        merchantPhone: metadata.getMerchantPhone(),
        merchantTaxId: metadata.getMerchantTaxId(),
        transactionDate: metadata.getTransactionDate(),
        transactionTime: metadata.getTransactionTime(),
        subtotal: metadata.getSubtotal(),
        taxAmount: metadata.getTaxAmount(),
        tipAmount: metadata.getTipAmount(),
        totalAmount: metadata.getTotalAmount(),
        currency: metadata.getCurrency(),
        paymentMethod: metadata.getPaymentMethod(),
        lastFourDigits: metadata.getLastFourDigits(),
        invoiceNumber: metadata.getInvoiceNumber(),
        poNumber: metadata.getPoNumber(),
        lineItems: metadata.getLineItems() as unknown as Prisma.InputJsonValue,
        notes: metadata.getNotes(),
        customFields:
          metadata.getCustomFields() as unknown as Prisma.InputJsonValue,
        updatedAt: metadata.getUpdatedAt(),
      },
    });
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
    row: Prisma.ReceiptMetadataGetPayload<object>,
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
