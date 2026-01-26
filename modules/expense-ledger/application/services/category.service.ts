import { CategoryRepository } from '../../domain/repositories/category.repository'
import { Category } from '../../domain/entities/category.entity'
import { CategoryId } from '../../domain/value-objects/category-id'

export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async createCategory(params: {
    workspaceId: string
    name: string
    description?: string
    color?: string
    icon?: string
  }): Promise<Category> {
    // Check if category with the same name already exists
    const existingCategory = await this.categoryRepository.findByName(
      params.name,
      params.workspaceId
    )

    if (existingCategory) {
      throw new Error('Category with this name already exists')
    }

    const category = Category.create({
      workspaceId: params.workspaceId,
      name: params.name,
      description: params.description,
      color: params.color,
      icon: params.icon,
      isActive: true,
    })

    await this.categoryRepository.save(category)

    return category
  }

  async updateCategory(
    categoryId: string,
    workspaceId: string,
    params: {
      name?: string
      description?: string
      color?: string
      icon?: string
    }
  ): Promise<Category> {
    const category = await this.categoryRepository.findById(
      CategoryId.fromString(categoryId),
      workspaceId
    )

    if (!category) {
      throw new Error('Category not found')
    }

    // Check if new name conflicts with existing category
    if (params.name && params.name !== category.name) {
      const existingCategory = await this.categoryRepository.findByName(params.name, workspaceId)
      if (existingCategory) {
        throw new Error('Category with this name already exists')
      }
      category.updateName(params.name)
    }

    if (params.description !== undefined) {
      category.updateDescription(params.description)
    }

    if (params.color !== undefined) {
      category.updateColor(params.color)
    }

    if (params.icon !== undefined) {
      category.updateIcon(params.icon)
    }

    await this.categoryRepository.update(category)

    return category
  }

  async deleteCategory(categoryId: string, workspaceId: string): Promise<void> {
    const category = await this.categoryRepository.findById(
      CategoryId.fromString(categoryId),
      workspaceId
    )

    if (!category) {
      throw new Error('Category not found')
    }

    await this.categoryRepository.delete(CategoryId.fromString(categoryId), workspaceId)
  }

  async getCategoryById(categoryId: string, workspaceId: string): Promise<Category | null> {
    return await this.categoryRepository.findById(CategoryId.fromString(categoryId), workspaceId)
  }

  async getCategoriesByWorkspace(workspaceId: string): Promise<Category[]> {
    return await this.categoryRepository.findByWorkspace(workspaceId)
  }

  async getActiveCategoriesByWorkspace(workspaceId: string): Promise<Category[]> {
    return await this.categoryRepository.findActiveByWorkspace(workspaceId)
  }

  async activateCategory(categoryId: string, workspaceId: string): Promise<Category> {
    const category = await this.categoryRepository.findById(
      CategoryId.fromString(categoryId),
      workspaceId
    )

    if (!category) {
      throw new Error('Category not found')
    }

    category.activate()

    await this.categoryRepository.update(category)

    return category
  }

  async deactivateCategory(categoryId: string, workspaceId: string): Promise<Category> {
    const category = await this.categoryRepository.findById(
      CategoryId.fromString(categoryId),
      workspaceId
    )

    if (!category) {
      throw new Error('Category not found')
    }

    category.deactivate()

    await this.categoryRepository.update(category)

    return category
  }
}
