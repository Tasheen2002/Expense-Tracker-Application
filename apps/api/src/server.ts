import Fastify, { FastifyInstance } from "fastify";
import configPlugin from "./plugins/config.js";
import swaggerPlugin from "./plugins/swagger.js"; // We will create this next
import moduleLoader from "./modules.js"; // We will create this next

export const createServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  // Register Core Plugins
  await server.register(configPlugin);

  // Register Swagger (Documentation)
  await server.register(swaggerPlugin);

  // Register Domain Modules
  await server.register(moduleLoader);

  // Health Check
  server.get("/health", async () => {
    return { status: "ok", uptime: process.uptime() };
  });

  return server;
};
