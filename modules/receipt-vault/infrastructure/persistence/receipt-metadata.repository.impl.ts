import { PrismaClient, Prisma } from "@prisma/client";
import { ReceiptMetadata } from "../../domain/entities/receipt-metadata.entity";
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

  private toDomain(row: any): ReceiptMetadata {
    return ReceiptMetadata.fromPersistence({
      id: MetadataId.fromString(row.id),
      receiptId: ReceiptId.fromString(row.receiptId),
      merchantName: row.merchantName,
      merchantAddress: row.merchantAddress,
      merchantPhone: row.merchantPhone,
      merchantTaxId: row.merchantTaxId,
      transactionDate: row.transactionDate,
      transactionTime: row.transactionTime,
      subtotal: row.subtotal,
      taxAmount: row.taxAmount,
      tipAmount: row.tipAmount,
      totalAmount: row.totalAmount,
      currency: row.currency,
      paymentMethod: row.paymentMethod,
      lastFourDigits: row.lastFourDigits,
      invoiceNumber: row.invoiceNumber,
      poNumber: row.poNumber,
      lineItems: row.lineItems,
      notes: row.notes,
      customFields: row.customFields,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
