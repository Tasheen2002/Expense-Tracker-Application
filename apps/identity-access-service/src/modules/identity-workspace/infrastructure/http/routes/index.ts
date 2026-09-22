import { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth.routes';
import {
  registerUserWorkspaceRoutes,
  registerWorkspaceScopedRoutes,
  registerWorkspaceRoutes,
} from './workspace.routes';
import {
  registerPublicInvitationRoutes,
  registerTokenInvitationRoutes,
  registerWorkspaceInvitationRoutes,
  registerInvitationRoutes,
} from './invitation.routes';
import { registerMemberRoutes } from './member.routes';
import {
  AuthController,
  WorkspaceController,
  InvitationController,
  MemberController,
} from '../controllers';

export interface IdentityWorkspaceModuleControllers {
  authController: AuthController;
  workspaceController: WorkspaceController;
  invitationController: InvitationController;
  memberController: MemberController;
}

export async function registerIdentityWorkspaceRoutes(
  fastify: FastifyInstance,
  controllers: IdentityWorkspaceModuleControllers
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

export {
  registerAuthRoutes,
  registerUserWorkspaceRoutes,
  registerWorkspaceScopedRoutes,
  registerWorkspaceRoutes,
  registerPublicInvitationRoutes,
  registerTokenInvitationRoutes,
  registerWorkspaceInvitationRoutes,
  registerInvitationRoutes,
  registerMemberRoutes,
};
