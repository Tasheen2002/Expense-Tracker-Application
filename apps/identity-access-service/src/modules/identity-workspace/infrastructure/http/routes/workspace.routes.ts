import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WorkspaceController } from '../controllers/workspace.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { RolePermissions } from '@shared/middleware/role-authorization.middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  validateBody,
  validateQuery,
} from '../validation/validator';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  paginationQuerySchema,
  workspaceParamsJsonSchema,
  paginationQueryJsonSchema,
  createWorkspaceBodyJsonSchema,
  updateWorkspaceBodyJsonSchema,
  workspaceEnvelopeJsonSchema,
  workspaceListEnvelopeJsonSchema,
} from '../validation/workspace.schema';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

/**
 * User-level workspace routes
 */
export async function registerUserWorkspaceRoutes(
  fastify: FastifyInstance,
  controller: WorkspaceController
) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Create workspace
  fastify.post(
    '/workspaces',
    {
      onRequest: [fastify.authenticate],
      preHandler: [validateBody(createWorkspaceSchema)],
      schema: {
        tags: ['Workspace'],
        description: 'Create a new workspace',
        security: [{ bearerAuth: [] }],
        body: createWorkspaceBodyJsonSchema,
        response: {
          201: workspaceEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createWorkspace(request as AuthenticatedRequest, reply)
  );

  // List user's workspaces
  fastify.get(
    '/workspaces',
    {
      onRequest: [fastify.authenticate],
      preHandler: [validateQuery(paginationQuerySchema)],
      schema: {
        tags: ['Workspace'],
        description: 'Get all workspaces for the authenticated user',
        security: [{ bearerAuth: [] }],
        querystring: paginationQueryJsonSchema,
        response: {
          200: workspaceListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getUserWorkspaces(request as AuthenticatedRequest, reply)
  );
}

/**
 * Workspace-scoped routes
 */
export async function registerWorkspaceScopedRoutes(
  fastify: FastifyInstance,
  controller: WorkspaceController
): Promise<void> {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(
      request as AuthenticatedRequest,
      reply,
      request.server.prisma
    );
  };

  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // Get workspace by ID
  fastify.get(
    '/workspaces/:workspaceId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
      ],
      schema: {
        tags: ['Workspace'],
        description: 'Get workspace by ID',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        response: {
          200: workspaceEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getWorkspace(request as AuthenticatedRequest, reply)
  );

  // Update workspace
  fastify.patch(
    '/workspaces/:workspaceId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        validateBody(updateWorkspaceSchema),
        workspaceAuth,
        RolePermissions.ADMIN_LEVEL,
      ],
      schema: {
        tags: ['Workspace'],
        description: 'Update workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: updateWorkspaceBodyJsonSchema,
        response: {
          200: workspaceEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateWorkspace(request as AuthenticatedRequest, reply)
  );

  // Delete workspace
  fastify.delete(
    '/workspaces/:workspaceId',
    {
      onRequest: [fastify.authenticate],
      preHandler: [
        workspaceAuth,
        RolePermissions.OWNER_ONLY,
      ],
      schema: {
        tags: ['Workspace'],
        description: 'Delete workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        response: {
          204: {
            description: 'Workspace deleted successfully',
            type: 'null',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteWorkspace(request as AuthenticatedRequest, reply)
  );
}
