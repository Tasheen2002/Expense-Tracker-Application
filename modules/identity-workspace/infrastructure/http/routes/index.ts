import { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth.routes.js';
import { registerWorkspaceRoutes } from './workspace.routes.js';
import { registerInvitationRoutes } from './invitation.routes.js';
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
  }
) {
  await fastify.register(
    async (instance) => {
      await registerAuthRoutes(instance, controllers.authController);
      await registerWorkspaceRoutes(instance, controllers.workspaceController);
      await registerInvitationRoutes(
        instance,
        controllers.invitationController
      );
      await registerMemberRoutes(instance, controllers.memberController);
    },
    { prefix: '/api/v1' }
  );
}
