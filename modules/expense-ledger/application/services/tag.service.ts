import { TagRepository } from '../../domain/repositories/tag.repository'
import { Tag } from '../../domain/entities/tag.entity'
import { TagId } from '../../domain/value-objects/tag-id'
import {
  TagNotFoundError,
  TagAlreadyExistsError,
} from '../../domain/errors/expense.errors'

export class TagService {
  constructor(private readonly tagRepository: TagRepository) {}

  async createTag(params: {
    workspaceId: string
    name: string
    color?: string
  }): Promise<Tag> {
    // Check if tag with the same name already exists
    const existingTag = await this.tagRepository.findByName(params.name, params.workspaceId)

    if (existingTag) {
      throw new TagAlreadyExistsError(params.name, params.workspaceId)
    }

    const tag = Tag.create({
      workspaceId: params.workspaceId,
      name: params.name,
      color: params.color,
    })

    await this.tagRepository.save(tag)

    return tag
  }

  async updateTag(
    tagId: string,
    workspaceId: string,
    params: {
      name?: string
      color?: string
    }
  ): Promise<Tag> {
    const tag = await this.tagRepository.findById(TagId.fromString(tagId), workspaceId)

    if (!tag) {
      throw new TagNotFoundError(tagId, workspaceId)
    }

    // Check if new name conflicts with existing tag
    if (params.name && params.name !== tag.name) {
      const existingTag = await this.tagRepository.findByName(params.name, workspaceId)
      if (existingTag) {
        throw new TagAlreadyExistsError(params.name, workspaceId)
      }
      tag.updateName(params.name)
    }

    if (params.color !== undefined) {
      tag.updateColor(params.color)
    }

    await this.tagRepository.update(tag)

    return tag
  }

  async deleteTag(tagId: string, workspaceId: string): Promise<void> {
    const tag = await this.tagRepository.findById(TagId.fromString(tagId), workspaceId)

    if (!tag) {
      throw new TagNotFoundError(tagId, workspaceId)
    }

    await this.tagRepository.delete(TagId.fromString(tagId), workspaceId)
  }

  async getTagById(tagId: string, workspaceId: string): Promise<Tag | null> {
    return await this.tagRepository.findById(TagId.fromString(tagId), workspaceId)
  }

  async getTagsByWorkspace(workspaceId: string): Promise<Tag[]> {
    return await this.tagRepository.findByWorkspace(workspaceId)
  }
}
