import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../../apps/api/src/server';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

describe('Bank feed mock routes', () => {
  it('Should dump routes', async () => {
    const app = await createServer();
    await app.ready();
    console.log(app.printRoutes());
  });
});

