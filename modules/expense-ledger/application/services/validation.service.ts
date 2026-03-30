import { CategoryRepository } from "../../domain/repositories/category.repository";
import { TagRepository } from "../../domain/repositories/tag.repository";
import { CategoryId } from "../../domain/value-objects/category-id";
import { TagId } from "../../domain/value-objects/tag-id";
import {
  CategoryNotFoundError,
  TagNotFoundError,
} from "../../domain/errors/expense.errors";

/**
 * Validation Service for cross-entity validation in command handlers
 * Keeps services focused on their own concerns
 */
export class ValidationService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly tagRepository: TagRepository,
  ) {}

  /**
   * Validate that a category exists in the workspace
   */
  async validateCategoryExists(
    categoryId: string,
    workspaceId: string,
  ): Promise<void> {
    const exists = await this.categoryRepository.exists(
      CategoryId.fromString(categoryId),
      workspaceId,
    );
    if (!exists) {
      throw new CategoryNotFoundError(categoryId, workspaceId);
    }
  }

  /**
   * Validate that a tag exists in the workspace
   */
  async validateTagExists(
    tagId: string,
    workspaceId: string,
  ): Promise<void> {
    const exists = await this.tagRepository.exists(
      TagId.fromString(tagId),
      workspaceId,
    );
    if (!exists) {
      throw new TagNotFoundError(tagId, workspaceId);
    }
  }

  /**
   * Validate that all provided tags exist in the workspace
   * Also deduplicates tag IDs
   */
  async validateTagsExist(
    tagIds: string[],
    workspaceId: string,
  ): Promise<string[]> {
    if (!tagIds || tagIds.length === 0) {
      return [];
    }

    // Deduplicate
    const uniqueTagIds = Array.from(new Set(tagIds));
    
    // Validate all exist
    const tagIdObjects = uniqueTagIds.map((id) => TagId.fromString(id));
    const tags = await this.tagRepository.findByIds(
      tagIdObjects,
      workspaceId,
    );
    
    if (tags.length !== uniqueTagIds.length) {
      throw new TagNotFoundError("one_or_more", workspaceId);
    }

    return uniqueTagIds;
  }
}
