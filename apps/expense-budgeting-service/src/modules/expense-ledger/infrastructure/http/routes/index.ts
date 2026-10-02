import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { expenseRoutes } from "./expense.routes";
import { categoryRoutes } from "./category.routes";
import { tagRoutes } from "./tag.routes";
import { attachmentRoutes } from "./attachment.routes";
import { recurringExpenseRoutes } from "./recurring-expense.routes";
import { expenseSplitRoutes } from "./expense-split.routes";
import { ExpenseController } from "../controllers/expense.controller";
import { CategoryController } from "../controllers/category.controller";
import { TagController } from "../controllers/tag.controller";
import { AttachmentController } from "../controllers/attachment.controller";
import { RecurringExpenseController } from "../controllers/recurring-expense.controller";
import { ExpenseSplitController } from "../controllers/expense-split.controller";
import { ExpenseService } from "../../../application/services/expense.service";
import { registerExpenseOutboxEventRoutes } from "./outbox-event.routes";

export async function registerExpenseLedgerRoutes(
  fastify: FastifyInstance,
  controllers: {
    expenseController: ExpenseController;
    categoryController: CategoryController;
    tagController: TagController;
    attachmentController: AttachmentController;
    recurringExpenseController: RecurringExpenseController;
    expenseSplitController: ExpenseSplitController;
    expenseService?: ExpenseService;
  },
  _prisma: PrismaClient,
) {
  await fastify.register(
    async (instance) => {
      await instance.register(async (scope) => {
        await expenseRoutes(scope, controllers.expenseController);
      });
      await instance.register(async (scope) => {
        await categoryRoutes(scope, controllers.categoryController);
      });
      await instance.register(async (scope) => {
        await tagRoutes(scope, controllers.tagController);
      });
      await instance.register(async (scope) => {
        await attachmentRoutes(scope, controllers.attachmentController);
      });
      await instance.register(async (scope) => {
        await recurringExpenseRoutes(
          scope,
          controllers.recurringExpenseController,
        );
      });
      await instance.register(async (scope) => {
        await expenseSplitRoutes(scope, controllers.expenseSplitController);
      });
      if (controllers.expenseService) {
        await instance.register(async (scope) => {
          await registerExpenseOutboxEventRoutes(
            scope,
            controllers.expenseService!,
            _prisma
          );
        });
      }
    },
    { prefix: "/api/v1" },
  );
}
