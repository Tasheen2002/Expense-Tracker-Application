import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import dbPlugin from './plugins/db';
import authPlugin from './plugins/auth';
import securityPlugin from './plugins/security';
import errorPlugin from './plugins/error';
import { container } from './container';
import { registerAuditComplianceRoutes } from './modules/audit-compliance/infrastructure/http/routes';

const fastify = Fastify({
  logger: true,
});

const PORT = parseInt(process.env.PORT || '3009', 10);

const start = async () => {
  try {
    await fastify.register(securityPlugin);
    await fastify.register(dbPlugin);
    await fastify.register(authPlugin);
    await fastify.register(errorPlugin);
    await fastify.register(cors, {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    });

    container.register(fastify.prisma);

    const auditServices = container.getAuditServices();
    await registerAuditComplianceRoutes(
      fastify as any,
      auditServices,
      auditServices.prisma
    );

    fastify.get('/health', async () => {
      return { status: 'ok', service: 'audit-compliance-service', uptime: process.uptime() };
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Audit-Compliance-Service] Running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
