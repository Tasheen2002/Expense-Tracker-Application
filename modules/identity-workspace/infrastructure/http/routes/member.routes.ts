import { FastifyInstance } from "fastify";
import { MemberController } from "../controllers/member.controller";

const listMembersSchema = {
  schema: {
    tags: ["Member"],
    description: "List workspace members",
    params: {
      type: "object",
      required: ["workspaceId"],
      properties: {
        workspaceId: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          statusCode: { type: "number" },
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                membershipId: { type: "string" },
                userId: { type: "string" },
                workspaceId: { type: "string" },
                role: { type: "string" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

const removeMemberSchema = {
  schema: {
    tags: ["Member"],
    description: "Remove member from workspace",
    params: {
      type: "object",
      required: ["workspaceId", "userId"],
      properties: {
        workspaceId: { type: "string", format: "uuid" },
        userId: { type: "string", format: "uuid" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          statusCode: { type: "number" },
          message: { type: "string" },
        },
      },
    },
  },
};

const changeRoleSchema = {
  schema: {
    tags: ["Member"],
    description: "Change member role",
    params: {
      type: "object",
      required: ["workspaceId", "userId"],
      properties: {
        workspaceId: { type: "string", format: "uuid" },
        userId: { type: "string", format: "uuid" },
      },
    },
    body: {
      type: "object",
      required: ["role"],
      properties: {
        role: { type: "string", enum: ["owner", "admin", "member"] },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          statusCode: { type: "number" },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              membershipId: { type: "string" },
              userId: { type: "string" },
              workspaceId: { type: "string" },
              role: { type: "string" },
              updatedAt: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export async function registerMemberRoutes(
  fastify: FastifyInstance,
  controller: MemberController,
) {
  // List workspace members
  fastify.get(
    "/workspaces/:workspaceId/members",
    {
      ...listMembersSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => controller.listMembers(request as any, reply),
  );

  // Remove member from workspace
  fastify.delete(
    "/workspaces/:workspaceId/members/:userId",
    {
      ...removeMemberSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => controller.removeMember(request as any, reply),
  );

  // Change member role
  fastify.patch(
    "/workspaces/:workspaceId/members/:userId/role",
    {
      ...changeRoleSchema,
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => controller.changeRole(request as any, reply),
  );
}
