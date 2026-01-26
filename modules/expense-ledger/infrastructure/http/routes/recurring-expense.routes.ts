import { FastifyInstance } from "fastify";
import { RecurringExpenseController } from "../controllers/recurring-expense.controller";

export async function recurringExpenseRoutes(
  fastify: FastifyInstance,
  controller: RecurringExpenseController,
) {
  fastify.post(
    "/:workspaceId/users/:userId/recurring",
    controller.create.bind(controller),
  );

  fastify.post("/recurring/:id/pause", controller.pause.bind(controller));
  fastify.post("/recurring/:id/resume", controller.resume.bind(controller));
  fastify.post("/recurring/:id/stop", controller.stop.bind(controller));

  // System trigger endpoint (should be secured)
  fastify.post("/recurring/trigger", controller.trigger.bind(controller));
}
