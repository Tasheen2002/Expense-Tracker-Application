import { IReceiptTagDefinitionRepository } from "../../domain/repositories/receipt-tag-definition.repository";
import { IReceiptTagRepository } from "../../domain/repositories/receipt-tag.repository";
import { ReceiptTagDefinition } from "../../domain/entities/receipt-tag-definition.entity";
import { TagId } from "../../domain/value-objects/tag-id";
import {
  ReceiptTagNotFoundError,
  DuplicateTagNameError,
} from "../../domain/errors/receipt.errors";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class TagService {
  constructor(
    private readonly tagDefinitionRepository: IReceiptTagDefinitionRepository,
    private readonly tagRepository: IReceiptTagRepository,
  ) {}

  async createTag(params: {
    workspaceId: string;
    name: string;
    color?: string;
    description?: string;
  }): Promise<ReceiptTagDefinition> {
    // Check if tag with same name already exists
    const existing = await this.tagDefinitionRepository.findByName(
      params.name,
      params.workspaceId,
    );

    if (existing) {
      throw new DuplicateTagNameError(params.name, params.workspaceId);
    }

    const tag = ReceiptTagDefinition.create({
      workspaceId: params.workspaceId,
      name: params.name,
      color: params.color,
      description: params.description,
    });

    await this.tagDefinitionRepository.save(tag);

    return tag;
  }

  async updateTag(
    tagId: string,
    workspaceId: string,
    updates: {
      name?: string;
      color?: string;
      description?: string;
    },
  ): Promise<ReceiptTagDefinition> {
    const tag = await this.tagDefinitionRepository.findById(
      TagId.fromString(tagId),
      workspaceId,
    );

    if (!tag) {
      throw new ReceiptTagNotFoundError(tagId, workspaceId);
    }

    // Check name uniqueness if name is being updated
    if (updates.name && updates.name !== tag.getName()) {
      const existing = await this.tagDefinitionRepository.findByName(
        updates.name,
        workspaceId,
      );

      if (existing) {
        throw new DuplicateTagNameError(updates.name, workspaceId);
      }

      tag.updateName(updates.name);
    }

    if (updates.color !== undefined) {
      tag.updateColor(updates.color);
    }

    if (updates.description !== undefined) {
      tag.updateDescription(updates.description);
    }

    await this.tagDefinitionRepository.save(tag);

    return tag;
  }

  async deleteTag(tagId: string, workspaceId: string): Promise<void> {
    const tagIdObj = TagId.fromString(tagId);

    const exists = await this.tagDefinitionRepository.exists(
      tagIdObj,
      workspaceId,
    );

    if (!exists) {
      throw new ReceiptTagNotFoundError(tagId, workspaceId);
    }

    // Note: Cascade delete will handle receipt_tags table
    await this.tagDefinitionRepository.delete(tagIdObj, workspaceId);
  }

  async getTag(
    tagId: string,
    workspaceId: string,
  ): Promise<ReceiptTagDefinition | null> {
    return await this.tagDefinitionRepository.findById(
      TagId.fromString(tagId),
      workspaceId,
    );
  }

  async getTagsByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ReceiptTagDefinition>> {
    return await this.tagDefinitionRepository.findByWorkspace(
      workspaceId,
      options,
    );
  }

  async getTagByName(
    name: string,
    workspaceId: string,
  ): Promise<ReceiptTagDefinition | null> {
    return await this.tagDefinitionRepository.findByName(name, workspaceId);
  }
}
