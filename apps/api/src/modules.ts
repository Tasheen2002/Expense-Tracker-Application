import fp from "fastify-plugin";

export default fp(
  async (fastify) => {
    fastify.log.info("Registering modules...");

    // Example:
    // await fastify.register(import('@modules/identity-workspace'), { prefix: '/v1/identity' });

    fastify.log.info("Modules registered.");
  },
  { name: "module-loader" },
);
