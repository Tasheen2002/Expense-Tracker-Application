import { PrismaClient } from '@prisma/client'
import { ExpenseRepository, ExpenseFilters } from '../../domain/repositories/expense.repository'
import { Expense } from '../../domain/entities/expense.entity'
import { ExpenseId } from '../../domain/value-objects/expense-id'
import { CategoryId } from '../../domain/value-objects/category-id'
import { TagId } from '../../domain/value-objects/tag-id'
import { AttachmentId } from '../../domain/value-objects/attachment-id'
import { Money } from '../../domain/value-objects/money'
import { ExpenseDate } from '../../domain/value-objects/expense-date'
import { ExpenseStatus } from '../../domain/enums/expense-status'
import { PaymentMethod } from '../../domain/enums/payment-method'

export class ExpenseRepositoryImpl implements ExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(expense: Expense): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Create expense
      await tx.expense.create({
        data: {
          id: expense.id.getValue(),
          workspaceId: expense.workspaceId,
          userId: expense.userId,
          title: expense.title,
          description: expense.description,
          amount: expense.amount.getAmount(),
          currency: expense.amount.getCurrency(),
          expenseDate: expense.expenseDate.getValue(),
          categoryId: expense.categoryId?.getValue(),
          merchant: expense.merchant,
          paymentMethod: expense.paymentMethod,
          isReimbursable: expense.isReimbursable,
          status: expense.status,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt,
        },
      })

      // Save expense-tag relations
      if (expense.tagIds.length > 0) {
        await tx.expenseTag.createMany({
          data: expense.tagIds.map((tagId) => ({
            expenseId: expense.id.getValue(),
            tagId: tagId.getValue(),
          })),
        })
      }
    })
  }

  async update(expense: Expense): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Update expense
      await tx.expense.update({
        where: {
          id: expense.id.getValue(),
          workspaceId: expense.workspaceId,
        },
        data: {
          title: expense.title,
          description: expense.description,
          amount: expense.amount.getAmount(),
          currency: expense.amount.getCurrency(),
          expenseDate: expense.expenseDate.getValue(),
          categoryId: expense.categoryId?.getValue(),
          merchant: expense.merchant,
          paymentMethod: expense.paymentMethod,
          isReimbursable: expense.isReimbursable,
          status: expense.status,
          updatedAt: expense.updatedAt,
        },
      })

      // Optimize tag updates: only modify changed tags
      const expenseIdValue = expense.id.getValue()
      const newTagIds = new Set(expense.tagIds.map((id) => id.getValue()))

      // Get existing tag relations
      const existingTags = await tx.expenseTag.findMany({
        where: { expenseId: expenseIdValue },
        select: { tagId: true },
      })
      const existingTagIds = new Set(existingTags.map((t) => t.tagId))

      // Find tags to delete (in existing but not in new)
      const tagsToDelete = Array.from(existingTagIds).filter((id) => !newTagIds.has(id))
      if (tagsToDelete.length > 0) {
        await tx.expenseTag.deleteMany({
          where: {
            expenseId: expenseIdValue,
            tagId: { in: tagsToDelete },
          },
        })
      }

      // Find tags to add (in new but not in existing)
      const tagsToAdd = Array.from(newTagIds).filter((id) => !existingTagIds.has(id))
      if (tagsToAdd.length > 0) {
        await tx.expenseTag.createMany({
          data: tagsToAdd.map((tagId) => ({
            expenseId: expenseIdValue,
            tagId,
          })),
        })
      }
    })
  }

  async findById(id: ExpenseId, workspaceId: string): Promise<Expense | null> {
    const expense = await this.prisma.expense.findUnique({
      where: {
        id: id.getValue(),
        workspaceId,
      },
      include: {
        tags: true,
        attachments: true,
      },
    })

    if (!expense) return null

    return this.toDomain(expense)
  }

  async findByWorkspace(workspaceId: string): Promise<Expense[]> {
    const expenses = await this.prisma.expense.findMany({
      where: { workspaceId },
      include: {
        tags: true,
        attachments: true,
      },
      orderBy: { expenseDate: 'desc' },
    })

    return expenses.map((expense) => this.toDomain(expense))
  }

  async findByUser(userId: string, workspaceId: string): Promise<Expense[]> {
    const expenses = await this.prisma.expense.findMany({
      where: { userId, workspaceId },
      include: {
        tags: true,
        attachments: true,
      },
      orderBy: { expenseDate: 'desc' },
    })

    return expenses.map((expense) => this.toDomain(expense))
  }

  async findByCategory(categoryId: CategoryId, workspaceId: string): Promise<Expense[]> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        categoryId: categoryId.getValue(),
        workspaceId,
      },
      include: {
        tags: true,
        attachments: true,
      },
      orderBy: { expenseDate: 'desc' },
    })

    return expenses.map((expense) => this.toDomain(expense))
  }

  async findByStatus(status: ExpenseStatus, workspaceId: string): Promise<Expense[]> {
    const expenses = await this.prisma.expense.findMany({
      where: { status, workspaceId },
      include: {
        tags: true,
        attachments: true,
      },
      orderBy: { expenseDate: 'desc' },
    })

    return expenses.map((expense) => this.toDomain(expense))
  }

  async findWithFilters(filters: ExpenseFilters): Promise<Expense[]> {
    const where: any = {
      workspaceId: filters.workspaceId,
    }

    if (filters.userId) where.userId = filters.userId
    if (filters.categoryId) where.categoryId = filters.categoryId
    if (filters.status) where.status = filters.status
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod
    if (filters.isReimbursable !== undefined) where.isReimbursable = filters.isReimbursable
    if (filters.currency) where.currency = filters.currency

    if (filters.startDate || filters.endDate) {
      where.expenseDate = {}
      if (filters.startDate) where.expenseDate.gte = filters.startDate
      if (filters.endDate) where.expenseDate.lte = filters.endDate
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where.amount = {}
      if (filters.minAmount !== undefined) where.amount.gte = filters.minAmount
      if (filters.maxAmount !== undefined) where.amount.lte = filters.maxAmount
    }

    if (filters.searchText) {
      where.OR = [
        { title: { contains: filters.searchText, mode: 'insensitive' } },
        { description: { contains: filters.searchText, mode: 'insensitive' } },
        { merchant: { contains: filters.searchText, mode: 'insensitive' } },
      ]
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      include: {
        tags: true,
        attachments: true,
      },
      orderBy: { expenseDate: 'desc' },
    })

    return expenses.map((expense) => this.toDomain(expense))
  }

  async delete(id: ExpenseId, workspaceId: string): Promise<void> {
    await this.prisma.expense.delete({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    })
  }

  async exists(id: ExpenseId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.expense.count({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    })
    return count > 0
  }

  async getTotalByWorkspace(workspaceId: string, currency?: string): Promise<number> {
    // Currency is required to prevent summing different currencies together
    if (!currency) {
      throw new Error('Currency is required for financial aggregations to prevent mixing currencies')
    }

    const result = await this.prisma.expense.aggregate({
      where: {
        workspaceId,
        currency,
      },
      _sum: {
        amount: true,
      },
    })

    return result._sum.amount ? Number(result._sum.amount) : 0
  }

  async getTotalByUser(userId: string, workspaceId: string, currency?: string): Promise<number> {
    // Currency is required to prevent summing different currencies together
    if (!currency) {
      throw new Error('Currency is required for financial aggregations to prevent mixing currencies')
    }

    const result = await this.prisma.expense.aggregate({
      where: {
        userId,
        workspaceId,
        currency,
      },
      _sum: {
        amount: true,
      },
    })

    return result._sum.amount ? Number(result._sum.amount) : 0
  }

  async getTotalByCategory(
    categoryId: CategoryId,
    workspaceId: string,
    currency?: string
  ): Promise<number> {
    // Currency is required to prevent summing different currencies together
    if (!currency) {
      throw new Error('Currency is required for financial aggregations to prevent mixing currencies')
    }

    const result = await this.prisma.expense.aggregate({
      where: {
        categoryId: categoryId.getValue(),
        workspaceId,
        currency,
      },
      _sum: {
        amount: true,
      },
    })

    return result._sum.amount ? Number(result._sum.amount) : 0
  }

  async getCountByStatus(status: ExpenseStatus, workspaceId: string): Promise<number> {
    return await this.prisma.expense.count({
      where: { status, workspaceId },
    })
  }

  private toDomain(data: any): Expense {
    return Expense.fromPersistence({
      id: ExpenseId.fromString(data.id),
      workspaceId: data.workspaceId,
      userId: data.userId,
      title: data.title,
      description: data.description,
      amount: Money.create(data.amount, data.currency),
      expenseDate: ExpenseDate.create(data.expenseDate),
      categoryId: data.categoryId ? CategoryId.fromString(data.categoryId) : undefined,
      merchant: data.merchant,
      paymentMethod: data.paymentMethod as PaymentMethod,
      isReimbursable: data.isReimbursable,
      status: data.status as ExpenseStatus,
      tagIds: data.tags ? data.tags.map((tag: any) => TagId.fromString(tag.tagId)) : [],
      attachmentIds: data.attachments
        ? data.attachments.map((att: any) => AttachmentId.fromString(att.id))
        : [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  }
}
