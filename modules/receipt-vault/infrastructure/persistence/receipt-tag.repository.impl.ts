import { PrismaClient } from "@prisma/client";
import { ReceiptId } from "../../domain/value-objects/receipt-id";
import { TagId } from "../../domain/value-objects/tag-id";
import { IReceiptTagRepository } from "../../domain/repositories/receipt-tag.repository";

export class ReceiptTagRepositoryImpl implements IReceiptTagRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async addTag(receiptId: ReceiptId, tagId: TagId): Promise<void> {
    await this.prisma.receiptTag.create({
      data: {
        receiptId: receiptId.getValue(),
        tagId: tagId.getValue(),
      },
    });
  }

  async removeTag(receiptId: ReceiptId, tagId: TagId): Promise<void> {
    await this.prisma.receiptTag.delete({
      where: {
        receiptId_tagId: {
          receiptId: receiptId.getValue(),
          tagId: tagId.getValue(),
        },
      },
    });
  }

  async findTagsByReceipt(receiptId: ReceiptId): Promise<TagId[]> {
    const rows = await this.prisma.receiptTag.findMany({
      where: { receiptId: receiptId.getValue() },
      select: { tagId: true },
    });

    return rows.map((row) => TagId.fromString(row.tagId));
  }

  async removeAllTagsFromReceipt(receiptId: ReceiptId): Promise<void> {
    await this.prisma.receiptTag.deleteMany({
      where: { receiptId: receiptId.getValue() },
    });
  }

  async hasTag(receiptId: ReceiptId, tagId: TagId): Promise<boolean> {
    const count = await this.prisma.receiptTag.count({
      where: {
        receiptId: receiptId.getValue(),
        tagId: tagId.getValue(),
      },
    });

    return count > 0;
  }
}
