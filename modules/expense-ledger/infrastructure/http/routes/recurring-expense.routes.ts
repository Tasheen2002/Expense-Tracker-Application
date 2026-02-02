import { FastifyInstance } from "fastify";
import { RecurringExpenseController } from "../controllers/recurring-expense.controller";

export async function recurringExpenseRoutes(
  fastify: FastifyInstance,
  controller: RecurringExpenseController,
) {
  fastify.post("/:workspaceId/users/:userId/recurring", (req, reply) =>
    controller.create(req as any, reply),
  );

  fastify.post("/recurring/:id/pause", (req, reply) =>
    controller.pause(req as any, reply),
  );
  fastify.post("/recurring/:id/resume", (req, reply) =>
    controller.resume(req as any, reply),
  );
  fastify.post("/recurring/:id/stop", (req, reply) =>
    controller.stop(req as any, reply),
  );

  // System trigger endpoint (should be secured)
  fastify.post("/recurring/trigger", (req, reply) =>
    controller.trigger(req as any, reply),
  );
}
