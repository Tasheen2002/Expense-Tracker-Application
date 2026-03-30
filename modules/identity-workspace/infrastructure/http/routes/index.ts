import { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth.routes';
import { registerWorkspaceRoutes } from './workspace.routes';
import { registerInvitationRoutes } from './invitation.routes';
import { registerMemberRoutes } from './member.routes';
import { AuthController } from '../controllers/auth.controller';
import { WorkspaceController } from '../controllers/workspace.controller';
import { InvitationController } from '../controllers/invitation.controller';
import { MemberController } from '../controllers/member.controller';

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
