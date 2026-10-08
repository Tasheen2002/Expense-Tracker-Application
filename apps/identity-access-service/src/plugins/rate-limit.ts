import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyPluginAsync } from 'fastify';

function positiveLimit(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return Number(raw);
}

const plugin: FastifyPluginAsync = async (app) => {
  const userLimit = positiveLimit('IDENTITY_USER_RATE_LIMIT', 100);
  const serviceLimit = positiveLimit('IDENTITY_SERVICE_RATE_LIMIT', 1000);
  await app.register(rateLimit, {
    // Fastify rate-limit appends this hook after the route's authentication hook.
    // Charge quota before body validation, using the verified identity.
    hook: 'onRequest',
    timeWindow: '1 minute',
    max: (request) => request.user?.isServicePrincipal ? serviceLimit : userLimit,
    keyGenerator: (request) => {
      if (request.user?.isServicePrincipal) return `service-ip:${request.ip}`;
      if (request.user) return `user:${request.user.userId.toLowerCase()}`;
      return `anonymous-ip:${request.ip}`;
    },
  });
};

export default fp(plugin, { name: 'identity-rate-limit' });
