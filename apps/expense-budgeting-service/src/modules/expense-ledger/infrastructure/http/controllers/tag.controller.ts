import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  CreateTagHandler,
  UpdateTagHandler,
  DeleteTagHandler,
  GetTagHandler,
  ListTagsHandler,
} from '../../../application';
import { ResponseHelper } from '@shared/response.helper';
import {
  CreateTagInput,
  UpdateTagInput,
} from '../validation/tag.schema';
import { paginationQuerySchema } from '../validation/common.schema';
import { z } from 'zod';

type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export class TagController {
  constructor(
    private readonly createTagHandler: CreateTagHandler,
    private readonly updateTagHandler: UpdateTagHandler,
    private readonly deleteTagHandler: DeleteTagHandler,
    private readonly getTagHandler: GetTagHandler,
    private readonly listTagsHandler: ListTagsHandler
  ) {}

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

      return ResponseHelper.ok(reply, 'Tag retrieved successfully', result);
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listTags(
    request: AuthenticatedRequest<{
      Params: { workspaceId: string };
      Querystring: PaginationQuery;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { workspaceId } = request.params;
      const { limit, offset } = request.query;

      const result = await this.listTagsHandler.handle({
        workspaceId,
        limit,
        offset,
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
    try {
      const { workspaceId } = request.params;

      const result = await this.createTagHandler.handle({
        workspaceId,
        name: request.body.name,
        color: request.body.color ?? undefined,
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
    try {
      const { workspaceId, tagId } = request.params;

      const result = await this.updateTagHandler.handle({
        tagId,
        workspaceId,
        name: request.body.name,
        color: request.body.color ?? undefined,
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
    try {
      const { workspaceId, tagId } = request.params;

      const result = await this.deleteTagHandler.handle({
        tagId,
        workspaceId,
      });

      return ResponseHelper.fromCommand(
        reply,
        result,
        'Tag deleted successfully',
        undefined,
        204
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
