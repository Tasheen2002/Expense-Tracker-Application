import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  CreateTagHandler,
  UpdateTagHandler,
  DeleteTagHandler,
  ListTagsHandler,
} from '../../../application';
import type { CreateTagInput, UpdateTagInput } from '../validation/tag.schema';
import { ResponseHelper } from '@shared/response.helper';

export class TagController {
  constructor(
    private readonly createTagHandler: CreateTagHandler,
    private readonly updateTagHandler: UpdateTagHandler,
    private readonly deleteTagHandler: DeleteTagHandler,
    private readonly listTagsHandler: ListTagsHandler
  ) {}

  async listTags(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: { limit?: number; offset?: number };
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;
    const { limit, offset } = request.query;

    try {
      const result = await this.listTagsHandler.handle({
        workspaceId,
        options: {
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
        },
      });
      return ResponseHelper.ok(reply, 'Tags retrieved successfully', {
        items: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async createTag(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Body: CreateTagInput;
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId } = request.params;

    try {
      const result = await this.createTagHandler.handle({
        workspaceId,
        ...request.body,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Tag created successfully',
        result.data,
        201
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateTag(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string; tagId: string };
      Body: UpdateTagInput;
    }>,
    reply: FastifyReply
  ) {
    const { workspaceId, tagId } = request.params;

    try {
      const result = await this.updateTagHandler.handle({
        tagId,
        workspaceId,
        ...request.body,
      });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Tag updated successfully',
        result.data
      );
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
    const { workspaceId, tagId } = request.params;

    try {
      const result = await this.deleteTagHandler.handle({ tagId, workspaceId });
      return ResponseHelper.fromCommand(
        reply,
        result,
        'Tag deleted successfully'
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
