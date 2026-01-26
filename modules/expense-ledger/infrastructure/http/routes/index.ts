import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { expenseRoutes } from "./expense.routes";
import { categoryRoutes } from "./category.routes";
import { tagRoutes } from "./tag.routes";
import { attachmentRoutes } from "./attachment.routes";
import { recurringExpenseRoutes } from "./recurring-expense.routes";
import { ExpenseController } from "../controllers/expense.controller";
import { CategoryController } from "../controllers/category.controller";
import { TagController } from "../controllers/tag.controller";
import { AttachmentController } from "../controllers/attachment.controller";
import { RecurringExpenseController } from "../controllers/recurring-expense.controller";
import { workspaceAuthorizationMiddleware } from "../middleware/workspace-authorization.middleware";

export async function registerExpenseLedgerRoutes(
  fastify: FastifyInstance,
  controllers: {
    expenseController: ExpenseController;
    categoryController: CategoryController;
    tagController: TagController;
    attachmentController: AttachmentController;
    recurringExpenseController: RecurringExpenseController;
  },
  prisma: PrismaClient,
) {
  await fastify.register(
    async (instance) => {
      // Add workspace authorization middleware to all routes
      instance.addHook("onRequest", async (request, reply) => {
        await workspaceAuthorizationMiddleware(request as any, reply, prisma);
      });

      await expenseRoutes(instance, controllers.expenseController);
      await categoryRoutes(instance, controllers.categoryController);
      await tagRoutes(instance, controllers.tagController);
      await attachmentRoutes(instance, controllers.attachmentController);
      await recurringExpenseRoutes(
        instance,
        controllers.recurringExpenseController,
      );
    },
    { prefix: "/api/v1" },
  );
}
