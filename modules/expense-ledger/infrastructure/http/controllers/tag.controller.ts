import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateTagHandler } from '../../../application/commands/create-tag.command';
import { UpdateTagHandler } from '../../../application/commands/update-tag.command';
import { DeleteTagHandler } from '../../../application/commands/delete-tag.command';
import { GetTagHandler } from '../../../application/queries/get-tag.query';
import { ListTagsHandler } from '../../../application/queries/list-tags.query';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

export class TagController {
  constructor(
    private readonly createTagHandler: CreateTagHandler,
    private readonly updateTagHandler: UpdateTagHandler,
    private readonly deleteTagHandler: DeleteTagHandler,
    private readonly getTagHandler: GetTagHandler,
    private readonly listTagsHandler: ListTagsHandler
  ) {}

  async createTag(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: {
        name: string;
        color?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;

      const result = await this.createTagHandler.handle({
        workspaceId,
        name: request.body.name,
        color: request.body.color,
      });

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to create tag'
        );
      }
      if (!result.data) {
        return ResponseHelper.badRequest(reply, 'Failed to create tag');
      }

      const tag = result.data;

      return ResponseHelper.created(reply, 'Tag created successfully', {
        tagId: tag.id.getValue(),
        workspaceId: tag.workspaceId,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt.toISOString(),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateTag(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; tagId: string };
      Body: {
        name?: string;
        color?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, tagId } = request.params;

      const result = await this.updateTagHandler.handle({
        tagId,
        workspaceId,
        name: request.body.name,
        color: request.body.color,
      });

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to update tag'
        );
      }
      if (!result.data) {
        return ResponseHelper.notFound(reply, 'Tag not found');
      }

      const tag = result.data;

      return ResponseHelper.ok(reply, 'Tag updated successfully', tag.toJSON());
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteTag(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; tagId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, tagId } = request.params;

      const result = await this.deleteTagHandler.handle({
        tagId,
        workspaceId,
      });

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to delete tag'
        );
      }

      return ResponseHelper.ok(reply, 'Tag deleted successfully');
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async getTag(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; tagId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId, tagId } = request.params;

      const result = await this.getTagHandler.handle({
        tagId,
        workspaceId,
      });

      if (!result.success || !result.data) {
        return ResponseHelper.notFound(reply, result.error ?? 'Tag not found');
      }
      const tag = result.data;
      return ResponseHelper.ok(
        reply,
        'Tag retrieved successfully',
        tag.toJSON()
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listTags(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;

      const result = await this.listTagsHandler.handle({
        workspaceId,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });

      if (!result.success) {
        return ResponseHelper.badRequest(
          reply,
          result.error ?? 'Failed to retrieve tags'
        );
      }

      if (!result.data) {
        return ResponseHelper.badRequest(reply, 'Tags data unavailable');
      }

      return ResponseHelper.ok(reply, 'Tags retrieved successfully', {
        items: result.data.items.map((tag) => tag.toJSON()),
        pagination: {
          total: result.data.total,
          limit: result.data.limit,
          offset: result.data.offset,
          hasMore: result.data.hasMore,
        },
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
