import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import proxy, { FastifyHttpProxyOptions } from '@fastify/http-proxy';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { gatewayNetworkConfig } from './environment';

export interface GatewayConfig {
  trustedProxyIPs?: string[];
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  jwtSecret?: string;
  internalApiKey?: string;
  frontendUrl?: string;
  enableRateLimit?: boolean;
  enableProxies?: boolean;
  upstreamTimeoutMs?: number;
  services?: {
    identity?: string;
    expense?: string;
    categorization?: string;
    approval?: string;
    bankFeed?: string;
    receipt?: string;
    notification?: string;
    audit?: string;
  };
}

interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  exp: number;
  workspaceId?: string;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
function validPayload(value: unknown): value is JWTPayload {
  if (!value || typeof value !== 'object') return false;
  const claims = value as Record<string, unknown>;
  return (
    isUuid(claims.userId) &&
    isUuid(claims.sessionId) &&
    typeof claims.email === 'string' &&
    claims.email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email) &&
    typeof claims.exp === 'number' &&
    Number.isFinite(claims.exp) &&
    (claims.workspaceId === undefined || isUuid(claims.workspaceId))
  );
}
function matchesIdentity(value: unknown, userId: string): boolean {
  if (!value || typeof value !== 'object') return false;
  if ((value as Record<string, unknown>).success !== true) return false;
  const data = (value as Record<string, unknown>).data;
  return (
    !!data &&
    typeof data === 'object' &&
    (data as Record<string, unknown>).userId === userId
  );
}
function unavailableSession(reply: FastifyReply) {
  return reply
    .code(503)
    .send({
      success: false,
      statusCode: 503,
      message: 'Session verification unavailable',
    });
}

