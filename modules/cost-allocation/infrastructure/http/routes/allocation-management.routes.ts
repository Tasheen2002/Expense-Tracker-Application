import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AllocationManagementController } from '../controllers/allocation-management.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { workspaceAuthorizationMiddleware } from '@shared/middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../validation/validator';
import {
  workspaceParamsSchema,
  departmentParamsSchema,
  costCenterParamsSchema,
  projectParamsSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createCostCenterSchema,
  updateCostCenterSchema,
  createProjectSchema,
  updateProjectSchema,
  paginationQuerySchema,
  workspaceParamsJsonSchema,
  departmentParamsJsonSchema,
  costCenterParamsJsonSchema,
  projectParamsJsonSchema,
  createDepartmentBodyJsonSchema,
  updateDepartmentBodyJsonSchema,
  createCostCenterBodyJsonSchema,
  updateCostCenterBodyJsonSchema,
  createProjectBodyJsonSchema,
  updateProjectBodyJsonSchema,
  paginationQueryJsonSchema,
  departmentEnvelopeJsonSchema,
  paginatedDepartmentsEnvelopeJsonSchema,
  costCenterEnvelopeJsonSchema,
  paginatedCostCentersEnvelopeJsonSchema,
  projectEnvelopeJsonSchema,
  paginatedProjectsEnvelopeJsonSchema,
  baseResponseEnvelopeJsonSchema,
} from '../validation/cost-allocation.schema';
import {
  createRateLimiter,
  RateLimitPresets,
  userKeyGenerator,
} from '@shared/middleware/rate-limiter.middleware';
import { requireRole } from '@shared/middleware/role-authorization.middleware';

const writeRateLimiter = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: userKeyGenerator,
});

