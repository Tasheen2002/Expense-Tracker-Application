import { FastifyInstance } from 'fastify';
import { WorkspaceController } from '../controllers/workspace.controller';
import { validateBody, validateQuery } from '../validation/validator';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  paginationQuerySchema,
  transferOwnershipSchema,
  workspaceParamsJsonSchema,
  paginationQueryJsonSchema,
  createWorkspaceBodyJsonSchema,
  updateWorkspaceBodyJsonSchema,
  transferOwnershipBodyJsonSchema,
  workspaceEnvelopeJsonSchema,
  workspaceListEnvelopeJsonSchema,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  TransferOwnershipInput,
  WorkspaceParams,
  PaginationQuery,
} from '../validation/workspace.schema';

const writeRateLimit = { rateLimit: { max: 30, timeWindow: '1 minute' } };

export async function registerUserWorkspaceRoutes(
  app: FastifyInstance,
  controller: WorkspaceController
): Promise<void> {
  // 1. Create Workspace
  app.post<{ Body: CreateWorkspaceInput }>(
    '/workspaces',
    {
      onRequest: [app.authenticate],
      config: writeRateLimit,
      preHandler: [validateBody(createWorkspaceSchema)],
      schema: {
        body: createWorkspaceBodyJsonSchema,
        response: {
          201: workspaceEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.createWorkspace(request, reply)
  );

  // 2. List Workspaces for User
  app.get<{ Querystring: PaginationQuery }>(
    '/workspaces',
    {
      onRequest: [app.authenticate],
      preHandler: [validateQuery(paginationQuerySchema)],
      schema: {
        querystring: paginationQueryJsonSchema,
        response: {
          200: workspaceListEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.getUserWorkspaces(request, reply)
  );
}

export async function registerWorkspaceScopedRoutes(
  app: FastifyInstance,
  controller: WorkspaceController
): Promise<void> {
  // 3. Get Workspace by ID
  app.get<{ Params: WorkspaceParams }>(
    '/workspaces/:workspaceId',
    {
      onRequest: [app.authenticate],
      schema: {
        params: workspaceParamsJsonSchema,
        response: {
          200: workspaceEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.getWorkspace(request, reply)
  );

  // 4. Update Workspace
  app.patch<{ Params: WorkspaceParams; Body: UpdateWorkspaceInput }>(
    '/workspaces/:workspaceId',
    {
      onRequest: [app.authenticate],
      config: writeRateLimit,
      preHandler: [validateBody(updateWorkspaceSchema)],
      schema: {
        params: workspaceParamsJsonSchema,
        body: updateWorkspaceBodyJsonSchema,
        response: {
          200: workspaceEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.updateWorkspace(request, reply)
  );

  // 5. Delete Workspace
  app.delete<{ Params: WorkspaceParams }>(
    '/workspaces/:workspaceId',
    {
      onRequest: [app.authenticate],
      config: writeRateLimit,
      schema: {
        params: workspaceParamsJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'Workspace deleted successfully',
          },
        },
      },
    },
    (request, reply) => controller.deleteWorkspace(request, reply)
  );

  // 6. Transfer Workspace Ownership
  app.post<{ Params: WorkspaceParams; Body: TransferOwnershipInput }>(
    '/workspaces/:workspaceId/ownership/transfer',
    {
      onRequest: [app.authenticate],
      config: writeRateLimit,
      preHandler: [validateBody(transferOwnershipSchema)],
      schema: {
        params: workspaceParamsJsonSchema,
        body: transferOwnershipBodyJsonSchema,
        response: {
          200: workspaceEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) => controller.transferOwnership(request, reply)
  );
}

export async function registerWorkspaceRoutes(
  app: FastifyInstance,
  controller: WorkspaceController
): Promise<void> {
  await registerUserWorkspaceRoutes(app, controller);
  await registerWorkspaceScopedRoutes(app, controller);
}
