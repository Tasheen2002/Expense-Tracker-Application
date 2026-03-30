import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CreateTagHandler } from '../../../application/commands/create-tag.command';
import { UpdateTagHandler } from '../../../application/commands/update-tag.command';
import { DeleteTagHandler } from '../../../application/commands/delete-tag.command';
import { ListTagsHandler } from '../../../application/queries/list-tags.query';
import type { CreateTagInput, UpdateTagInput } from '../validation/tag.schema';
import { ResponseHelper } from '../../../../../apps/api/src/shared/response.helper';

export class TagController {
  constructor(
    private readonly createTagHandler: CreateTagHandler,
    private readonly updateTagHandler: UpdateTagHandler,
    private readonly deleteTagHandler: DeleteTagHandler,
    private readonly listTagsHandler: ListTagsHandler
  ) {}

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
        'Tag updated successfully'
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
      const paginatedData = result.data;
      return ResponseHelper.fromQuery(
        reply,
        result,
        'Tags retrieved successfully',
        {
          items: paginatedData?.items.map((t) => t.toJSON()) ?? [],
          pagination: {
            total: paginatedData?.total ?? 0,
            limit: paginatedData?.limit ?? 0,
            offset: paginatedData?.offset ?? 0,
            hasMore: paginatedData?.hasMore ?? false,
          },
        }
      );
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }
}