export async function allocationManagementRoutes(
  fastify: FastifyInstance,
  controller: AllocationManagementController,
  prisma: PrismaClient
) {
  const workspaceAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply, prisma);
  };

  // Apply write rate limiting to all mutation routes via hooks
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  // ==========================================================================
  // Department Routes
  // ==========================================================================

  // Create department
  fastify.post(
    '/workspaces/:workspaceId/departments',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(createDepartmentSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Cost Allocation - Departments'],
        description: 'Create a new department',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createDepartmentBodyJsonSchema,
        response: {
          201: departmentEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createDepartment(request as AuthenticatedRequest, reply)
  );

  // List departments
  fastify.get(
    '/workspaces/:workspaceId/departments',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateQuery(paginationQuerySchema),
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Cost Allocation - Departments'],
        description: 'List all departments in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: paginatedDepartmentsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listDepartments(request as AuthenticatedRequest, reply)
  );

  // Get single department
  fastify.get(
    '/workspaces/:workspaceId/departments/:departmentId',
    {
      preValidation: [validateParams(departmentParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Cost Allocation - Departments'],
        description: 'Get a specific department',
        security: [{ bearerAuth: [] }],
        params: departmentParamsJsonSchema,
        response: {
          200: departmentEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getDepartment(request as AuthenticatedRequest, reply)
  );

  // Update department
  fastify.put(
    '/workspaces/:workspaceId/departments/:departmentId',
    {
      preValidation: [validateParams(departmentParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(updateDepartmentSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Cost Allocation - Departments'],
        description: 'Update a department',
        security: [{ bearerAuth: [] }],
        params: departmentParamsJsonSchema,
        body: updateDepartmentBodyJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateDepartment(request as AuthenticatedRequest, reply)
  );

  // Delete department (soft delete)
  fastify.delete(
    '/workspaces/:workspaceId/departments/:departmentId',
    {
      preValidation: [validateParams(departmentParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Cost Allocation - Departments'],
        description: 'Delete a department (soft delete)',
        security: [{ bearerAuth: [] }],
        params: departmentParamsJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'No Content',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteDepartment(request as AuthenticatedRequest, reply)
  );

  // Activate department
  fastify.patch(
    '/workspaces/:workspaceId/departments/:departmentId/activate',
    {
      preValidation: [validateParams(departmentParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Cost Allocation - Departments'],
        description: 'Activate a department',
        security: [{ bearerAuth: [] }],
        params: departmentParamsJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.activateDepartment(request as AuthenticatedRequest, reply)
  );

  // ==========================================================================
  // Cost Center Routes
  // ==========================================================================

  // Create cost center
  fastify.post(
    '/workspaces/:workspaceId/cost-centers',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(createCostCenterSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Cost Allocation - Cost Centers'],
        description: 'Create a new cost center',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createCostCenterBodyJsonSchema,
        response: {
          201: costCenterEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createCostCenter(request as AuthenticatedRequest, reply)
  );

  // List cost centers
  fastify.get(
    '/workspaces/:workspaceId/cost-centers',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateQuery(paginationQuerySchema),
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Cost Allocation - Cost Centers'],
        description: 'List all cost centers in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: paginatedCostCentersEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listCostCenters(request as AuthenticatedRequest, reply)
  );

  // Get single cost center
  fastify.get(
    '/workspaces/:workspaceId/cost-centers/:costCenterId',
    {
      preValidation: [validateParams(costCenterParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Cost Allocation - Cost Centers'],
        description: 'Get a specific cost center',
        security: [{ bearerAuth: [] }],
        params: costCenterParamsJsonSchema,
        response: {
          200: costCenterEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getCostCenter(request as AuthenticatedRequest, reply)
  );

  // Update cost center
  fastify.put(
    '/workspaces/:workspaceId/cost-centers/:costCenterId',
    {
      preValidation: [validateParams(costCenterParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(updateCostCenterSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Cost Allocation - Cost Centers'],
        description: 'Update a cost center',
        security: [{ bearerAuth: [] }],
        params: costCenterParamsJsonSchema,
        body: updateCostCenterBodyJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateCostCenter(request as AuthenticatedRequest, reply)
  );

  // Delete cost center (soft delete)
  fastify.delete(
    '/workspaces/:workspaceId/cost-centers/:costCenterId',
    {
      preValidation: [validateParams(costCenterParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Cost Allocation - Cost Centers'],
        description: 'Delete a cost center (soft delete)',
        security: [{ bearerAuth: [] }],
        params: costCenterParamsJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'No Content',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteCostCenter(request as AuthenticatedRequest, reply)
  );

  // Activate cost center
  fastify.patch(
    '/workspaces/:workspaceId/cost-centers/:costCenterId/activate',
    {
      preValidation: [validateParams(costCenterParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Cost Allocation - Cost Centers'],
        description: 'Activate a cost center',
        security: [{ bearerAuth: [] }],
        params: costCenterParamsJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.activateCostCenter(request as AuthenticatedRequest, reply)
  );

  // ==========================================================================
  // Project Routes
  // ==========================================================================

  // Create project
  fastify.post(
    '/workspaces/:workspaceId/projects',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(createProjectSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Cost Allocation - Projects'],
        description: 'Create a new project',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        body: createProjectBodyJsonSchema,
        response: {
          201: projectEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.createProject(request as AuthenticatedRequest, reply)
  );

  // List projects
  fastify.get(
    '/workspaces/:workspaceId/projects',
    {
      preValidation: [validateParams(workspaceParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateQuery(paginationQuerySchema),
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Cost Allocation - Projects'],
        description: 'List all projects in workspace',
        security: [{ bearerAuth: [] }],
        params: workspaceParamsJsonSchema,
        querystring: paginationQueryJsonSchema,
        response: {
          200: paginatedProjectsEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.listProjects(request as AuthenticatedRequest, reply)
  );

  // Get single project
  fastify.get(
    '/workspaces/:workspaceId/projects/:projectId',
    {
      preValidation: [validateParams(projectParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin', 'member']),
      ],
      schema: {
        tags: ['Cost Allocation - Projects'],
        description: 'Get a specific project',
        security: [{ bearerAuth: [] }],
        params: projectParamsJsonSchema,
        response: {
          200: projectEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.getProject(request as AuthenticatedRequest, reply)
  );

  // Update project
  fastify.put(
    '/workspaces/:workspaceId/projects/:projectId',
    {
      preValidation: [validateParams(projectParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        validateBody(updateProjectSchema),
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Cost Allocation - Projects'],
        description: 'Update a project',
        security: [{ bearerAuth: [] }],
        params: projectParamsJsonSchema,
        body: updateProjectBodyJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.updateProject(request as AuthenticatedRequest, reply)
  );

  // Delete project (soft delete)
  fastify.delete(
    '/workspaces/:workspaceId/projects/:projectId',
    {
      preValidation: [validateParams(projectParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Cost Allocation - Projects'],
        description: 'Delete a project (soft delete)',
        security: [{ bearerAuth: [] }],
        params: projectParamsJsonSchema,
        response: {
          204: {
            type: 'null',
            description: 'No Content',
          },
        },
      },
    },
    (request, reply) =>
      controller.deleteProject(request as AuthenticatedRequest, reply)
  );

  // Activate project
  fastify.patch(
    '/workspaces/:workspaceId/projects/:projectId/activate',
    {
      preValidation: [validateParams(projectParamsSchema)],
      preHandler: [
        fastify.authenticate,
        workspaceAuth,
        requireRole(['owner', 'admin']),
      ],
      schema: {
        tags: ['Cost Allocation - Projects'],
        description: 'Activate a project',
        security: [{ bearerAuth: [] }],
        params: projectParamsJsonSchema,
        response: {
          200: baseResponseEnvelopeJsonSchema,
        },
      },
    },
    (request, reply) =>
      controller.activateProject(request as AuthenticatedRequest, reply)
  );
}
