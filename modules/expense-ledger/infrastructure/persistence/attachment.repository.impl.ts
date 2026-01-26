import { PrismaClient } from '@prisma/client'
import { AttachmentRepository } from '../../domain/repositories/attachment.repository'
import { Attachment } from '../../domain/entities/attachment.entity'
import { AttachmentId } from '../../domain/value-objects/attachment-id'

export class AttachmentRepositoryImpl implements AttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(attachment: Attachment): Promise<void> {
    await this.prisma.attachment.create({
      data: {
        id: attachment.id.getValue(),
        expenseId: attachment.expenseId,
        fileName: attachment.fileName,
        filePath: attachment.filePath,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        uploadedBy: attachment.uploadedBy,
        createdAt: attachment.createdAt,
      },
    })
  }

  async findById(id: AttachmentId): Promise<Attachment | null> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: id.getValue() },
    })

    if (!attachment) return null

    return this.toDomain(attachment)
  }

  async findByExpense(expenseId: string): Promise<Attachment[]> {
    const attachments = await this.prisma.attachment.findMany({
      where: { expenseId },
      orderBy: { createdAt: 'desc' },
    })

    return attachments.map((attachment) => this.toDomain(attachment))
  }

  async findByIds(ids: AttachmentId[]): Promise<Attachment[]> {
    const attachments = await this.prisma.attachment.findMany({
      where: {
        id: { in: ids.map((id) => id.getValue()) },
      },
    })

    return attachments.map((attachment) => this.toDomain(attachment))
  }

  async delete(id: AttachmentId): Promise<void> {
    await this.prisma.attachment.delete({
      where: { id: id.getValue() },
    })
  }

  async deleteByExpense(expenseId: string): Promise<void> {
    await this.prisma.attachment.deleteMany({
      where: { expenseId },
    })
  }

  async exists(id: AttachmentId): Promise<boolean> {
    const count = await this.prisma.attachment.count({
      where: { id: id.getValue() },
    })
    return count > 0
  }

  async getTotalSizeByExpense(expenseId: string): Promise<number> {
    const result = await this.prisma.attachment.aggregate({
      where: { expenseId },
      _sum: {
        fileSize: true,
      },
    })

    return result._sum.fileSize || 0
  }

  private toDomain(data: any): Attachment {
    return Attachment.fromPersistence({
      id: AttachmentId.fromString(data.id),
      expenseId: data.expenseId,
      fileName: data.fileName,
      filePath: data.filePath,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      uploadedBy: data.uploadedBy,
      createdAt: data.createdAt,
    })
  }
}
