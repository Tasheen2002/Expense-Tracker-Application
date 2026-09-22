import { FastifyInstance } from 'fastify';
import { InvitationController } from '../controllers/invitation.controller';
import { validateBody, validateQuery } from '../validation/validator';
import {
  inviteMemberSchema,
  paginationQuerySchema,
  workspaceParamsJsonSchema,
  invitationParamsJsonSchema,
  tokenParamsJsonSchema,
  inviteMemberBodyJsonSchema,
  paginationQueryJsonSchema,
  invitationEnvelopeJsonSchema,
  membershipEnvelopeJsonSchema,
  invitationListEnvelopeJsonSchema,
  TokenParams,
  WorkspaceParams,
  InvitationParams,
  InviteMemberInput,
  PaginationQuery,
} from '../validation/workspace.schema';

const writeRateLimit = { rateLimit: { max: 30, timeWindow: '1 minute' } };

export async function registerPublicInvitationRoutes(
  app: FastifyInstance,
  controller: InvitationController
): Promise<void> {
  // 1. Get Invitation by Token (Public)
  app.get<{ Params: TokenParams }>(
    '/invitations/:token',
    {
      schema: {
        params: tokenParamsJsonSchema,
        response: {
          200: invitationEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.getInvitationByToken(request, reply)
  );
}

export async function registerTokenInvitationRoutes(
  app: FastifyInstance,
  controller: InvitationController
): Promise<void> {
  // 2. Accept Invitation by Token (Authenticated)
  app.post<{ Params: TokenParams }>(
    '/invitations/:token/accept',
    {
      onRequest: [app.authenticate],
      config: writeRateLimit,
      schema: {
        params: tokenParamsJsonSchema,
        response: {
          200: membershipEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.acceptInvitation(request, reply)
  );
}

export async function registerWorkspaceInvitationRoutes(
  app: FastifyInstance,
  controller: InvitationController
): Promise<void> {
  // 3. Create Invitation for Workspace
  app.post<{ Params: WorkspaceParams; Body: InviteMemberInput }>(
    '/workspaces/:workspaceId/invitations',
    {
      onRequest: [app.authenticate],
      config: writeRateLimit,
      preHandler: [validateBody(inviteMemberSchema)],
      schema: {
        params: workspaceParamsJsonSchema,
        body: inviteMemberBodyJsonSchema,
        response: {
          201: invitationEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.createInvitation(request, reply)
  );

  // 4. List Pending Invitations for Workspace
  app.get<{ Params: WorkspaceParams; Querystring: PaginationQuery }>(
    '/workspaces/:workspaceId/invitations',
    {
      onRequest: [app.authenticate],
      preHandler: [validateQuery(paginationQuerySchema)],
      schema: {
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: invitationListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.listWorkspaceInvitations(request, reply)
  );

  // 5. Cancel Invitation
  app.delete<{ Params: InvitationParams }>(
    '/workspaces/:workspaceId/invitations/:invitationId',
    {
      onRequest: [app.authenticate],
      config: writeRateLimit,
      schema: {
        params: invitationParamsJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'Invitation cancelled successfully',
          },
        },
      },
    },
    (request, reply) => controller.cancelInvitation(request, reply)
  );
}

export async function registerInvitationRoutes(
  app: FastifyInstance,
  controller: InvitationController
): Promise<void> {
  await registerPublicInvitationRoutes(app, controller);
  await registerTokenInvitationRoutes(app, controller);
  await registerWorkspaceInvitationRoutes(app, controller);
}
