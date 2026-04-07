import { FastifyInstance } from 'fastify';
import { AllocationManagementController } from '../controllers/allocation-management.controller';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
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
  controller: AllocationManagementController
) {
  // Apply write rate limiting to all mutation routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'GET') {
      await writeRateLimiter(request, reply);
    }
  });

  const departmentSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      workspaceId: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      code: { type: 'string' },
      description: { type: 'string', nullable: true },
      managerId: { type: 'string', nullable: true },
      parentDepartmentId: { type: 'string', nullable: true },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  };

  const costCenterSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      workspaceId: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      code: { type: 'string' },
      description: { type: 'string', nullable: true },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  };

  const projectSchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      workspaceId: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      code: { type: 'string' },
      description: { type: 'string', nullable: true },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time', nullable: true },
      managerId: { type: 'string', nullable: true },
      budget: { type: 'number', nullable: true },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  };

  const commandResponseSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      statusCode: { type: 'number' },
      message: { type: 'string' },
      data: { type: 'null' },
    },
  };

  // ==========================================
  // Department Routes
  // ==========================================

  // Create department
  fastify.post(
    '/workspaces/:workspaceId/departments',
    {
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Departments'],
        description: 'Create a new department',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['name', 'code'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            code: { type: 'string', minLength: 2, maxLength: 20 },
            description: { type: 'string' },
            managerId: { type: 'string', format: 'uuid' },
            parentDepartmentId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          201: {
            description: 'Department created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: departmentSchema,
            },
          },
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
      preHandler: [requireRole(['owner', 'admin', 'member'])],
      schema: {
        tags: ['Cost Allocation - Departments'],
        description: 'List all departments in workspace',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1 },
            offset: { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: {
            description: 'Departments retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: departmentSchema },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      limit: { type: 'number' },
                      offset: { type: 'number' },
                      hasMore: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
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
      preHandler: [requireRole(['owner', 'admin', 'member'])],
      schema: {
        tags: ['Cost Allocation - Departments'],
        description: 'Get a specific department',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'departmentId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            departmentId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Department retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: departmentSchema,
            },
          },
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
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Departments'],
        description: 'Update a department',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'departmentId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            departmentId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            code: { type: 'string', minLength: 2, maxLength: 20 },
            description: { type: 'string', nullable: true },
            managerId: { type: 'string', format: 'uuid', nullable: true },
            parentDepartmentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
          },
        },
        response: {
          200: {
            description: 'Department updated successfully',
            ...commandResponseSchema,
          },
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
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Departments'],
        description: 'Delete a department (soft delete)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'departmentId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            departmentId: { type: 'string', format: 'uuid' },
          },
        },
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
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Departments'],
        description: 'Activate a department',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'departmentId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            departmentId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Department activated successfully',
            ...commandResponseSchema,
          },
        },
      },
    },
    (request, reply) =>
      controller.activateDepartment(request as AuthenticatedRequest, reply)
  );

  // ==========================================
  // Cost Center Routes
  // ==========================================

  // Create cost center
  fastify.post(
    '/workspaces/:workspaceId/cost-centers',
    {
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Cost Centers'],
        description: 'Create a new cost center',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['name', 'code'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            code: { type: 'string', minLength: 2, maxLength: 20 },
            description: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'Cost center created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: costCenterSchema,
            },
          },
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
      preHandler: [requireRole(['owner', 'admin', 'member'])],
      schema: {
        tags: ['Cost Allocation - Cost Centers'],
        description: 'List all cost centers in workspace',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1 },
            offset: { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: {
            description: 'Cost centers retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: costCenterSchema },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      limit: { type: 'number' },
                      offset: { type: 'number' },
                      hasMore: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
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
      preHandler: [requireRole(['owner', 'admin', 'member'])],
      schema: {
        tags: ['Cost Allocation - Cost Centers'],
        description: 'Get a specific cost center',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'costCenterId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            costCenterId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Cost center retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: costCenterSchema,
            },
          },
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
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Cost Centers'],
        description: 'Update a cost center',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'costCenterId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            costCenterId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            code: { type: 'string', minLength: 2, maxLength: 20 },
            description: { type: 'string', nullable: true },
          },
        },
        response: {
          200: {
            description: 'Cost center updated successfully',
            ...commandResponseSchema,
          },
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
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Cost Centers'],
        description: 'Delete a cost center (soft delete)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'costCenterId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            costCenterId: { type: 'string', format: 'uuid' },
          },
        },
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
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Cost Centers'],
        description: 'Activate a cost center',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'costCenterId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            costCenterId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Cost center activated successfully',
            ...commandResponseSchema,
          },
        },
      },
    },
    (request, reply) =>
      controller.activateCostCenter(request as AuthenticatedRequest, reply)
  );

  // ==========================================
  // Project Routes
  // ==========================================

  // Create project
  fastify.post(
    '/workspaces/:workspaceId/projects',
    {
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Projects'],
        description: 'Create a new project',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['name', 'code', 'startDate'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            code: { type: 'string', minLength: 2, maxLength: 20 },
            startDate: { type: 'string', format: 'date-time' },
            description: { type: 'string' },
            endDate: { type: 'string', format: 'date-time' },
            managerId: { type: 'string', format: 'uuid' },
            budget: { type: 'number', minimum: 0 },
          },
        },
        response: {
          201: {
            description: 'Project created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: projectSchema,
            },
          },
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
      preHandler: [requireRole(['owner', 'admin', 'member'])],
      schema: {
        tags: ['Cost Allocation - Projects'],
        description: 'List all projects in workspace',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1 },
            offset: { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: {
            description: 'Projects retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: projectSchema },
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'number' },
                      limit: { type: 'number' },
                      offset: { type: 'number' },
                      hasMore: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
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
      preHandler: [requireRole(['owner', 'admin', 'member'])],
      schema: {
        tags: ['Cost Allocation - Projects'],
        description: 'Get a specific project',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'projectId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Project retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              data: projectSchema,
            },
          },
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
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Projects'],
        description: 'Update a project',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'projectId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            code: { type: 'string', minLength: 2, maxLength: 20 },
            description: { type: 'string', nullable: true },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time', nullable: true },
            managerId: { type: 'string', format: 'uuid', nullable: true },
            budget: { type: 'number', minimum: 0, nullable: true },
          },
        },
        response: {
          200: {
            description: 'Project updated successfully',
            ...commandResponseSchema,
          },
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
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Projects'],
        description: 'Delete a project (soft delete)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'projectId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
          },
        },
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
      preHandler: [requireRole(['owner', 'admin'])],
      schema: {
        tags: ['Cost Allocation - Projects'],
        description: 'Activate a project',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['workspaceId', 'projectId'],
          properties: {
            workspaceId: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Project activated successfully',
            ...commandResponseSchema,
          },
        },
      },
    },
    (request, reply) =>
      controller.activateProject(request as AuthenticatedRequest, reply)
  );
}
