import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import proxy from '@fastify/http-proxy';
import jwt from 'jsonwebtoken';

const fastify = Fastify({
  logger: true,
});

const PORT = parseInt(process.env.PORT || '3001', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me-for-ci-runs';

// Bounded Contexts Downstream Services URLs
const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3002';
const EXPENSE_SERVICE_URL = process.env.EXPENSE_SERVICE_URL || 'http://localhost:3003';
const CATEGORIZATION_SERVICE_URL = process.env.CATEGORIZATION_SERVICE_URL || 'http://localhost:3004';
const APPROVAL_SERVICE_URL = process.env.APPROVAL_SERVICE_URL || 'http://localhost:3005';
const BANK_FEED_SERVICE_URL = process.env.BANK_FEED_SERVICE_URL || 'http://localhost:3006';
const RECEIPT_SERVICE_URL = process.env.RECEIPT_SERVICE_URL || 'http://localhost:3007';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';
const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://localhost:3009';

interface JWTPayload {
  userId: string;
  email: string;
  workspaceId?: string;
}

// Register global plugins
fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});
fastify.register(helmet, {
  contentSecurityPolicy: false,
});

// ============================================================================
// Secure Authentication Middleware (Gateway-level)
// ============================================================================

async function authenticateGateway(req: any, reply: any) {
  // 1. Defend against header injection by stripping pre-existing downstream context headers
  delete req.headers['x-user-id'];
  delete req.headers['x-user-email'];
  delete req.headers['x-workspace-id'];

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
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // 2. Inject verified context headers to propagate downstream
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    if (decoded.workspaceId) {
      req.headers['x-workspace-id'] = decoded.workspaceId;
    }
  } catch (error) {
    return reply.code(401).send({
      success: false,
      statusCode: 401,
      message: 'Authentication failed: Invalid or expired token',
    });
  }
}

// ============================================================================
// Downstream HTTP Proxies
// ============================================================================

// --- PUBLIC: Authentication ---
fastify.register(proxy, {
  upstream: IDENTITY_SERVICE_URL,
  prefix: '/api/v1/auth',
  rewritePrefix: '/api/v1/auth',
  preHandler: async (req) => {
    // Strip context headers even for public routes to block spoofing attempts
    delete req.headers['x-user-id'];
    delete req.headers['x-user-email'];
    delete req.headers['x-workspace-id'];
  },
});

// --- PRIVATE: Workspace and Membership management ---
fastify.register(proxy, {
  upstream: IDENTITY_SERVICE_URL,
  prefix: '/api/v1/workspaces',
  rewritePrefix: '/api/v1/workspaces',
  preHandler: authenticateGateway,
});

fastify.register(proxy, {
  upstream: IDENTITY_SERVICE_URL,
  prefix: '/api/v1/users',
  rewritePrefix: '/api/v1/users',
  preHandler: authenticateGateway,
});

// --- PRIVATE: Expenses, Budgets, Allocations ---
fastify.register(proxy, {
  upstream: EXPENSE_SERVICE_URL,
  prefix: '/api/v1/expenses',
  rewritePrefix: '/api/v1/expenses',
  preHandler: authenticateGateway,
});

fastify.register(proxy, {
  upstream: EXPENSE_SERVICE_URL,
  prefix: '/api/v1/budgets',
  rewritePrefix: '/api/v1/budgets',
  preHandler: authenticateGateway,
});

fastify.register(proxy, {
  upstream: EXPENSE_SERVICE_URL,
  prefix: '/api/v1/budget-plans',
  rewritePrefix: '/api/v1/budget-plans',
  preHandler: authenticateGateway,
});

fastify.register(proxy, {
  upstream: EXPENSE_SERVICE_URL,
  prefix: '/api/v1/departments',
  rewritePrefix: '/api/v1/departments',
  preHandler: authenticateGateway,
});

fastify.register(proxy, {
  upstream: EXPENSE_SERVICE_URL,
  prefix: '/api/v1/cost-centers',
  rewritePrefix: '/api/v1/cost-centers',
  preHandler: authenticateGateway,
});

fastify.register(proxy, {
  upstream: EXPENSE_SERVICE_URL,
  prefix: '/api/v1/projects',
  rewritePrefix: '/api/v1/projects',
  preHandler: authenticateGateway,
});

fastify.register(proxy, {
  upstream: EXPENSE_SERVICE_URL,
  prefix: '/api/v1/inventory',
  rewritePrefix: '/api/v1/inventory',
  preHandler: authenticateGateway,
});

// --- PRIVATE: Categorization ---
fastify.register(proxy, {
  upstream: CATEGORIZATION_SERVICE_URL,
  prefix: '/api/v1/category-rules',
  rewritePrefix: '/api/v1/category-rules',
  preHandler: authenticateGateway,
});

// --- PRIVATE: Approval Policies ---
fastify.register(proxy, {
  upstream: APPROVAL_SERVICE_URL,
  prefix: '/api/v1/approval-chains',
  rewritePrefix: '/api/v1/approval-chains',
  preHandler: authenticateGateway,
});

// --- PRIVATE: Bank Feed Sync ---
fastify.register(proxy, {
  upstream: BANK_FEED_SERVICE_URL,
  prefix: '/api/v1/bank-feeds',
  rewritePrefix: '/api/v1/bank-feeds',
  preHandler: authenticateGateway,
});

// --- PRIVATE: Receipt Vault ---
fastify.register(proxy, {
  upstream: RECEIPT_SERVICE_URL,
  prefix: '/api/v1/receipts',
  rewritePrefix: '/api/v1/receipts',
  preHandler: authenticateGateway,
});

// --- PRIVATE: Notifications ---
fastify.register(proxy, {
  upstream: NOTIFICATION_SERVICE_URL,
  prefix: '/api/v1/notifications',
  rewritePrefix: '/api/v1/notifications',
  preHandler: authenticateGateway,
});

// --- PRIVATE: Audit Logs ---
fastify.register(proxy, {
  upstream: AUDIT_SERVICE_URL,
  prefix: '/api/v1/audit-logs',
  rewritePrefix: '/api/v1/audit-logs',
  preHandler: authenticateGateway,
});

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'OK', service: 'API-Gateway' };
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[API-Gateway] Running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
