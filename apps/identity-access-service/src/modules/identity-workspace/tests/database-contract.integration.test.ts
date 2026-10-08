import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../../shared/infrastructure/persistence/prisma.client';
import { IdentityPersistenceContext } from '../../../shared/infrastructure/persistence/identity-persistence.context';
import { UserRepositoryImpl } from '../infrastructure/persistence/user.repository.impl';
import { User } from '../domain/entities/user.entity';

describe('Identity database integrity and outbox rollback — PostgreSQL', () => {
  const prisma = new PrismaClient();
  const context = new IdentityPersistenceContext(prisma);
  const repository = new UserRepositoryImpl(context);
  const ids: string[] = [];
  const workspaceIds: string[] = [];

  afterAll(async () => {
    await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: ids } } });
    await prisma.userAccount.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('rolls back a user write when outbox insertion fails, retaining its event for retry', async () => {
    const user = User.create({ email: `rollback-${randomUUID()}@example.com`, passwordHash: 'test-hash' });
    const id = user.id.getValue(); ids.push(id);
    const event = user.domainEvents[0];
    // A duplicate event ID makes the actual PostgreSQL outbox insert fail.
    await prisma.outboxEvent.create({ data: {
      id: event.eventId, aggregateId: id, aggregateType: 'User', eventType: event.eventType,
      payload: {}, status: 'PENDING',
    } });
    await expect(repository.save(user)).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.userAccount.findUnique({ where: { id } })).toBeNull();
    expect(user.domainEvents.map(item => item.eventId)).toEqual([event.eventId]);
    await prisma.outboxEvent.delete({ where: { id: event.eventId } });
    await repository.save(user);
    expect(await prisma.userAccount.findUnique({ where: { id } })).not.toBeNull();
    expect(await prisma.outboxEvent.count({ where: { aggregateId: id } })).toBe(1);
    expect(user.domainEvents).toHaveLength(0);
  });

  it('rolls back nested repository writes when the outer use case fails', async () => {
    const user = User.create({ email: `outer-${randomUUID()}@example.com`, passwordHash: 'test-hash' });
    const id = user.id.getValue(); ids.push(id);
    await expect(context.execute(async () => {
      await repository.save(user);
      throw new Error('Later use-case operation failed');
    })).rejects.toThrow('Later use-case operation failed');
    expect(await prisma.userAccount.count({ where: { id } })).toBe(0);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: id } })).toBe(0);
    expect(user.domainEvents).toHaveLength(1);
  });

  it('enforces membership uniqueness, owner restriction and child cascade deletion', async () => {
    const owner = await prisma.userAccount.create({ data: {
      email: `owner-${randomUUID()}@example.com`, passwordHash: 'test-hash',
    } });
    ids.push(owner.id);
    const workspace = await prisma.workspace.create({ data: {
      name: 'Contract workspace', slug: `contract-${randomUUID()}`, ownerId: owner.id,
    } });
    workspaceIds.push(workspace.id);
    const membership = { userId: owner.id, workspaceId: workspace.id, role: 'OWNER' };
    await prisma.workspaceMembership.create({ data: membership });
    await expect(prisma.workspaceMembership.create({ data: membership })).rejects.toMatchObject({ code: 'P2002' });
    await expect(prisma.workspaceMembership.create({ data: { ...membership, workspaceId: randomUUID() } }))
      .rejects.toMatchObject({ code: 'P2003' });
    await expect(prisma.userAccount.delete({ where: { id: owner.id } })).rejects.toMatchObject({ code: 'P2003' });
    await prisma.workspaceInvitation.create({ data: {
      workspaceId: workspace.id, email: 'invitee@example.com', role: 'MEMBER', token: randomUUID(),
      expiresAt: new Date(Date.now() + 86_400_000),
    } });
    await prisma.authSession.create({ data: { userId: owner.id, token: randomUUID(), expiresAt: new Date() } });
    await prisma.workspace.delete({ where: { id: workspace.id } });
    expect(await prisma.workspaceMembership.count({ where: { workspaceId: workspace.id } })).toBe(0);
    expect(await prisma.workspaceInvitation.count({ where: { workspaceId: workspace.id } })).toBe(0);
    await prisma.userAccount.delete({ where: { id: owner.id } });
    expect(await prisma.authSession.count({ where: { userId: owner.id } })).toBe(0);
  });
});
