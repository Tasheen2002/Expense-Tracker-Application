import { FastifyInstance } from "fastify";
import { ExpenseSplitController } from "../controllers/expense-split.controller";

export async function expenseSplitRoutes(
  fastify: FastifyInstance,
  controller: ExpenseSplitController,
) {
  fastify.post(
    "/:workspaceId/expenses/:expenseId/split",
    {
      schema: {
        tags: ["Expense Split"],
        description: "Create an expense split",
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
          required: ["splitType", "participants"],
          properties: {
            splitType: {
              type: "string",
              enum: ["EQUAL", "EXACT", "PERCENTAGE"],
            },
            participants: {
              type: "array",
              minItems: 2,
              items: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: { type: "string", format: "uuid" },
                  shareAmount: { type: "number", minimum: 0.01 },
                  sharePercentage: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.createSplit(request as any, reply),
  );

  fastify.get(
    "/:workspaceId/splits/:splitId",
    {
      schema: {
        tags: ["Expense Split"],
        description: "Get split by ID",
        params: {
          type: "object",
          required: ["workspaceId", "splitId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            splitId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getSplit(request as any, reply),
  );

  fastify.get(
    "/:workspaceId/expenses/:expenseId/split",
    {
      schema: {
        tags: ["Expense Split"],
        description: "Get split by expense ID",
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
    (request, reply) => controller.getSplitByExpense(request as any, reply),
  );

  fastify.get(
    "/:workspaceId/splits",
    {
      schema: {
        tags: ["Expense Split"],
        description: "List user's splits",
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
    (request, reply) => controller.listUserSplits(request as any, reply),
  );

  fastify.delete(
    "/:workspaceId/splits/:splitId",
    {
      schema: {
        tags: ["Expense Split"],
        description: "Delete split",
        params: {
          type: "object",
          required: ["workspaceId", "splitId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            splitId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.deleteSplit(request as any, reply),
  );

  fastify.post(
    "/:workspaceId/settlements/:settlementId/payment",
    {
      schema: {
        tags: ["Split Settlement"],
        description: "Record a payment for settlement",
        params: {
          type: "object",
          required: ["workspaceId", "settlementId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            settlementId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["amount"],
          properties: {
            amount: { type: "number", minimum: 0.01 },
          },
        },
      },
    },
    (request, reply) => controller.recordPayment(request as any, reply),
  );

  fastify.get(
    "/:workspaceId/settlements",
    {
      schema: {
        tags: ["Split Settlement"],
        description: "List user's settlements",
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
            status: {
              type: "string",
              enum: ["PENDING", "PARTIAL", "SETTLED"],
            },
            limit: { type: "string" },
            offset: { type: "string" },
          },
        },
      },
    },
    (request, reply) => controller.listUserSettlements(request as any, reply),
  );

  fastify.get(
    "/:workspaceId/splits/:splitId/settlements",
    {
      schema: {
        tags: ["Split Settlement"],
        description: "Get settlements for a split",
        params: {
          type: "object",
          required: ["workspaceId", "splitId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            splitId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    (request, reply) => controller.getSplitSettlements(request as any, reply),
  );
}
