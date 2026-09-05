import { FastifyInstance } from 'fastify';
import { MemberController } from '../controllers/member.controller';
import { validateBody, validateQuery } from '../validation/validator';
import {
  updateMemberRoleSchema,
  paginationQuerySchema,
  workspaceParamsJsonSchema,
  memberParamsJsonSchema,
  updateMemberRoleBodyJsonSchema,
  paginationQueryJsonSchema,
  membershipEnvelopeJsonSchema,
  membershipListEnvelopeJsonSchema,
  WorkspaceParams,
  MemberParams,
  UpdateMemberRoleInput,
  PaginationQuery,
} from '../validation/workspace.schema';

const writeRateLimit = { rateLimit: { max: 30, timeWindow: '1 minute' } };

export async function registerMemberRoutes(
  app: FastifyInstance,
  controller: MemberController
): Promise<void> {
  // 1. List Workspace Members
  app.get<{ Params: WorkspaceParams; Querystring: PaginationQuery }>(
    '/workspaces/:workspaceId/members',
    {
      onRequest: [app.authenticate],
      preHandler: [validateQuery(paginationQuerySchema)],
      schema: {
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: membershipListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.listMembers(request, reply)
  );

  // 2. Get Workspace Member by ID
  app.get<{ Params: MemberParams }>(
    '/workspaces/:workspaceId/members/:userId',
    {
      onRequest: [app.authenticate],
      schema: {
        params: memberParamsJsonSchema,
        response: {
          200: membershipEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.getMember(request, reply)
  );

  // 3. Remove Member from Workspace
  app.delete<{ Params: MemberParams }>(
    '/workspaces/:workspaceId/members/:userId',
    {
      onRequest: [app.authenticate],
      config: writeRateLimit,
      schema: {
        params: memberParamsJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'Member removed successfully',
          },
        },
      },
    },
    (request, reply) => controller.removeMember(request, reply)
  );

  // 4. Change Workspace Member Role
  app.patch<{ Params: MemberParams; Body: UpdateMemberRoleInput }>(
    '/workspaces/:workspaceId/members/:userId/role',
    {
      onRequest: [app.authenticate],
      config: writeRateLimit,
      preHandler: [validateBody(updateMemberRoleSchema)],
      schema: {
        params: memberParamsJsonSchema,
        body: updateMemberRoleBodyJsonSchema,
        response: {
          200: membershipEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.changeRole(request, reply)
  );
}