export async function buildGatewayApp(
  config?: GatewayConfig
): Promise<FastifyInstance> {
  const network = gatewayNetworkConfig(config);
  const fastify = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : true,
    trustProxy: network.trustedProxyIPs.length ? network.trustedProxyIPs : false,
  });

  try {
    const JWT_SECRET = config?.jwtSecret || process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error(
        '[API-Gateway] FATAL: JWT_SECRET environment variable is required but not set.'
      );
    }

    const signingSecret: string = JWT_SECRET;
    const isProd = process.env.NODE_ENV === 'production';
    if (
      isProd &&
      (JWT_SECRET.includes('change-me') || JWT_SECRET.trim().length < 32)
    ) {
      throw new Error(
        '[API-Gateway] SECURITY FATAL: Weak or default JWT_SECRET detected in production!'
      );
    }

    const INTERNAL_API_KEY =
      config?.internalApiKey ||
      process.env.INTERNAL_API_KEY ||
      'internal-api-key-change-me';
    if (
      isProd &&
      (INTERNAL_API_KEY.includes('change-me') || INTERNAL_API_KEY.trim().length < 32)
    ) {
      throw new Error(
        '[API-Gateway] SECURITY FATAL: Default INTERNAL_API_KEY detected in production!'
      );
    }

    const FRONTEND_URL =
      config?.frontendUrl ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';
    const allowedOrigins = FRONTEND_URL.split(',').map((url) => url.trim());
    if (isProd && allowedOrigins.includes('*'))
      throw new Error(
        'Wildcard CORS is not allowed with production credentials'
      );
    const timeoutMs = config?.upstreamTimeoutMs ?? 10_000;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000)
      throw new Error('Invalid upstreamTimeoutMs');

    await fastify.register(cors, {
      origin: (origin, cb) => {
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          allowedOrigins.includes('*')
        ) {
          cb(null, true);
          return;
        }
        cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    });

    await fastify.register(helmet, {
      contentSecurityPolicy: false,
    });

    if (config?.enableRateLimit !== false) {
      await fastify.register(rateLimit, {
        max: network.rateLimitMax,
        allowList: (request: FastifyRequest) =>
          ['/health', '/live'].includes(request.url.split('?')[0]),
        timeWindow: network.rateLimitWindowMs,
        errorResponseBuilder: (
          _request: FastifyRequest,
          context: { after: string }
        ) => ({
          success: false,
          statusCode: 429,
          message: 'Rate limit exceeded. Try again later.',
          retryAfter: context.after,
        }),
      });
    }

    // Correlation ID & Internal Security Headers
    fastify.addHook('onRequest', async (request, reply) => {
      // Resolve the client through explicitly trusted peers before replacing headers.
      const clientIP = request.ip;
      if (!isIP(clientIP)) {
        return reply.code(400).send({ success: false, statusCode: 400, message: 'Invalid forwarded client IP' });
      }
      delete request.headers['forwarded'];
      delete request.headers['x-forwarded-host'];
      delete request.headers['x-forwarded-proto'];
      request.headers['x-forwarded-for'] = clientIP;
      const incoming = request.headers['x-correlation-id'];
      const correlationId =
        typeof incoming === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(incoming)
          ? incoming
          : randomUUID();
      request.headers['x-correlation-id'] = correlationId;
      reply.header('x-correlation-id', correlationId);

      // Defend against spoofing: strip client-supplied internal security headers and inject server-controlled secret
      delete request.headers['x-internal-api-key'];
      delete request.headers['x-service-principal'];
      delete request.headers['x-user-id'];
      delete request.headers['x-user-email'];
      delete request.headers['x-workspace-id'];
      request.headers['x-internal-api-key'] = INTERNAL_API_KEY;
    });

    // Secure Authentication Middleware (Gateway-level)
    async function authenticateGateway(
      req: FastifyRequest,
      reply: FastifyReply
    ) {
      // 1. Defend against header injection by stripping pre-existing downstream context headers
      delete req.headers['x-user-id'];
      delete req.headers['x-user-email'];
      delete req.headers['x-workspace-id'];
      delete req.headers['x-service-principal'];

      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({
            success: false,
            statusCode: 401,
            message: 'Missing or invalid authorization header',
          });
        }

        const token = authHeader.substring(7);
        const verified = jwt.verify(token, signingSecret, {
          algorithms: ['HS256'],
        });
        if (!validPayload(verified)) throw new Error('Invalid token claims');
        const decoded = verified;
        // All public client access uses a currently active Identity session.
        // Do not cache acceptance across logout/revocation.
        let sessionResponse: Response;
        try {
          sessionResponse = await fetch(
            IDENTITY_SERVICE_URL + '/api/v1/auth/me',
            {
              redirect: 'error',
              signal: AbortSignal.timeout(timeoutMs),
              headers: {
                authorization: authHeader,
                'x-internal-api-key': INTERNAL_API_KEY,
                'x-correlation-id': String(req.headers['x-correlation-id']),
              },
            }
          );
        } catch {
          return unavailableSession(reply);
        }
        if (sessionResponse.status === 401 || sessionResponse.status === 403)
          return reply
            .code(401)
            .send({
              success: false,
              statusCode: 401,
              message: 'Session has been revoked or expired',
            });
        if (sessionResponse.status === 429) {
          const retryAfter = sessionResponse.headers.get('retry-after');
          // Forward only a bounded numeric delay, never upstream diagnostics.
          if (retryAfter && /^\d{1,6}$/.test(retryAfter))
            reply.header('retry-after', retryAfter);
          return reply.code(429).send({
            success: false,
            statusCode: 429,
            message: 'Session verification rate limit exceeded. Please retry later.',
          });
        }
        if (!sessionResponse.ok) return unavailableSession(reply);
        let profile: unknown;
        try {
          profile = await sessionResponse.json();
        } catch {
          return unavailableSession(reply);
        }
        if (!matchesIdentity(profile, decoded.userId))
          return unavailableSession(reply);

        // 2. Inject verified context headers to propagate downstream
        req.headers['x-user-id'] = decoded.userId;
        req.headers['x-user-email'] = decoded.email;

        // Extract workspaceId from URL path if it is a workspace-scoped path
        const urlParts = req.url.split('?')[0].split('/');
        if (
          urlParts[1] === 'api' &&
          urlParts[2] === 'v1' &&
          urlParts[3] === 'workspaces'
        ) {
          const workspaceId = urlParts[4];
          if (
            workspaceId &&
            workspaceId !== 'unread' &&
            workspaceId !== 'filter' &&
            workspaceId !== 'statistics'
          ) {
            const parsed = decodeURIComponent(workspaceId);
            if (!isUuid(parsed))
              return reply
                .code(400)
                .send({
                  success: false,
                  statusCode: 400,
                  message: 'Invalid workspace ID',
                });
            req.headers['x-workspace-id'] = parsed;
          }
        } else if (decoded.workspaceId) {
          req.headers['x-workspace-id'] = decoded.workspaceId;
        }
      } catch {
        return reply.code(401).send({
          success: false,
          statusCode: 401,
          message: 'Authentication failed: Invalid or expired token',
        });
      }
    }

    // Downstream Service URLs
    const IDENTITY_SERVICE_URL = (
      config?.services?.identity ||
      process.env.IDENTITY_SERVICE_URL ||
      'http://identity-access-service:3002'
    ).replace(/\/+$/, '');
    const EXPENSE_SERVICE_URL = (
      config?.services?.expense ||
      process.env.EXPENSE_SERVICE_URL ||
      'http://expense-budgeting-service:3003'
    ).replace(/\/+$/, '');
    const CATEGORIZATION_SERVICE_URL = (
      config?.services?.categorization ||
      process.env.CATEGORIZATION_SERVICE_URL ||
      'http://categorization-service:3004'
    ).replace(/\/+$/, '');
    const APPROVAL_SERVICE_URL = (
      config?.services?.approval ||
      process.env.APPROVAL_SERVICE_URL ||
      'http://approval-policy-service:3005'
    ).replace(/\/+$/, '');
    const BANK_FEED_SERVICE_URL = (
      config?.services?.bankFeed ||
      process.env.BANK_FEED_SERVICE_URL ||
      'http://bank-feed-service:3006'
    ).replace(/\/+$/, '');
    const RECEIPT_SERVICE_URL = (
      config?.services?.receipt ||
      process.env.RECEIPT_SERVICE_URL ||
      'http://receipt-vault-service:3007'
    ).replace(/\/+$/, '');
    const NOTIFICATION_SERVICE_URL = (
      config?.services?.notification ||
      process.env.NOTIFICATION_SERVICE_URL ||
      'http://notification-service:3008'
    ).replace(/\/+$/, '');
    const AUDIT_SERVICE_URL = (
      config?.services?.audit ||
      process.env.AUDIT_SERVICE_URL ||
      'http://audit-compliance-service:3009'
    ).replace(/\/+$/, '');

    const upstreams = [
      IDENTITY_SERVICE_URL,
      EXPENSE_SERVICE_URL,
      CATEGORIZATION_SERVICE_URL,
      APPROVAL_SERVICE_URL,
      BANK_FEED_SERVICE_URL,
      RECEIPT_SERVICE_URL,
      NOTIFICATION_SERVICE_URL,
      AUDIT_SERVICE_URL,
    ];
    for (const upstream of upstreams) {
      const url = new URL(upstream);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== '/'
      )
        throw new Error(
          'Service URLs must be HTTP(S) origins without credentials'
        );
    }
    const transportOptions: Pick<
      FastifyHttpProxyOptions,
      'undici' | 'retryMethods' | 'maxRetriesOn503' | 'replyOptions'
    > = {
      undici: {
        connectTimeout: timeoutMs,
        headersTimeout: timeoutMs,
        bodyTimeout: timeoutMs,
      },
      retryMethods: [],
      maxRetriesOn503: 0,
      replyOptions: {
        onError(reply, { error }) {
          const status = 'statusCode' in error ? error.statusCode : undefined;
          const statusCode = status === 504 ? 504 : status === 503 ? 503 : 502;
          reply
            .code(statusCode)
            .send({
              success: false,
              statusCode,
              message:
                statusCode === 504
                  ? 'Upstream service timed out'
                  : 'Upstream service unavailable',
            });
        },
      },
    };

    if (config?.enableProxies !== false) {
      // --- PUBLIC: Authentication ---
      await fastify.register(proxy, {
        ...transportOptions,
        upstream: IDENTITY_SERVICE_URL,
        prefix: '/api/v1/auth',
        rewritePrefix: '/api/v1/auth',
        preHandler: async (req) => {
          delete req.headers['x-user-id'];
          delete req.headers['x-user-email'];
          delete req.headers['x-workspace-id'];
        },
      });

      // --- PRIVATE: Accept Invitation ---
      await fastify.register(proxy, {
        ...transportOptions,
        upstream: IDENTITY_SERVICE_URL,
        prefix: '/api/v1/invitations/:token/accept',
        rewritePrefix: '/api/v1/invitations/:token/accept',
        preHandler: authenticateGateway,
      });

      // --- PUBLIC: Invitation Verification ---
      await fastify.register(proxy, {
        ...transportOptions,
        upstream: IDENTITY_SERVICE_URL,
        prefix: '/api/v1/invitations/:token',
        rewritePrefix: '/api/v1/invitations/:token',
        preHandler: async (req) => {
          delete req.headers['x-user-id'];
          delete req.headers['x-user-email'];
          delete req.headers['x-workspace-id'];
        },
      });

      // Account endpoints always use the verified session actor, without a workspace.
      for (const [prefix, upstream] of [
        ['/api/v1/account/audit-logs', AUDIT_SERVICE_URL],
        ['/api/v1/account/notifications', NOTIFICATION_SERVICE_URL],
        ['/api/v1/account/notification-preferences', NOTIFICATION_SERVICE_URL],
      ]) {
        await fastify.register(proxy, { ...transportOptions, upstream, prefix,
          rewritePrefix: prefix, preHandler: authenticateGateway });
      }

      // --- PRIVATE: Workspace-scoped Proxies ---
      const expenseWorkspacePrefixes = [
        '/api/v1/workspaces/:workspaceId/expenses',
        '/api/v1/workspaces/:workspaceId/categories',
        '/api/v1/workspaces/:workspaceId/tags',
        '/api/v1/workspaces/:workspaceId/splits',
        '/api/v1/workspaces/:workspaceId/settlements',
        '/api/v1/workspaces/:workspaceId/recurring',
        '/api/v1/workspaces/:workspaceId/budgets',
        '/api/v1/workspaces/:workspaceId/budget-plans',
        '/api/v1/workspaces/:workspaceId/departments',
        '/api/v1/workspaces/:workspaceId/cost-centers',
        '/api/v1/workspaces/:workspaceId/projects',
        '/api/v1/workspaces/:workspaceId/suppliers',
        '/api/v1/workspaces/:workspaceId/locations',
        '/api/v1/workspaces/:workspaceId/purchase-orders',
        '/api/v1/workspaces/:workspaceId/stock',
        '/api/v1/workspaces/:workspaceId/spending-limits',
        '/api/v1/workspaces/:workspaceId/forecasts',
        '/api/v1/workspaces/:workspaceId/scenarios',
        '/api/v1/workspaces/:workspaceId/forecast-items',
        '/api/v1/workspaces/:workspaceId/allocations',
      ];

      for (const prefix of expenseWorkspacePrefixes) {
        await fastify.register(proxy, {
          ...transportOptions,
          upstream: EXPENSE_SERVICE_URL,
          prefix,
          rewritePrefix: prefix,
          preHandler: authenticateGateway,
        });
      }

      const categorizationWorkspacePrefixes = [
        '/api/v1/workspaces/:workspaceId/rules',
        '/api/v1/workspaces/:workspaceId/suggestions',
        '/api/v1/workspaces/:workspaceId/evaluate',
        '/api/v1/workspaces/:workspaceId/executions',
      ];

      for (const prefix of categorizationWorkspacePrefixes) {
        await fastify.register(proxy, {
          ...transportOptions,
          upstream: CATEGORIZATION_SERVICE_URL,
          prefix,
          rewritePrefix: prefix,
          preHandler: authenticateGateway,
        });
      }

      const approvalWorkspacePrefixes = [
        '/api/v1/workspaces/:workspaceId/approval-chains',
        '/api/v1/workspaces/:workspaceId/workflows',
        '/api/v1/workspaces/:workspaceId/exemptions',
        '/api/v1/workspaces/:workspaceId/policies',
        '/api/v1/workspaces/:workspaceId/violations',
      ];

      for (const prefix of approvalWorkspacePrefixes) {
        await fastify.register(proxy, {
          ...transportOptions,
          upstream: APPROVAL_SERVICE_URL,
          prefix,
          rewritePrefix: prefix,
          preHandler: authenticateGateway,
        });
      }

      const bankFeedWorkspacePrefixes = [
        '/api/v1/workspaces/:workspaceId/bank-feed-sync',
      ];

      for (const prefix of bankFeedWorkspacePrefixes) {
        await fastify.register(proxy, {
          ...transportOptions,
          upstream: BANK_FEED_SERVICE_URL,
          prefix,
          rewritePrefix: prefix,
          preHandler: authenticateGateway,
        });
      }

      const receiptWorkspacePrefixes = [
        '/api/v1/workspaces/:workspaceId/expenses/:expenseId/receipts',
        '/api/v1/workspaces/:workspaceId/receipts',
        '/api/v1/workspaces/:workspaceId/receipt-tags',
      ];

      for (const prefix of receiptWorkspacePrefixes) {
        await fastify.register(proxy, {
          ...transportOptions,
          upstream: RECEIPT_SERVICE_URL,
          prefix,
          rewritePrefix: prefix,
          preHandler: authenticateGateway,
        });
      }

      await fastify.register(proxy, {
        ...transportOptions,
        upstream: NOTIFICATION_SERVICE_URL,
        prefix: '/api/v1/workspaces/:workspaceId/notifications',
        rewritePrefix: '/api/v1/workspaces/:workspaceId/notifications',
        preHandler: authenticateGateway,
      });

      await fastify.register(proxy, {
        ...transportOptions,
        upstream: NOTIFICATION_SERVICE_URL,
        prefix: '/api/v1/workspaces/:workspaceId/notification-preferences',
        rewritePrefix:
          '/api/v1/workspaces/:workspaceId/notification-preferences',
        preHandler: authenticateGateway,
      });

      await fastify.register(proxy, {
        ...transportOptions,
        upstream: NOTIFICATION_SERVICE_URL,
        prefix: '/api/v1/admin/notification-templates',
        rewritePrefix: '/api/v1/admin/notification-templates',
        preHandler: authenticateGateway,
      });

      await fastify.register(proxy, {
        ...transportOptions,
        upstream: AUDIT_SERVICE_URL,
        prefix: '/api/v1/workspaces/:workspaceId/audit-logs',
        rewritePrefix: '/api/v1/workspaces/:workspaceId/audit-logs',
        preHandler: authenticateGateway,
      });

      await fastify.register(proxy, {
        ...transportOptions,
        upstream: IDENTITY_SERVICE_URL,
        prefix: '/api/v1/workspaces',
        rewritePrefix: '/api/v1/workspaces',
        preHandler: authenticateGateway,
      });

      await fastify.register(proxy, {
        ...transportOptions,
        upstream: IDENTITY_SERVICE_URL,
        prefix: '/api/v1/users',
        rewritePrefix: '/api/v1/users',
        preHandler: authenticateGateway,
      });

      // Root-level fallbacks
      await fastify.register(proxy, {
        ...transportOptions,
        upstream: EXPENSE_SERVICE_URL,
        prefix: '/api/v1/expenses',
        rewritePrefix: '/api/v1/expenses',
        preHandler: authenticateGateway,
      });

      await fastify.register(proxy, {
        ...transportOptions,
        upstream: EXPENSE_SERVICE_URL,
        prefix: '/api/v1/budgets',
        rewritePrefix: '/api/v1/budgets',
        preHandler: authenticateGateway,
      });
    }

    // Aggregated health check
    fastify.get('/live', async () => ({
      status: 'OK',
      service: 'API-Gateway',
    }));
    fastify.get('/health', async (_request, reply) => {
      const services = [
        { name: 'identity-access-service', url: IDENTITY_SERVICE_URL },
        { name: 'expense-budgeting-service', url: EXPENSE_SERVICE_URL },
        { name: 'categorization-service', url: CATEGORIZATION_SERVICE_URL },
        { name: 'approval-policy-service', url: APPROVAL_SERVICE_URL },
        { name: 'bank-feed-service', url: BANK_FEED_SERVICE_URL },
        { name: 'receipt-vault-service', url: RECEIPT_SERVICE_URL },
        { name: 'notification-service', url: NOTIFICATION_SERVICE_URL },
        { name: 'audit-compliance-service', url: AUDIT_SERVICE_URL },
      ];

      const results = await Promise.allSettled(
        services.map(async (svc) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          try {
            const res = await fetch(`${svc.url}/health`, {
              signal: controller.signal,
              headers: {
                'x-internal-api-key': INTERNAL_API_KEY,
              },
            });
            clearTimeout(timeout);
            return { name: svc.name, status: res.ok ? 'healthy' : 'unhealthy' };
          } catch {
            clearTimeout(timeout);
            return { name: svc.name, status: 'unreachable' };
          }
        })
      );

      const downstream = results.map((r) =>
        r.status === 'fulfilled'
          ? r.value
          : { name: 'unknown', status: 'error' }
      );

      const allHealthy = downstream.every((d) => d.status === 'healthy');

      reply.code(allHealthy ? 200 : 503);
      return {
        status: allHealthy ? 'OK' : 'DEGRADED',
        service: 'API-Gateway',
        uptime: process.uptime(),
        downstream,
      };
    });

    fastify.setErrorHandler((error, request, reply) => {
      request.log.error({ err: error }, 'Gateway request failed');
      const statusCode =
        error.statusCode && error.statusCode >= 400 && error.statusCode < 500
          ? error.statusCode
          : 500;
      reply
        .code(statusCode)
        .send({
          success: false,
          statusCode,
          message:
            statusCode >= 500 ? 'Unexpected gateway error' : error.message,
        });
    });
    return fastify;
  } catch (error) {
    await fastify.close().catch(() => undefined);
    throw error;
  }
}
