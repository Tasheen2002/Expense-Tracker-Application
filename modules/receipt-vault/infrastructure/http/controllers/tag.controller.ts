import { FastifyRequest, FastifyReply } from "fastify";
import { CreateTagHandler } from "../../../application/commands/create-tag.command";
import { UpdateTagHandler } from "../../../application/commands/update-tag.command";
import { DeleteTagHandler } from "../../../application/commands/delete-tag.command";
import { ListTagsHandler } from "../../../application/queries/list-tags.query";
import { ReceiptTagDefinition } from "../../../domain/entities/receipt-tag-definition.entity";
import type { CreateTagInput, UpdateTagInput } from "../validation/tag.schema";
import { ResponseHelper } from "../../../../../apps/api/src/shared/response.helper";

export class TagController {
  constructor(
    private readonly createTagHandler: CreateTagHandler,
    private readonly updateTagHandler: UpdateTagHandler,
    private readonly deleteTagHandler: DeleteTagHandler,
    private readonly listTagsHandler: ListTagsHandler,
  ) {}

  async createTag(
    request: FastifyRequest<{
      Params: { workspaceId: string };
      Body: CreateTagInput;
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId } = request.params;

    try {
      const tag = await this.createTagHandler.handle({
        workspaceId,
        ...request.body,
      });

      return reply.status(201).send({
        success: true,
        statusCode: 201,
        message: "Tag created successfully",
        data: this.serializeTag(tag),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async updateTag(
    request: FastifyRequest<{
      Params: { workspaceId: string; tagId: string };
      Body: UpdateTagInput;
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId, tagId } = request.params;

    try {
      const tag = await this.updateTagHandler.handle({
        tagId,
        workspaceId,
        ...request.body,
      });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Tag updated successfully",
        data: this.serializeTag(tag),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async deleteTag(
    request: FastifyRequest<{
      Params: { workspaceId: string; tagId: string };
    }>,
    reply: FastifyReply,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        statusCode: 401,
        message: "User not authenticated",
      });
    }

    const { workspaceId, tagId } = request.params;

    try {
      await this.deleteTagHandler.handle({ tagId, workspaceId });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Tag deleted successfully",
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  async listTags(
    request: FastifyRequest<{
      Params: { workspaceId: string };
    }>,
    reply: FastifyReply,
  ) {
    const { workspaceId } = request.params;

    try {
      const tags = await this.listTagsHandler.handle({ workspaceId });

      return reply.status(200).send({
        success: true,
        statusCode: 200,
        message: "Tags retrieved successfully",
        data: tags.map((tag) => this.serializeTag(tag)),
      });
    } catch (error: unknown) {
      return ResponseHelper.error(reply, error);
    }
  }

  private serializeTag(tag: ReceiptTagDefinition) {
    return {
      tagId: tag.getId().getValue(),
      workspaceId: tag.getWorkspaceId(),
      name: tag.getName(),
      color: tag.getColor(),
      description: tag.getDescription(),
      createdAt: tag.getCreatedAt().toISOString(),
    };
  }
}
