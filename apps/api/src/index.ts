import "dotenv/config"; // Ensure basic env loading
import { createServer } from "./server.js";

const start = async () => {
  try {
    const server = await createServer();
    const port = server.config.PORT;
    const host = "0.0.0.0";

    await server.listen({ port, host });

    // Log helpful links
    server.log.info(`🚀 Server running at http://localhost:${port}`);
    server.log.info(`📚 Documentation at http://localhost:${port}/docs`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
