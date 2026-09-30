import Fastify from 'fastify';
import { expect, it, vi } from 'vitest';
import dbPlugin from '../../plugins/db';

it('isolates app pools and only disconnects the closing app client', async () => {
  const first = Fastify({ logger: false });
  const second = Fastify({ logger: false });
  await first.register(dbPlugin);
  await second.register(dbPlugin);
  const firstDisconnect = vi.spyOn(first.prisma, '$disconnect');
  const secondDisconnect = vi.spyOn(second.prisma, '$disconnect');
  try {
    expect(first.prisma).not.toBe(second.prisma);
    await first.prisma.$queryRaw`SELECT 1`;
    await second.prisma.$queryRaw`SELECT 1`;
    await first.close();
    expect(firstDisconnect).toHaveBeenCalledOnce();
    expect(secondDisconnect).not.toHaveBeenCalled();
    await expect(second.prisma.$queryRaw`SELECT 1`).resolves.toEqual([{ '?column?': 1 }]);
    await second.close();
    expect(secondDisconnect).toHaveBeenCalledOnce();
  } finally {
    await first.close(); await second.close(); vi.restoreAllMocks();
  }
});
