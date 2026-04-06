import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { registerAuthRoutes } from './auth.routes.js';
import {
  registerUserWorkspaceRoutes,
  registerWorkspaceScopedRoutes,
} from './workspace.routes.js';
import {
  registerPublicInvitationRoutes,
  registerTokenInvitationRoutes,
  registerWorkspaceInvitationRoutes,
} from './invitation.routes.js';
import { registerMemberRoutes } from './member.routes.js';
import { AuthController } from '../controllers/auth.controller.js';
import { WorkspaceController } from '../controllers/workspace.controller.js';
import { InvitationController } from '../controllers/invitation.controller.js';
import { MemberController } from '../controllers/member.controller.js';

export async function registerIdentityWorkspaceRoutes(
  fastify: FastifyInstance,
  controllers: {
    authController: AuthController;
    workspaceController: WorkspaceController;
    invitationController: InvitationController;
    memberController: MemberController;
  },
  prisma: PrismaClient
) {
  await fastify.register(
    async (instance) => {
      // Auth routes (public - no authentication required)
      await registerAuthRoutes(instance, controllers.authController);

      // Public invitation routes (no auth required)
      // GET /invitations/:token
      await registerPublicInvitationRoutes(
        instance,
        controllers.invitationController
      );

      // Authenticated routes (all require JWT authentication)
      await instance.register(async (authenticated) => {
        authenticated.addHook('onRequest', async (request, reply) => {
          await fastify.authenticate(request);
        });

        // User-level routes (no workspace authorization)
        // POST /workspaces, GET /workspaces
        await registerUserWorkspaceRoutes(
          authenticated,
          controllers.workspaceController
        );

        // Token-based invitation routes (authenticated, no workspace auth)
        // POST /invitations/:token/accept
        await registerTokenInvitationRoutes(
          authenticated,
          controllers.invitationController
        );

        // Workspace-scoped routes (workspace auth applied at route-level preHandler)
        // GET/PATCH/DELETE /workspaces/:workspaceId
        await registerWorkspaceScopedRoutes(
          authenticated,
          controllers.workspaceController,
          prisma
        );

        // Workspace member routes
        // GET/DELETE/PATCH /workspaces/:workspaceId/members/...
        await registerMemberRoutes(
          authenticated,
          controllers.memberController,
          prisma
        );

        // Workspace invitation routes
        // POST/GET/DELETE /workspaces/:workspaceId/invitations/...
        await registerWorkspaceInvitationRoutes(
          authenticated,
          controllers.invitationController,
          prisma
        );
      });
    },
    { prefix: '/api/v1' }
  );
}
