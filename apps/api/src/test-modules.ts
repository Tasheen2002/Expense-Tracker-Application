import fp from 'fastify-plugin';
import { registerIdentityWorkspaceRoutes } from '../../../modules/identity-workspace/infrastructure/http/routes/index';
import { registerBankFeedSyncRoutes } from '../../../modules/bank-feed-sync/infrastructure/http/routes/index';

export const testModuleLoader = (container: any) => fp(
  async (fastify) => {
    fastify.log.info('Registering test modules...');

    const prisma = (fastify as any).prisma;

    // 1. Identity-Workspace
    const identityControllers = {
      authController: container.get('authController'),
      workspaceController: container.get('workspaceController'),
      invitationController: container.get('invitationController'),
      memberController: container.get('memberController'),
    };
    await registerIdentityWorkspaceRoutes(fastify, identityControllers as any);

    // 2. Bank-Feed-Sync
    const bankFeedSyncServices = {
      bankConnectionController: container.get('bankConnectionController'),
      bankTransactionController: container.get('bankTransactionController'),
      transactionSyncController: container.get('transactionSyncController'),
    };
    await registerBankFeedSyncRoutes(fastify, bankFeedSyncServices as any, prisma);

    fastify.log.info('✓ Test modules registered');
  }
);
