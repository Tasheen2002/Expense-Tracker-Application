import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { registerNotificationRoutes } from "./notification.routes";
import { registerTemplateRoutes } from "./template.routes";
import { registerPreferenceRoutes } from "./preference.routes";
import { NotificationController } from "../controllers/notification.controller";
import { TemplateController } from "../controllers/template.controller";
import { PreferenceController } from "../controllers/preference.controller";

export async function registerNotificationDispatchRoutes(
  fastify: FastifyInstance,
  controllers: {
    notificationController: NotificationController;
    templateController: TemplateController;
    preferenceController: PreferenceController;
  },
  prisma: PrismaClient,
) {
  await fastify.register(
    async (instance) => {
      // User-facing notification routes
      registerNotificationRoutes(instance, controllers.notificationController);

      // User preference routes
      registerPreferenceRoutes(instance, controllers.preferenceController);

      // Admin template routes
      registerTemplateRoutes(instance, controllers.templateController);
    },
    { prefix: "/api/v1" },
  );
}

// Re-export individual route functions for testing
export { registerNotificationRoutes } from "./notification.routes";
export { registerTemplateRoutes } from "./template.routes";
export { registerPreferenceRoutes } from "./preference.routes";
