import { FastifyRequest, FastifyReply } from 'fastify'
import { CreateTagHandler } from '../../../application/commands/create-tag.command'
import { UpdateTagHandler } from '../../../application/commands/update-tag.command'
import { DeleteTagHandler } from '../../../application/commands/delete-tag.command'
import { GetTagHandler } from '../../../application/queries/get-tag.query'
import { ListTagsHandler } from '../../../application/queries/list-tags.query'
import { Tag } from '../../../domain/entities/tag.entity'

export class TagController {
  constructor(
    private readonly createTagHandler: CreateTagHandler,
    private readonly updateTagHandler: UpdateTagHandler,
    private readonly deleteTagHandler: DeleteTagHandler,
    private readonly getTagHandler: GetTagHandler,
    private readonly listTagsHandler: ListTagsHandler
  ) {}

  async createTag(
    request: FastifyRequest<{
      Params: { workspaceId: string }
      Body: {
        name: string
        color?: string
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params

      const tag = await this.createTagHandler.handle({
        workspaceId,
        name: request.body.name,
        color: request.body.color,
      })

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: 'Tag created successfully',
        data: {
          tagId: tag.id.getValue(),
          workspaceId: tag.workspaceId,
          name: tag.name,
          color: tag.color,
          createdAt: tag.createdAt.toISOString(),
        },
      })
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      })
    }
  }

  async updateTag(
    request: FastifyRequest<{
      Params: { workspaceId: string; tagId: string }
      Body: {
        name?: string
        color?: string
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, tagId } = request.params

      const tag = await this.updateTagHandler.handle({
        tagId,
        workspaceId,
        name: request.body.name,
        color: request.body.color,
      })

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Tag updated successfully',
        data: {
          tagId: tag.id.getValue(),
          workspaceId: tag.workspaceId,
          name: tag.name,
          color: tag.color,
          createdAt: tag.createdAt.toISOString(),
        },
      })
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      })
    }
  }

  async deleteTag(
    request: FastifyRequest<{
      Params: { workspaceId: string; tagId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, tagId } = request.params

      await this.deleteTagHandler.handle({
        tagId,
        workspaceId,
      })

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Tag deleted successfully',
      })
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      })
    }
  }

  async getTag(
    request: FastifyRequest<{
      Params: { workspaceId: string; tagId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, tagId } = request.params

      const tag = await this.getTagHandler.handle({
        tagId,
        workspaceId,
      })

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Tag retrieved successfully',
        data: {
          tagId: tag.id.getValue(),
          workspaceId: tag.workspaceId,
          name: tag.name,
          color: tag.color,
          createdAt: tag.createdAt.toISOString(),
        },
      })
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        statusCode: 404,
        message: error.message,
      })
    }
  }

  async listTags(
    request: FastifyRequest<{
      Params: { workspaceId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params

      const tags = await this.listTagsHandler.handle({
        workspaceId,
      })

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Tags retrieved successfully',
        data: tags.map((tag: Tag) => ({
          tagId: tag.id.getValue(),
          workspaceId: tag.workspaceId,
          name: tag.name,
          color: tag.color,
          createdAt: tag.createdAt.toISOString(),
        })),
      })
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      })
    }
  }
}
