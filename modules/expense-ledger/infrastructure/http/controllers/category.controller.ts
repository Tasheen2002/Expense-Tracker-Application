import { FastifyRequest, FastifyReply } from 'fastify'
import { CreateCategoryHandler } from '../../../application/commands/create-category.command'
import { UpdateCategoryHandler } from '../../../application/commands/update-category.command'
import { DeleteCategoryHandler } from '../../../application/commands/delete-category.command'
import { GetCategoryHandler } from '../../../application/queries/get-category.query'
import { ListCategoriesHandler } from '../../../application/queries/list-categories.query'
import { Category } from '../../../domain/entities/category.entity'

export class CategoryController {
  constructor(
    private readonly createCategoryHandler: CreateCategoryHandler,
    private readonly updateCategoryHandler: UpdateCategoryHandler,
    private readonly deleteCategoryHandler: DeleteCategoryHandler,
    private readonly getCategoryHandler: GetCategoryHandler,
    private readonly listCategoriesHandler: ListCategoriesHandler
  ) {}

  async createCategory(
    request: FastifyRequest<{
      Params: { workspaceId: string }
      Body: {
        name: string
        description?: string
        color?: string
        icon?: string
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params

      const category = await this.createCategoryHandler.handle({
        workspaceId,
        name: request.body.name,
        description: request.body.description,
        color: request.body.color,
        icon: request.body.icon,
      })

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: 'Category created successfully',
        data: {
          categoryId: category.id.getValue(),
          workspaceId: category.workspaceId,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          isActive: category.isActive,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
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

  async updateCategory(
    request: FastifyRequest<{
      Params: { workspaceId: string; categoryId: string }
      Body: {
        name?: string
        description?: string
        color?: string
        icon?: string
      }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, categoryId } = request.params

      const category = await this.updateCategoryHandler.handle({
        categoryId,
        workspaceId,
        name: request.body.name,
        description: request.body.description,
        color: request.body.color,
        icon: request.body.icon,
      })

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Category updated successfully',
        data: {
          categoryId: category.id.getValue(),
          workspaceId: category.workspaceId,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          isActive: category.isActive,
          updatedAt: category.updatedAt.toISOString(),
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

  async deleteCategory(
    request: FastifyRequest<{
      Params: { workspaceId: string; categoryId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, categoryId } = request.params

      await this.deleteCategoryHandler.handle({
        categoryId,
        workspaceId,
      })

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Category deleted successfully',
      })
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        statusCode: 400,
        message: error.message,
      })
    }
  }

  async getCategory(
    request: FastifyRequest<{
      Params: { workspaceId: string; categoryId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, categoryId } = request.params

      const category = await this.getCategoryHandler.handle({
        categoryId,
        workspaceId,
      })

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Category retrieved successfully',
        data: {
          categoryId: category.id.getValue(),
          workspaceId: category.workspaceId,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          isActive: category.isActive,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
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

  async listCategories(
    request: FastifyRequest<{
      Params: { workspaceId: string }
      Querystring: { activeOnly?: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params
      const { activeOnly } = request.query

      const categories = await this.listCategoriesHandler.handle({
        workspaceId,
        activeOnly: activeOnly === 'true',
      })

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: 'Categories retrieved successfully',
        data: categories.map((category: Category) => ({
          categoryId: category.id.getValue(),
          workspaceId: category.workspaceId,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          isActive: category.isActive,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
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
