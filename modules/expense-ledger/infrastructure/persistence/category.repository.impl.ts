import { PrismaClient } from '@prisma/client'
import { CategoryRepository } from '../../domain/repositories/category.repository'
import { Category } from '../../domain/entities/category.entity'
import { CategoryId } from '../../domain/value-objects/category-id'

export class CategoryRepositoryImpl implements CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(category: Category): Promise<void> {
    await this.prisma.category.create({
      data: {
        id: category.id.getValue(),
        workspaceId: category.workspaceId,
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        isActive: category.isActive,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    })
  }

  async update(category: Category): Promise<void> {
    await this.prisma.category.update({
      where: {
        id: category.id.getValue(),
        workspaceId: category.workspaceId,
      },
      data: {
        name: category.name,
        description: category.description,
        color: category.color,
        icon: category.icon,
        isActive: category.isActive,
        updatedAt: category.updatedAt,
      },
    })
  }

  async findById(id: CategoryId, workspaceId: string): Promise<Category | null> {
    const category = await this.prisma.category.findUnique({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    })

    if (!category) return null

    return this.toDomain(category)
  }

  async findByName(name: string, workspaceId: string): Promise<Category | null> {
    const category = await this.prisma.category.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
    })

    if (!category) return null

    return this.toDomain(category)
  }

  async findByWorkspace(workspaceId: string): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    })

    return categories.map((category) => this.toDomain(category))
  }

  async findActiveByWorkspace(workspaceId: string): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    })

    return categories.map((category) => this.toDomain(category))
  }

  async delete(id: CategoryId, workspaceId: string): Promise<void> {
    await this.prisma.category.delete({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    })
  }

  async exists(id: CategoryId, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: {
        id: id.getValue(),
        workspaceId,
      },
    })
    return count > 0
  }

  async existsByName(name: string, workspaceId: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: {
        name,
        workspaceId,
      },
    })
    return count > 0
  }

  private toDomain(data: any): Category {
    return Category.fromPersistence({
      id: CategoryId.fromString(data.id),
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
  }
}
