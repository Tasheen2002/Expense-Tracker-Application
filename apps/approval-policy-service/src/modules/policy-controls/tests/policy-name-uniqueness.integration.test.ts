import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';

it('supports the Prisma compound selector while enforcing case-insensitive names per workspace', async () => {
  const prisma = new PrismaClient();
  const workspaceId = randomUUID();
  const otherWorkspaceId = randomUUID();
  const name = `Travel ${randomUUID()}`;
  const data = {
    workspaceId, name, policyType: 'SPENDING_LIMIT' as const, severity: 'MEDIUM' as const,
    configuration: { maxAmount: 100, currency: 'USD' }, createdBy: randomUUID(),
  };
  try {
    const policy = await prisma.expensePolicy.create({ data });
    expect((await prisma.expensePolicy.findUnique({ where: { workspaceId_name: { workspaceId, name } } }))?.id).toBe(policy.id);
    await expect(prisma.expensePolicy.create({ data })).rejects.toMatchObject({ code: 'P2002' });
    await expect(prisma.expensePolicy.create({ data: { ...data, name: name.toLowerCase() } })).rejects.toMatchObject({ code: 'P2002' });
    await expect(prisma.expensePolicy.create({ data: { ...data, workspaceId: otherWorkspaceId } })).resolves.toMatchObject({ workspaceId: otherWorkspaceId });
  } finally {
    await prisma.expensePolicy.deleteMany({ where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } });
    await prisma.$disconnect();
  }
});
