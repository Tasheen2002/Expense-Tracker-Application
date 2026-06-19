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

export interface IdentityWorkspaceModuleControllers {
  authController: AuthController;
  workspaceController: WorkspaceController;
  invitationController: InvitationController;
  memberController: MemberController;
}

export async function registerIdentityWorkspaceRoutes(
  fastify: FastifyInstance,
  controllers: IdentityWorkspaceModuleControllers,
  prisma: PrismaClient
): Promise<void> {
  // Flat registration under prefix '/api/v1'.
  // Authentication is handled at the individual route configuration level.
  await fastify.register(
    async (instance) => {
      // Auth routes
      await registerAuthRoutes(instance, controllers.authController);

      // Public invitation routes
      await registerPublicInvitationRoutes(
        instance,
        controllers.invitationController
      );

      // User-level workspace routes
      await registerUserWorkspaceRoutes(
        instance,
        controllers.workspaceController
      );

      // Token-based invitation routes
      await registerTokenInvitationRoutes(
        instance,
        controllers.invitationController
      );

      // Workspace-scoped routes
      await registerWorkspaceScopedRoutes(
        instance,
        controllers.workspaceController
      );

      // Workspace member routes
      await registerMemberRoutes(
        instance,
        controllers.memberController
      );

      // Workspace invitation routes
      await registerWorkspaceInvitationRoutes(
        instance,
        controllers.invitationController
      );
    },
    { prefix: '/api/v1' }
  );
}
