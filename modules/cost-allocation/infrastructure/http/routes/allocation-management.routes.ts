import { FastifyInstance } from "fastify";
import { AllocationManagementController } from "../controllers/allocation-management.controller";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

export async function allocationManagementRoutes(
  fastify: FastifyInstance,
  controller: AllocationManagementController,
) {
  // ==========================================
  // Department Routes
  // ==========================================

  // Create department
  fastify.post(
    "/:workspaceId/departments",
    {
      schema: {
        tags: ["Cost Allocation - Departments"],
        description: "Create a new department",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["name", "code"],
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            code: { type: "string", minLength: 2, maxLength: 20 },
            description: { type: "string" },
            managerId: { type: "string", format: "uuid" },
            parentDepartmentId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.createDepartment(request as AuthenticatedRequest, reply),
  );

  // List departments
  fastify.get(
    "/:workspaceId/departments",
    {
      schema: {
        tags: ["Cost Allocation - Departments"],
        description: "List all departments in workspace",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "string" },
            offset: { type: "string" },
          },
        },
      },
    },
    (request, reply) => controller.listDepartments(request as AuthenticatedRequest, reply),
  );

  // Get single department
  fastify.get(
    "/:workspaceId/departments/:departmentId",
    {
      schema: {
        tags: ["Cost Allocation - Departments"],
        description: "Get a specific department",
        params: {
          type: "object",
          required: ["workspaceId", "departmentId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            departmentId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getDepartment(request as AuthenticatedRequest, reply),
  );

  // Update department
  fastify.put(
    "/:workspaceId/departments/:departmentId",
    {
      schema: {
        tags: ["Cost Allocation - Departments"],
        description: "Update a department",
        params: {
          type: "object",
          required: ["workspaceId", "departmentId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            departmentId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            code: { type: "string", minLength: 2, maxLength: 20 },
            description: { type: "string", nullable: true },
            managerId: { type: "string", format: "uuid", nullable: true },
            parentDepartmentId: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
          },
        },
      },
    },
    (request, reply) => controller.updateDepartment(request as AuthenticatedRequest, reply),
  );

  // Delete department (soft delete)
  fastify.delete(
    "/:workspaceId/departments/:departmentId",
    {
      schema: {
        tags: ["Cost Allocation - Departments"],
        description: "Delete a department (soft delete)",
        params: {
          type: "object",
          required: ["workspaceId", "departmentId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            departmentId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.deleteDepartment(request as AuthenticatedRequest, reply),
  );

  // Activate department
  fastify.patch(
    "/:workspaceId/departments/:departmentId/activate",
    {
      schema: {
        tags: ["Cost Allocation - Departments"],
        description: "Activate a department",
        params: {
          type: "object",
          required: ["workspaceId", "departmentId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            departmentId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.activateDepartment(request as AuthenticatedRequest, reply),
  );

  // ==========================================
  // Cost Center Routes
  // ==========================================

  // Create cost center
  fastify.post(
    "/:workspaceId/cost-centers",
    {
      schema: {
        tags: ["Cost Allocation - Cost Centers"],
        description: "Create a new cost center",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["name", "code"],
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            code: { type: "string", minLength: 2, maxLength: 20 },
            description: { type: "string" },
          },
        },
      },
    },
    (request, reply) => controller.createCostCenter(request as AuthenticatedRequest, reply),
  );

  // List cost centers
  fastify.get(
    "/:workspaceId/cost-centers",
    {
      schema: {
        tags: ["Cost Allocation - Cost Centers"],
        description: "List all cost centers in workspace",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "string" },
            offset: { type: "string" },
          },
        },
      },
    },
    (request, reply) => controller.listCostCenters(request as AuthenticatedRequest, reply),
  );

  // Get single cost center
  fastify.get(
    "/:workspaceId/cost-centers/:costCenterId",
    {
      schema: {
        tags: ["Cost Allocation - Cost Centers"],
        description: "Get a specific cost center",
        params: {
          type: "object",
          required: ["workspaceId", "costCenterId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            costCenterId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getCostCenter(request as AuthenticatedRequest, reply),
  );

  // Update cost center
  fastify.put(
    "/:workspaceId/cost-centers/:costCenterId",
    {
      schema: {
        tags: ["Cost Allocation - Cost Centers"],
        description: "Update a cost center",
        params: {
          type: "object",
          required: ["workspaceId", "costCenterId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            costCenterId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            code: { type: "string", minLength: 2, maxLength: 20 },
            description: { type: "string", nullable: true },
          },
        },
      },
    },
    (request, reply) => controller.updateCostCenter(request as AuthenticatedRequest, reply),
  );

  // Delete cost center (soft delete)
  fastify.delete(
    "/:workspaceId/cost-centers/:costCenterId",
    {
      schema: {
        tags: ["Cost Allocation - Cost Centers"],
        description: "Delete a cost center (soft delete)",
        params: {
          type: "object",
          required: ["workspaceId", "costCenterId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            costCenterId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.deleteCostCenter(request as AuthenticatedRequest, reply),
  );

  // Activate cost center
  fastify.patch(
    "/:workspaceId/cost-centers/:costCenterId/activate",
    {
      schema: {
        tags: ["Cost Allocation - Cost Centers"],
        description: "Activate a cost center",
        params: {
          type: "object",
          required: ["workspaceId", "costCenterId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            costCenterId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.activateCostCenter(request as AuthenticatedRequest, reply),
  );

  // ==========================================
  // Project Routes
  // ==========================================

  // Create project
  fastify.post(
    "/:workspaceId/projects",
    {
      schema: {
        tags: ["Cost Allocation - Projects"],
        description: "Create a new project",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["name", "code", "startDate"],
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            code: { type: "string", minLength: 2, maxLength: 20 },
            startDate: { type: "string", format: "date-time" },
            description: { type: "string" },
            endDate: { type: "string", format: "date-time" },
            managerId: { type: "string", format: "uuid" },
            budget: { type: "number", minimum: 0 },
          },
        },
      },
    },
    (request, reply) => controller.createProject(request as AuthenticatedRequest, reply),
  );

  // List projects
  fastify.get(
    "/:workspaceId/projects",
    {
      schema: {
        tags: ["Cost Allocation - Projects"],
        description: "List all projects in workspace",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "string" },
            offset: { type: "string" },
          },
        },
      },
    },
    (request, reply) => controller.listProjects(request as AuthenticatedRequest, reply),
  );

  // Get single project
  fastify.get(
    "/:workspaceId/projects/:projectId",
    {
      schema: {
        tags: ["Cost Allocation - Projects"],
        description: "Get a specific project",
        params: {
          type: "object",
          required: ["workspaceId", "projectId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            projectId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getProject(request as AuthenticatedRequest, reply),
  );

  // Update project
  fastify.put(
    "/:workspaceId/projects/:projectId",
    {
      schema: {
        tags: ["Cost Allocation - Projects"],
        description: "Update a project",
        params: {
          type: "object",
          required: ["workspaceId", "projectId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            projectId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 100 },
            code: { type: "string", minLength: 2, maxLength: 20 },
            description: { type: "string", nullable: true },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time", nullable: true },
            managerId: { type: "string", format: "uuid", nullable: true },
            budget: { type: "number", minimum: 0, nullable: true },
          },
        },
      },
    },
    (request, reply) => controller.updateProject(request as AuthenticatedRequest, reply),
  );

  // Delete project (soft delete)
  fastify.delete(
    "/:workspaceId/projects/:projectId",
    {
      schema: {
        tags: ["Cost Allocation - Projects"],
        description: "Delete a project (soft delete)",
        params: {
          type: "object",
          required: ["workspaceId", "projectId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            projectId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.deleteProject(request as AuthenticatedRequest, reply),
  );

  // Activate project
  fastify.patch(
    "/:workspaceId/projects/:projectId/activate",
    {
      schema: {
        tags: ["Cost Allocation - Projects"],
        description: "Activate a project",
        params: {
          type: "object",
          required: ["workspaceId", "projectId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            projectId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.activateProject(request as AuthenticatedRequest, reply),
  );
}
