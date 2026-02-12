import { FastifyInstance } from "fastify";
import { RecurringExpenseController } from "../controllers/recurring-expense.controller";
import { AuthenticatedRequest } from "../../../../../apps/api/src/shared/interfaces/authenticated-request.interface";

export async function recurringExpenseRoutes(
  fastify: FastifyInstance,
  controller: RecurringExpenseController,
) {
  fastify.post("/:workspaceId/users/:userId/recurring", (req, reply) =>
    controller.create(req as AuthenticatedRequest, reply),
  );

  fastify.post("/recurring/:id/pause", (req, reply) =>
    controller.pause(req as AuthenticatedRequest, reply),
  );
  fastify.post("/recurring/:id/resume", (req, reply) =>
    controller.resume(req as AuthenticatedRequest, reply),
  );
  fastify.post("/recurring/:id/stop", (req, reply) =>
    controller.stop(req as AuthenticatedRequest, reply),
  );

  // System trigger endpoint (should be secured)
  fastify.post("/recurring/trigger", (req, reply) =>
    controller.trigger(req as AuthenticatedRequest, reply),
  );
}
