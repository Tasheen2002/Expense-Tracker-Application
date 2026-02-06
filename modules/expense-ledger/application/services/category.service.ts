import { CategoryRepository } from "../../domain/repositories/category.repository";
import { Category } from "../../domain/entities/category.entity";
import { CategoryId } from "../../domain/value-objects/category-id";
import {
  CategoryNotFoundError,
  CategoryAlreadyExistsError,
} from "../../domain/errors/expense.errors";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async createCategory(params: {
    workspaceId: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<Category> {
    // Check if category with the same name already exists
    const existingCategory = await this.categoryRepository.findByName(
      params.name,
      params.workspaceId,
    );

    if (existingCategory) {
      throw new CategoryAlreadyExistsError(params.name, params.workspaceId);
    }

    const category = Category.create({
      workspaceId: params.workspaceId,
      name: params.name,
      description: params.description,
      color: params.color,
      icon: params.icon,
      isActive: true,
    });

    await this.categoryRepository.save(category);

    return category;
  }

  async updateCategory(
    categoryId: string,
    workspaceId: string,
    params: {
      name?: string;
      description?: string;
      color?: string;
      icon?: string;
    },
  ): Promise<Category> {
    const category = await this.categoryRepository.findById(
      CategoryId.fromString(categoryId),
      workspaceId,
    );

    if (!category) {
      throw new CategoryNotFoundError(categoryId, workspaceId);
    }

    // Check if new name conflicts with existing category
    if (params.name && params.name !== category.name) {
      const existingCategory = await this.categoryRepository.findByName(
        params.name,
        workspaceId,
      );
      if (existingCategory) {
        throw new CategoryAlreadyExistsError(params.name, workspaceId);
      }
      category.updateName(params.name);
    }

    if (params.description !== undefined) {
      category.updateDescription(params.description);
    }

    if (params.color !== undefined) {
      category.updateColor(params.color);
    }

    if (params.icon !== undefined) {
      category.updateIcon(params.icon);
    }

    await this.categoryRepository.update(category);

    return category;
  }

  async deleteCategory(categoryId: string, workspaceId: string): Promise<void> {
    const category = await this.categoryRepository.findById(
      CategoryId.fromString(categoryId),
      workspaceId,
    );

    if (!category) {
      throw new CategoryNotFoundError(categoryId, workspaceId);
    }

    await this.categoryRepository.delete(
      CategoryId.fromString(categoryId),
      workspaceId,
    );
  }

  async getCategoryById(
    categoryId: string,
    workspaceId: string,
  ): Promise<Category | null> {
    return await this.categoryRepository.findById(
      CategoryId.fromString(categoryId),
      workspaceId,
    );
  }

  async getCategoriesByWorkspace(
    workspaceId: string,
  ): Promise<PaginatedResult<Category>> {
    return await this.categoryRepository.findByWorkspace(workspaceId);
  }

  async getActiveCategoriesByWorkspace(
    workspaceId: string,
  ): Promise<PaginatedResult<Category>> {
    return await this.categoryRepository.findActiveByWorkspace(workspaceId);
  }

  async activateCategory(
    categoryId: string,
    workspaceId: string,
  ): Promise<Category> {
    const category = await this.categoryRepository.findById(
      CategoryId.fromString(categoryId),
      workspaceId,
    );

    if (!category) {
      throw new CategoryNotFoundError(categoryId, workspaceId);
    }

    category.activate();

    await this.categoryRepository.update(category);

    return category;
  }

  async deactivateCategory(
    categoryId: string,
    workspaceId: string,
  ): Promise<Category> {
    const category = await this.categoryRepository.findById(
      CategoryId.fromString(categoryId),
      workspaceId,
    );

    if (!category) {
      throw new CategoryNotFoundError(categoryId, workspaceId);
    }

    category.deactivate();

    await this.categoryRepository.update(category);

    return category;
  }
}
