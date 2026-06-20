import { FastifyInstance } from 'fastify';
import { policyRoutes } from './policy.routes';
import { violationRoutes } from './violation.routes';
import { exemptionRoutes } from './exemption.routes';
import { PolicyController } from '../controllers/policy.controller';
import { ViolationController } from '../controllers/violation.controller';
import { ExemptionController } from '../controllers/exemption.controller';

export async function registerPolicyControlsRoutes(
  fastify: FastifyInstance,
  controllers: {
    policyController: PolicyController;
    violationController: ViolationController;
    exemptionController: ExemptionController;
  }
): Promise<void> {
  await fastify.register(
    async (instance) => {
      // Register policy routes
      await policyRoutes(instance, controllers.policyController);

      // Register violation routes
      await violationRoutes(instance, controllers.violationController);

      // Register exemption routes
      await exemptionRoutes(instance, controllers.exemptionController);
    },
    { prefix: '/api/v1' }
  );
}
