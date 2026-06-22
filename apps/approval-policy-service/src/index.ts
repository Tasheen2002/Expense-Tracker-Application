import 'dotenv/config';
import Fastify from 'fastify';

import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { container } from './container';
import { registerApprovalWorkflowRoutes } from './modules/approval-workflow/infrastructure/http/routes';
import { registerPolicyControlsRoutes } from './modules/policy-controls/infrastructure/http/routes';
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';

const fastify = Fastify({
  logger: true,
});

const PORT = parseInt(process.env.PORT || '3005', 10);

const start = async () => {
  try {
    await fastify.register(securityPlugin);
    await fastify.register(dbPlugin);
    await fastify.register(authPlugin);
    await fastify.register(errorPlugin);

    container.register(fastify.prisma);

    const approvalWorkflowServices = container.getApprovalWorkflowServices();
    await registerApprovalWorkflowRoutes(
      fastify as any,
      approvalWorkflowServices,
      approvalWorkflowServices.prisma
    );

    const policyControlsServices = container.getPolicyControlsServices();
    await registerPolicyControlsRoutes(
      fastify as any,
      policyControlsServices
    );

    const outboxEventRepository = container.get<any>('outboxEventRepository');
    
    const webhookRoutes = {
      ApprovalChainCreated: ['http://localhost:3009/api/v1/event-outbox/events'],
      ApprovalChainUpdated: ['http://localhost:3009/api/v1/event-outbox/events'],
      ApprovalChainDeleted: ['http://localhost:3009/api/v1/event-outbox/events'],
      ApprovalChainActivated: ['http://localhost:3009/api/v1/event-outbox/events'],
      ApprovalChainDeactivated: ['http://localhost:3009/api/v1/event-outbox/events'],
      WorkflowInitiated: [
        'http://localhost:3009/api/v1/event-outbox/events',
        'http://localhost:3008/api/v1/event-outbox/events',
      ],
      WorkflowStepApproved: [
        'http://localhost:3009/api/v1/event-outbox/events',
        'http://localhost:3008/api/v1/event-outbox/events',
      ],
      WorkflowStepRejected: [
        'http://localhost:3009/api/v1/event-outbox/events',
        'http://localhost:3008/api/v1/event-outbox/events',
      ],
      WorkflowStepDelegated: [
        'http://localhost:3009/api/v1/event-outbox/events',
        'http://localhost:3008/api/v1/event-outbox/events',
      ],
      WorkflowCancelled: [
        'http://localhost:3009/api/v1/event-outbox/events',
        'http://localhost:3008/api/v1/event-outbox/events',
      ],
      WorkflowCompleted: [
        'http://localhost:3009/api/v1/event-outbox/events',
        'http://localhost:3008/api/v1/event-outbox/events',
      ],
      PolicyCreated: ['http://localhost:3009/api/v1/event-outbox/events'],
      PolicyUpdated: ['http://localhost:3009/api/v1/event-outbox/events'],
      PolicyActivated: ['http://localhost:3009/api/v1/event-outbox/events'],
      PolicyDeactivated: ['http://localhost:3009/api/v1/event-outbox/events'],
      PolicyDeleted: ['http://localhost:3009/api/v1/event-outbox/events'],
      PolicyExemptionCreated: [
        'http://localhost:3009/api/v1/event-outbox/events',
        'http://localhost:3008/api/v1/event-outbox/events',
      ],
      PolicyExemptionApproved: [
        'http://localhost:3009/api/v1/event-outbox/events',
        'http://localhost:3008/api/v1/event-outbox/events',
      ],
      PolicyExemptionRejected: [
        'http://localhost:3009/api/v1/event-outbox/events',
        'http://localhost:3008/api/v1/event-outbox/events',
      ],
      PolicyExemptionRevoked: [
        'http://localhost:3009/api/v1/event-outbox/events',
        'http://localhost:3008/api/v1/event-outbox/events',
      ],
      PolicyViolationDetected: [
        'http://localhost:3009/api/v1/event-outbox/events',
        'http://localhost:3008/api/v1/event-outbox/events',
      ],
      PolicyViolationAcknowledged: ['http://localhost:3009/api/v1/event-outbox/events'],
      PolicyViolationResolved: ['http://localhost:3009/api/v1/event-outbox/events'],
      PolicyViolationExempted: ['http://localhost:3009/api/v1/event-outbox/events'],
      PolicyViolationOverridden: ['http://localhost:3009/api/v1/event-outbox/events'],
    };

    const publisher = new HttpWebhookPublisher(webhookRoutes);
    const outboxWorker = new OutboxWorker(outboxEventRepository, publisher, {
      pollIntervalMs: 5000,
    });
    outboxWorker.start();

    fastify.addHook('onClose', async () => {
      outboxWorker.stop();
    });

    fastify.get('/health', async () => {
      return { status: 'ok', service: 'approval-policy-service', uptime: process.uptime() };
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Approval-Policy-Service] Running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
