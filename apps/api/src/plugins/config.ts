import fp from 'fastify-plugin';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string(),
});

export type Config = z.infer<typeof envSchema>;

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
  }
}

export default fp(
  async (fastify) => {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      console.error('❌ Invalid environment variables:', result.error.format());
      process.exit(1);
    }

    fastify.decorate('config', result.data);
  },
  { name: 'config' }
);
