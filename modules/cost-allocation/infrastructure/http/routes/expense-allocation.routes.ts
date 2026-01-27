import { FastifyInstance } from "fastify";
import { ExpenseAllocationController } from "../controllers/expense-allocation.controller";

export async function expenseAllocationRoutes(
  fastify: FastifyInstance,
  controller: ExpenseAllocationController,
) {
  // Allocate expense to departments/cost centers/projects
  fastify.post(
    "/:workspaceId/expenses/:expenseId/allocations",
    {
      schema: {
        tags: ["Cost Allocation - Expense Allocations"],
        description: "Allocate expense to departments, cost centers, or projects",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["allocations"],
          properties: {
            allocations: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["amount"],
                properties: {
                  amount: { type: "number", minimum: 0.01 },
                  percentage: { type: "number", minimum: 0, maximum: 100 },
                  departmentId: { type: "string", format: "uuid" },
                  costCenterId: { type: "string", format: "uuid" },
                  projectId: { type: "string", format: "uuid" },
                  notes: { type: "string", maxLength: 500 },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.allocateExpense(request as any, reply),
  );

  // Get expense allocations
  fastify.get(
    "/:workspaceId/expenses/:expenseId/allocations",
    {
      schema: {
        tags: ["Cost Allocation - Expense Allocations"],
        description: "Get all allocations for an expense",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getAllocations(request as any, reply),
  );

  // Delete expense allocations
  fastify.delete(
    "/:workspaceId/expenses/:expenseId/allocations",
    {
      schema: {
        tags: ["Cost Allocation - Expense Allocations"],
        description: "Delete all allocations for an expense",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.deleteAllocations(request as any, reply),
  );

  // Get allocation summary for workspace
  fastify.get(
    "/:workspaceId/allocations/summary",
    {
      schema: {
        tags: ["Cost Allocation - Expense Allocations"],
        description: "Get allocation summary statistics for workspace",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getAllocationSummary(request as any, reply),
  );
}
