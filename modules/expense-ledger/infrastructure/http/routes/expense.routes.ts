import { FastifyInstance } from "fastify";
import { ExpenseController } from "../controllers/expense.controller";

export async function expenseRoutes(
  fastify: FastifyInstance,
  controller: ExpenseController,
) {
  // Create expense
  fastify.post(
    "/:workspaceId/expenses",
    {
      schema: {
        tags: ["Expense"],
        description: "Create a new expense",
        params: {
          type: "object",
          required: ["workspaceId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: [
            "title",
            "amount",
            "currency",
            "expenseDate",
            "paymentMethod",
            "isReimbursable",
          ],
          properties: {
            title: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: "string", maxLength: 5000 },
            amount: { type: "number", minimum: 0 },
            currency: { type: "string", minLength: 3, maxLength: 3 },
            expenseDate: { type: "string", format: "date" },
            categoryId: { type: "string", format: "uuid" },
            merchant: { type: "string", maxLength: 255 },
            paymentMethod: {
              type: "string",
              enum: [
                "CASH",
                "CREDIT_CARD",
                "DEBIT_CARD",
                "BANK_TRANSFER",
                "CHECK",
                "DIGITAL_WALLET",
                "OTHER",
              ],
            },
            isReimbursable: { type: "boolean" },
            tagIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
            },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  expenseId: { type: "string" },
                  workspaceId: { type: "string" },
                  userId: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  amount: { type: "string" },
                  currency: { type: "string" },
                  expenseDate: { type: "string" },
                  categoryId: { type: "string" },
                  merchant: { type: "string" },
                  paymentMethod: { type: "string" },
                  isReimbursable: { type: "boolean" },
                  status: { type: "string" },
                  createdAt: { type: "string" },
                  updatedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.createExpense(request as any, reply),
  );

  // Update expense
  fastify.put(
    "/:workspaceId/expenses/:expenseId",
    {
      schema: {
        tags: ["Expense"],
        description: "Update an expense",
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
          properties: {
            title: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: "string", maxLength: 5000 },
            amount: { type: "number", minimum: 0 },
            currency: { type: "string", minLength: 3, maxLength: 3 },
            expenseDate: { type: "string", format: "date" },
            categoryId: { type: "string", format: "uuid" },
            merchant: { type: "string", maxLength: 255 },
            paymentMethod: {
              type: "string",
              enum: [
                "CASH",
                "CREDIT_CARD",
                "DEBIT_CARD",
                "BANK_TRANSFER",
                "CHECK",
                "DIGITAL_WALLET",
                "OTHER",
              ],
            },
            isReimbursable: { type: "boolean" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  expenseId: { type: "string" },
                  workspaceId: { type: "string" },
                  userId: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  amount: { type: "string" },
                  currency: { type: "string" },
                  expenseDate: { type: "string" },
                  categoryId: { type: "string" },
                  merchant: { type: "string" },
                  paymentMethod: { type: "string" },
                  isReimbursable: { type: "boolean" },
                  status: { type: "string" },
                  updatedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.updateExpense(request as any, reply),
  );

  // Delete expense
  fastify.delete(
    "/:workspaceId/expenses/:expenseId",
    {
      schema: {
        tags: ["Expense"],
        description: "Delete an expense",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    (request, reply) => controller.deleteExpense(request as any, reply),
  );

  // Get expense by ID
  fastify.get(
    "/:workspaceId/expenses/:expenseId",
    {
      schema: {
        tags: ["Expense"],
        description: "Get expense by ID",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  expenseId: { type: "string" },
                  workspaceId: { type: "string" },
                  userId: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  amount: { type: "string" },
                  currency: { type: "string" },
                  expenseDate: { type: "string" },
                  categoryId: { type: "string" },
                  merchant: { type: "string" },
                  paymentMethod: { type: "string" },
                  isReimbursable: { type: "boolean" },
                  status: { type: "string" },
                  tagIds: { type: "array", items: { type: "string" } },
                  attachmentIds: { type: "array", items: { type: "string" } },
                  createdAt: { type: "string" },
                  updatedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.getExpense(request as any, reply),
  );

  // List expenses
  fastify.get(
    "/:workspaceId/expenses",
    {
      schema: {
        tags: ["Expense"],
        description: "List all expenses",
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
            userId: { type: "string", format: "uuid" },
            limit: { type: "string" },
            offset: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        expenseId: { type: "string" },
                        workspaceId: { type: "string" },
                        userId: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        amount: { type: "string" },
                        currency: { type: "string" },
                        expenseDate: { type: "string" },
                        categoryId: { type: "string" },
                        merchant: { type: "string" },
                        paymentMethod: { type: "string" },
                        isReimbursable: { type: "boolean" },
                        status: { type: "string" },
                        createdAt: { type: "string" },
                        updatedAt: { type: "string" },
                      },
                    },
                  },
                  pagination: {
                    type: "object",
                    properties: {
                      total: { type: "number" },
                      limit: { type: "number" },
                      offset: { type: "number" },
                      hasMore: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.listExpenses(request as any, reply),
  );

  // Filter expenses
  fastify.get(
    "/:workspaceId/expenses/filter",
    {
      schema: {
        tags: ["Expense"],
        description: "Filter expenses",
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
            userId: { type: "string", format: "uuid" },
            categoryId: { type: "string", format: "uuid" },
            status: {
              type: "string",
              enum: [
                "DRAFT",
                "SUBMITTED",
                "APPROVED",
                "REJECTED",
                "REIMBURSED",
              ],
            },
            paymentMethod: {
              type: "string",
              enum: [
                "CASH",
                "CREDIT_CARD",
                "DEBIT_CARD",
                "BANK_TRANSFER",
                "CHECK",
                "DIGITAL_WALLET",
                "OTHER",
              ],
            },
            isReimbursable: { type: "string", enum: ["true", "false"] },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" },
            minAmount: { type: "string" },
            maxAmount: { type: "string" },
            currency: { type: "string" },
            searchText: { type: "string" },
            limit: { type: "string" },
            offset: { type: "string" },
          },
        },
      },
    },
    (request, reply) => controller.filterExpenses(request as any, reply),
  );

  // Get expense statistics
  fastify.get(
    "/:workspaceId/expenses/statistics",
    {
      schema: {
        tags: ["Expense"],
        description: "Get expense statistics",
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
            userId: { type: "string", format: "uuid" },
            currency: { type: "string" },
          },
        },
      },
    },
    (request, reply) => controller.getExpenseStatistics(request as any, reply),
  );

  // Submit expense
  fastify.post(
    "/:workspaceId/expenses/:expenseId/submit",
    {
      schema: {
        tags: ["Expense"],
        description: "Submit expense for approval",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  expenseId: { type: "string" },
                  status: { type: "string" },
                  updatedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.submitExpense(request as any, reply),
  );

  // Approve expense
  fastify.post(
    "/:workspaceId/expenses/:expenseId/approve",
    {
      schema: {
        tags: ["Expense"],
        description: "Approve submitted expense",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  expenseId: { type: "string" },
                  status: { type: "string" },
                  updatedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.approveExpense(request as any, reply),
  );

  // Reject expense
  fastify.post(
    "/:workspaceId/expenses/:expenseId/reject",
    {
      schema: {
        tags: ["Expense"],
        description: "Reject submitted expense",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  expenseId: { type: "string" },
                  status: { type: "string" },
                  updatedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.rejectExpense(request as any, reply),
  );

  // Reimburse expense
  fastify.post(
    "/:workspaceId/expenses/:expenseId/reimburse",
    {
      schema: {
        tags: ["Expense"],
        description: "Mark approved expense as reimbursed",
        params: {
          type: "object",
          required: ["workspaceId", "expenseId"],
          properties: {
            workspaceId: { type: "string", format: "uuid" },
            expenseId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              statusCode: { type: "number" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  expenseId: { type: "string" },
                  status: { type: "string" },
                  updatedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    (request, reply) => controller.reimburseExpense(request as any, reply),
  );
}
