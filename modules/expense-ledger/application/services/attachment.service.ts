import { AttachmentRepository } from '../../domain/repositories/attachment.repository'
import { ExpenseRepository } from '../../domain/repositories/expense.repository'
import { Attachment } from '../../domain/entities/attachment.entity'
import { AttachmentId } from '../../domain/value-objects/attachment-id'
import { ExpenseId } from '../../domain/value-objects/expense-id'

export class AttachmentService {
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly expenseRepository: ExpenseRepository
  ) {}

  async createAttachment(params: {
    expenseId: string
    workspaceId: string
    fileName: string
    filePath: string
    fileSize: number
    mimeType: string
    uploadedBy: string
  }): Promise<Attachment> {
    // Verify expense exists
    const expense = await this.expenseRepository.findById(
      ExpenseId.fromString(params.expenseId),
      params.workspaceId
    )

    if (!expense) {
      throw new Error('Expense not found')
    }

    // Check if expense can be edited
    if (!expense.canBeEdited()) {
      throw new Error('Cannot add attachments to expense in its current status')
    }

    // Check total attachment size limit (e.g., 50MB per expense)
    const currentTotalSize = await this.attachmentRepository.getTotalSizeByExpense(
      params.expenseId
    )
    const maxTotalSize = 50 * 1024 * 1024 // 50MB
    if (currentTotalSize + params.fileSize > maxTotalSize) {
      throw new Error('Total attachment size exceeds 50MB limit')
    }

    const attachment = Attachment.create({
      expenseId: params.expenseId,
      fileName: params.fileName,
      filePath: params.filePath,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      uploadedBy: params.uploadedBy,
    })

    await this.attachmentRepository.save(attachment)

    // Add attachment to expense
    expense.addAttachment(attachment.id)
    await this.expenseRepository.update(expense)

    return attachment
  }

  async deleteAttachment(
    attachmentId: string,
    expenseId: string,
    workspaceId: string
  ): Promise<void> {
    const attachment = await this.attachmentRepository.findById(AttachmentId.fromString(attachmentId))

    if (!attachment) {
      throw new Error('Attachment not found')
    }

    // Verify attachment belongs to the specified expense
    if (attachment.expenseId !== expenseId) {
      throw new Error('Attachment not found')
    }

    // Verify expense exists
    const expense = await this.expenseRepository.findById(
      ExpenseId.fromString(expenseId),
      workspaceId
    )

    if (!expense) {
      throw new Error('Expense not found')
    }

    // Check if expense can be edited
    if (!expense.canBeEdited()) {
      throw new Error('Cannot delete attachments from expense in its current status')
    }

    // Remove attachment from expense
    expense.removeAttachment(AttachmentId.fromString(attachmentId))
    await this.expenseRepository.update(expense)

    await this.attachmentRepository.delete(AttachmentId.fromString(attachmentId))
  }

  async getAttachmentById(attachmentId: string): Promise<Attachment | null> {
    return await this.attachmentRepository.findById(AttachmentId.fromString(attachmentId))
  }

  async getAttachmentsByExpense(expenseId: string): Promise<Attachment[]> {
    return await this.attachmentRepository.findByExpense(expenseId)
  }

  async getTotalSizeByExpense(expenseId: string): Promise<number> {
    return await this.attachmentRepository.getTotalSizeByExpense(expenseId)
  }
}
