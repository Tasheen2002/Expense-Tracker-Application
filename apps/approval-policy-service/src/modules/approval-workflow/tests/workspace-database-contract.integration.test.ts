import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryEventBus } from '@expense-tracker/core';
import { ExpenseWorkflow } from '../domain/entities/expense-workflow.entity';
import { PrismaExpenseWorkflowRepository } from '../infrastructure/persistence/expense-workflow.repository.impl';
import { ConcurrencyConflictError } from '../domain/errors/approval-workflow.errors';

describe('Approval Policy workspace relationships — PostgreSQL', () => {
  const prisma = new PrismaClient();
  const workspaceId = randomUUID();
  const foreignWorkspaceId = randomUUID();
  const userId = randomUUID();
  const chainId = randomUUID();
  const policyId = randomUUID();
  const workflowIds: string[] = [];
  const repository = new PrismaExpenseWorkflowRepository(prisma, new InMemoryEventBus());

  beforeAll(async () => {
    await prisma.approvalChain.create({ data: {
      id: chainId, workspaceId, name: 'Workspace contract', categoryIds: [], approverSequence: [randomUUID()],
    } });
    await prisma.expensePolicy.create({ data: {
      id: policyId, workspaceId, name: `Contract ${policyId}`, policyType: 'SPENDING_LIMIT',
      severity: 'MEDIUM', configuration: { maxAmount: 100 }, createdBy: userId,
    } });
  });

  afterAll(async () => {
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: workflowIds } } });
    await prisma.expenseWorkflow.deleteMany({ where: { chainId } });
    await prisma.policyViolation.deleteMany({ where: { policyId } });
    await prisma.policyExemption.deleteMany({ where: { policyId } });
    await prisma.approvalChain.deleteMany({ where: { id: chainId } });
    await prisma.expensePolicy.deleteMany({ where: { id: policyId } });
    await prisma.$disconnect();
  });

  it('rolls back workflow and steps on outbox failure and permits a complete retry', async () => {
    const workflow = ExpenseWorkflow.create({ workspaceId, chainId, userId,
      expenseId: randomUUID(), approverSequence: [randomUUID()] });
    workflow.start();
    const id = workflow.id.getValue(); workflowIds.push(id);
    const event = workflow.domainEvents[0];
    await prisma.outboxEvent.create({ data: {
      id: event.eventId, aggregateId: id, aggregateType: event.aggregateType,
      eventType: event.eventType, payload: {}, status: 'PENDING',
    } });
    await expect(repository.save(workflow)).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.expenseWorkflow.count({ where: { id } })).toBe(0);
    expect(await prisma.approvalStep.count({ where: { workflowId: id } })).toBe(0);
    expect(workflow.domainEvents.map(item => item.eventId)).toEqual([event.eventId]);
    await prisma.outboxEvent.delete({ where: { id: event.eventId } });
    await repository.save(workflow);
    expect(await prisma.approvalStep.count({ where: { workflowId: id } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: id } })).toBe(1);
    expect(workflow.domainEvents).toHaveLength(0);
  });

  it('allows one competing workflow decision and persists only the winning events', async () => {
    const workflow = ExpenseWorkflow.create({ workspaceId, chainId, userId,
      expenseId: randomUUID(), approverSequence: [randomUUID()] });
    workflow.start(); await repository.save(workflow);
    const id = workflow.id.getValue(); workflowIds.push(id);
    const first = await repository.findById(workflow.id);
    const second = await repository.findById(workflow.id);
    if (!first || !second) throw new Error('Missing fixture workflow');
    first.approveCurrentStep(); second.approveCurrentStep();
    const winningEventCount = first.domainEvents.length;
    const results = await Promise.allSettled([repository.save(first), repository.save(second)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    const rejected = results.find(result => result.status === 'rejected');
    if (rejected?.status !== 'rejected') throw new Error('Expected a competing-write rejection');
    expect(rejected.reason).toBeInstanceOf(ConcurrencyConflictError);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: id } })).toBe(1 + winningEventCount);
    expect((await repository.findById(workflow.id))?.version).toBe(2);
  });

  it('rejects workflows referencing a chain in a different workspace, including updates', async () => {
    const data = { workspaceId, chainId, userId, expenseId: randomUUID() };
    await expect(prisma.expenseWorkflow.create({ data: { ...data, workspaceId: foreignWorkspaceId } }))
      .rejects.toMatchObject({ code: 'P2003' });
    const row = await prisma.expenseWorkflow.create({ data });
    await expect(prisma.expenseWorkflow.update({ where: { id: row.id }, data: { workspaceId: foreignWorkspaceId } }))
      .rejects.toMatchObject({ code: 'P2003' });
    await expect(prisma.approvalChain.delete({ where: { id: chainId } })).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejects cross-workspace violation policies, including updates', async () => {
    const data = { workspaceId, policyId, userId, expenseId: randomUUID(), severity: 'MEDIUM' as const,
      violationDetails: 'Test violation', expenseAmount: 10 };
    await expect(prisma.policyViolation.create({ data: { ...data, workspaceId: foreignWorkspaceId } }))
      .rejects.toMatchObject({ code: 'P2003' });
    const row = await prisma.policyViolation.create({ data });
    await expect(prisma.policyViolation.update({ where: { id: row.id }, data: { workspaceId: foreignWorkspaceId } }))
      .rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejects cross-workspace exemption policies and restricts parent deletion', async () => {
    const data = { workspaceId, policyId, userId, requestedBy: userId, reason: 'Test exemption',
      validFrom: new Date(), validUntil: new Date(Date.now() + 86_400_000) };
    await expect(prisma.policyExemption.create({ data: { ...data, workspaceId: foreignWorkspaceId } }))
      .rejects.toMatchObject({ code: 'P2003' });
    const row = await prisma.policyExemption.create({ data });
    await expect(prisma.policyExemption.update({ where: { id: row.id }, data: { workspaceId: foreignWorkspaceId } }))
      .rejects.toMatchObject({ code: 'P2003' });
    await expect(prisma.expensePolicy.delete({ where: { id: policyId } })).rejects.toMatchObject({ code: 'P2003' });
  });
});
