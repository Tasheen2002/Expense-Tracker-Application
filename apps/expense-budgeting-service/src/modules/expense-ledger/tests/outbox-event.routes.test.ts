import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PrismaClient, Prisma } from '@prisma/client';
import { buildExpenseApp } from '../../../app';
import { Expense } from '../domain/entities/expense.entity';
import { Money } from '../domain/value-objects/money';
import { ExpenseDate } from '../domain/value-objects/expense-date';
import { ExpenseStatus } from '../domain/enums/expense-status';
import { PaymentMethod } from '../domain/enums/payment-method';
import { ExpenseRepositoryImpl } from '../infrastructure/persistence/expense.repository.impl';
import { InMemoryEventBus } from '@expense-tracker/core';
import { CompositionRoot } from '../../../composition-root';

describe('Inbound Outbox Event Routes Integration Tests (/api/v1/event-outbox/events)', () => {
  let app: FastifyInstance & { compositionRoot: CompositionRoot };
  let prisma: PrismaClient;
  let expenseRepo: ExpenseRepositoryImpl;

  const WORKSPACE_ID = 'cccccccc-1111-4111-8111-111111111111';
  const USER_ID = 'dddddddd-1111-4111-8111-111111111111';
  const APPROVER_ID = 'eeeeeeee-1111-4111-8111-111111111111';

  beforeAll(async () => {
    app = (await buildExpenseApp({ enableInternalAuth: false, logger: false })) as FastifyInstance & {
      compositionRoot: CompositionRoot;
    };
    await app.ready();
    prisma = app.prisma;
    expenseRepo = new ExpenseRepositoryImpl(prisma, new InMemoryEventBus());
  });

  beforeEach(async () => {
    await prisma.processedEvent.deleteMany({});
    await prisma.expenseTag.deleteMany({
      where: { expense: { workspaceId: WORKSPACE_ID } },
    });
    await prisma.attachment.deleteMany({
      where: { expense: { workspaceId: WORKSPACE_ID } },
    });
    await prisma.expense.deleteMany({
      where: { workspaceId: WORKSPACE_ID },
    });
  });

  afterAll(async () => {
    await prisma.processedEvent.deleteMany({});
    await prisma.expenseTag.deleteMany({
      where: { expense: { workspaceId: WORKSPACE_ID } },
    });
    await prisma.attachment.deleteMany({
      where: { expense: { workspaceId: WORKSPACE_ID } },
    });
    await prisma.expense.deleteMany({
      where: { workspaceId: WORKSPACE_ID },
    });
    await app.close();
  });

  it('should process approval.workflow_completed event and transition expense to APPROVED', async () => {
    // 1. Create a submitted expense
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Workflow Approval Sync Expense',
      amount: Money.create(150, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CREDIT_CARD,
      isReimbursable: true,
    });
    expense.submit(USER_ID);
    await expenseRepo.save(expense);

    const eventId = '11111111-2222-3333-4444-555555555555';

    // 2. Post workflow completed webhook event to /api/v1/event-outbox/events
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload: {
        eventId,
        eventType: 'approval.workflow_completed',
        aggregateId: 'wf-12345',
        aggregateType: 'ApprovalWorkflow',
        payload: {
          workflowId: 'wf-12345',
          expenseId: expense.id.getValue(),
          workspaceId: WORKSPACE_ID,
          finalApproverId: APPROVER_ID,
        },
        timestamp: new Date().toISOString(),
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(true);

    // 3. Verify in database that expense is APPROVED
    const updated = await expenseRepo.findById(expense.id, WORKSPACE_ID);
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe(ExpenseStatus.APPROVED);

    // 4. Verify processed_events record was persisted for idempotency
    const processedRecord = await prisma.processedEvent.findUnique({
      where: { eventId },
    });
    expect(processedRecord).not.toBeNull();
    expect(processedRecord!.eventType).toBe('approval.workflow_completed');
  });

  it('should idempotently ignore duplicate event delivery without re-processing', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Duplicate Event Expense',
      amount: Money.create(75, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
    });
    expense.submit(USER_ID);
    await expenseRepo.save(expense);

    const eventId = '22222222-3333-4444-5555-666666666666';

    const payload = {
      eventId,
      eventType: 'approval.workflow_completed',
      aggregateId: 'wf-999',
      aggregateType: 'ApprovalWorkflow',
      payload: {
        workflowId: 'wf-999',
        expenseId: expense.id.getValue(),
        workspaceId: WORKSPACE_ID,
        finalApproverId: APPROVER_ID,
      },
      timestamp: new Date().toISOString(),
    };

    // First delivery: success
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload,
    });
    expect(res1.statusCode).toBe(200);
    expect(res1.json().processed).toBe(true);

    // Second delivery (duplicate): returns duplicate: true
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload,
    });
    expect(res2.statusCode).toBe(200);
    const body2 = res2.json();
    expect(body2.success).toBe(true);
    expect(body2.duplicate).toBe(true);
    expect(body2.message).toBe('Event already processed');
  });

  it('should process approval.workflow_rejected event and transition expense to REJECTED with reason', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Workflow Rejection Sync Expense',
      amount: Money.create(300, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CHECK,
      isReimbursable: false,
    });
    expense.submit(USER_ID);
    await expenseRepo.save(expense);

    const eventId = '33333333-4444-5555-6666-777777777777';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload: {
        eventId,
        eventType: 'approval.workflow_rejected',
        aggregateId: 'wf-rejected-1',
        aggregateType: 'ApprovalWorkflow',
        payload: {
          workflowId: 'wf-rejected-1',
          expenseId: expense.id.getValue(),
          workspaceId: WORKSPACE_ID,
          rejectedBy: APPROVER_ID,
          reason: 'Out of policy: missing itemized receipt',
        },
        timestamp: new Date().toISOString(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().processed).toBe(true);

    const updated = await expenseRepo.findById(expense.id, WORKSPACE_ID);
    expect(updated!.status).toBe(ExpenseStatus.REJECTED);
  });

  it('should handle already approved expenses gracefully without failing', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Already Approved Expense',
      amount: Money.create(50, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
    });
    expense.submit(USER_ID);
    expense.approve(APPROVER_ID);
    await expenseRepo.save(expense);

    const eventId = '44444444-5555-6666-7777-888888888888';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload: {
        eventId,
        eventType: 'approval.workflow_completed',
        payload: {
          expenseId: expense.id.getValue(),
          workspaceId: WORKSPACE_ID,
          finalApproverId: APPROVER_ID,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);

    const processedRecord = await prisma.processedEvent.findUnique({
      where: { eventId },
    });
    expect(processedRecord).not.toBeNull();
  });

  it('guarantees processed_event record is committed and visible immediately upon response completion (no race)', async () => {
    // Repeat across multiple expenses to stress-test that the transaction commit finishes strictly before HTTP response returns
    for (let i = 0; i < 5; i++) {
      const expense = Expense.create({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
        title: `Immediate Commit Verification Expense ${i}`,
        amount: Money.create(100 + i, 'USD'),
        expenseDate: ExpenseDate.create(new Date()),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        isReimbursable: true,
      });
      expense.submit(USER_ID);
      // Pre-approve to test the exact "already approved" path that previously raced
      expense.approve(APPROVER_ID);
      await expenseRepo.save(expense);

      const eventId = `commit-race-check-${i}-4111-8111-111111111111`;

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/event-outbox/events',
        payload: {
          eventId,
          eventType: 'approval.workflow_completed',
          payload: {
            expenseId: expense.id.getValue(),
            workspaceId: WORKSPACE_ID,
            finalApproverId: APPROVER_ID,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);

      // Immediately assert against PostgreSQL directly without any sleep/delay
      const processedRecord = await prisma.processedEvent.findUnique({
        where: { eventId },
      });
      expect(processedRecord).not.toBeNull();
      expect(processedRecord!.eventId).toBe(eventId);
    }
  });

  it('should reject workflow completion for an expense in REJECTED status with 409 and NOT mark processed', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Rejected Expense Receiving Completion Event',
      amount: Money.create(500, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CREDIT_CARD,
      isReimbursable: false,
    });
    expense.submit(USER_ID);
    expense.reject(APPROVER_ID, 'Previously rejected for fraud');
    await expenseRepo.save(expense);

    const eventId = 'deadbeef-1111-4111-8111-111111111111';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload: {
        eventId,
        eventType: 'approval.workflow_completed',
        payload: {
          expenseId: expense.id.getValue(),
          workspaceId: WORKSPACE_ID,
          finalApproverId: APPROVER_ID,
        },
      },
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('STATUS_MISMATCH');
    expect(body.message).toContain("status 'REJECTED'");

    // Crucial check: event must NOT be recorded as processed!
    const processedRecord = await prisma.processedEvent.findUnique({
      where: { eventId },
    });
    expect(processedRecord).toBeNull();

    // Verify expense remains REJECTED
    const unchanged = await expenseRepo.findById(expense.id, WORKSPACE_ID);
    expect(unchanged!.status).toBe(ExpenseStatus.REJECTED);
  });

  it('should reject workflow rejection for an expense in APPROVED status with 409 and NOT mark processed', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Approved Expense Receiving Rejection Event',
      amount: Money.create(250, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CREDIT_CARD,
      isReimbursable: false,
    });
    expense.submit(USER_ID);
    expense.approve(APPROVER_ID);
    await expenseRepo.save(expense);

    const eventId = 'deadbeef-2222-4111-8111-222222222222';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload: {
        eventId,
        eventType: 'approval.workflow_rejected',
        payload: {
          expenseId: expense.id.getValue(),
          workspaceId: WORKSPACE_ID,
          rejectedBy: APPROVER_ID,
          reason: 'Late rejection attempt',
        },
      },
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('STATUS_MISMATCH');
    expect(body.message).toContain("status 'APPROVED'");

    // Event must NOT be marked processed
    const processedRecord = await prisma.processedEvent.findUnique({
      where: { eventId },
    });
    expect(processedRecord).toBeNull();

    // Verify expense remains APPROVED
    const unchanged = await expenseRepo.findById(expense.id, WORKSPACE_ID);
    expect(unchanged!.status).toBe(ExpenseStatus.APPROVED);
  });

  it('should return 400 and NOT mark processed when expenseId or workspaceId is missing from workflow event', async () => {
    const eventId = 'deadbeef-3333-4111-8111-333333333333';

    // Missing workspaceId
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload: {
        eventId,
        eventType: 'approval.workflow_completed',
        payload: {
          expenseId: 'some-expense-id',
          finalApproverId: APPROVER_ID,
        },
      },
    });

    expect(res1.statusCode).toBe(400);
    expect(res1.json().error).toBe('INVALID_PAYLOAD');

    // Missing expenseId
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload: {
        eventId: 'deadbeef-4444-4111-8111-444444444444',
        eventType: 'approval.workflow_rejected',
        payload: {
          workspaceId: WORKSPACE_ID,
          rejectedBy: APPROVER_ID,
        },
      },
    });

    expect(res2.statusCode).toBe(400);
    expect(res2.json().error).toBe('INVALID_PAYLOAD');

    // Verify neither was marked as processed
    const p1 = await prisma.processedEvent.findUnique({ where: { eventId } });
    const p2 = await prisma.processedEvent.findUnique({ where: { eventId: 'deadbeef-4444-4111-8111-444444444444' } });
    expect(p1).toBeNull();
    expect(p2).toBeNull();
  });

  it('should process approval.workflow_cancelled event and revert submitted expense to DRAFT', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Workflow Cancelled Expense',
      amount: Money.create(120, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.DEBIT_CARD,
      isReimbursable: false,
    });
    expense.submit(USER_ID);
    await expenseRepo.save(expense);

    const eventId = 'cancel-1111-4111-8111-111111111111';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload: {
        eventId,
        eventType: 'approval.workflow_cancelled',
        payload: {
          expenseId: expense.id.getValue(),
          workspaceId: WORKSPACE_ID,
          cancelledBy: USER_ID,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().processed).toBe(true);

    const updated = await expenseRepo.findById(expense.id, WORKSPACE_ID);
    expect(updated!.status).toBe(ExpenseStatus.DRAFT);

    const processedRecord = await prisma.processedEvent.findUnique({ where: { eventId } });
    expect(processedRecord).not.toBeNull();
  });

  it('should return 400 on invalid payload schema', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload: {
        // missing eventId and eventType
        invalid: true,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().success).toBe(false);
  });

  it('should also accept events via root /event-outbox/events endpoint', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Root Endpoint Test Expense',
      amount: Money.create(99, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CASH,
      isReimbursable: false,
    });
    expense.submit(USER_ID);
    await expenseRepo.save(expense);

    const eventId = '55555555-6666-7777-8888-999999999999';
    const response = await app.inject({
      method: 'POST',
      url: '/event-outbox/events',
      payload: {
        eventId,
        eventType: 'approval.workflow_cancelled',
        payload: {
          expenseId: expense.id.getValue(),
          workspaceId: WORKSPACE_ID,
          cancelledBy: USER_ID,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);

    const updated = await expenseRepo.findById(expense.id, WORKSPACE_ID);
    expect(updated!.status).toBe(ExpenseStatus.DRAFT);
  });

  it('should reject unknown event types with 400 UNSUPPORTED_EVENT_TYPE and not record processed', async () => {
    const eventId = 'unknown-1111-4111-8111-111111111111';
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload: {
        eventId,
        eventType: 'custom.unsupported_event',
        payload: {
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          workspaceId: WORKSPACE_ID,
        },
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('UNSUPPORTED_EVENT_TYPE');
    expect(body.message).toContain("Event type 'custom.unsupported_event' is not supported");

    const processedRecord = await prisma.processedEvent.findUnique({ where: { eventId } });
    expect(processedRecord).toBeNull();
  });

  it('should reject substring-matched fake event types with 400 UNSUPPORTED_EVENT_TYPE', async () => {
    const eventId = 'fake-1111-4111-8111-111111111111';
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload: {
        eventId,
        eventType: 'fake_prefix_workflow_completed_fake_suffix',
        payload: {
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          workspaceId: WORKSPACE_ID,
        },
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('UNSUPPORTED_EVENT_TYPE');

    const processedRecord = await prisma.processedEvent.findUnique({ where: { eventId } });
    expect(processedRecord).toBeNull();
  });

  it('should sanitize HTTP 500 error responses and never leak raw exception messages or database internals', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'Crash Simulation Expense',
      amount: Money.create(100, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CREDIT_CARD,
      isReimbursable: false,
    });
    expense.submit(USER_ID);
    await expenseRepo.save(expense);

    // Spy on expenseService.approveExpense to simulate an unexpected internal crash leaking connection strings/internal info
    const serviceSpy = app.compositionRoot.expenseLedger.expenseService;
    const originalApprove = serviceSpy.approveExpense.bind(serviceSpy);
    serviceSpy.approveExpense = async () => {
      throw new Error('FATAL_PG_INTERNAL_SECRETS_AND_STACK: Connection to postgresql://postgres:supersecret@db:5432 failed');
    };

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/event-outbox/events',
        payload: {
          eventId: 'crash-1111-4111-8111-111111111111',
          eventType: 'approval.workflow_completed',
          payload: {
            expenseId: expense.id.getValue(),
            workspaceId: WORKSPACE_ID,
            finalApproverId: APPROVER_ID,
          },
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('INTERNAL_SERVER_ERROR');
      // Crucial: ensure no leak of internal credentials or stack trace
      expect(body.message).not.toContain('supersecret');
      expect(body.message).not.toContain('FATAL_PG_INTERNAL');
      expect(body.message).toBe('An unexpected internal error occurred while processing the event');
    } finally {
      serviceSpy.approveExpense = originalApprove;
    }
  });

  it('should NOT treat unrelated P2002 unique constraint violations as duplicate success', async () => {
    const expense = Expense.create({
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
      title: 'P2002 Simulation Expense',
      amount: Money.create(100, 'USD'),
      expenseDate: ExpenseDate.create(new Date()),
      paymentMethod: PaymentMethod.CREDIT_CARD,
      isReimbursable: false,
    });
    expense.submit(USER_ID);
    await expenseRepo.save(expense);

    // Spy to throw a P2002 error originating from an unrelated entity (e.g. Expense table unique constraint)
    const serviceSpy = app.compositionRoot.expenseLedger.expenseService;
    const originalApprove = serviceSpy.approveExpense.bind(serviceSpy);
    serviceSpy.approveExpense = async () => {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`title`)', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { modelName: 'Expense', target: ['title'] },
      });
    };

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/event-outbox/events',
        payload: {
          eventId: 'unrelated-p2002-1111-8111-111111111111',
          eventType: 'approval.workflow_completed',
          payload: {
            expenseId: expense.id.getValue(),
            workspaceId: WORKSPACE_ID,
            finalApproverId: APPROVER_ID,
          },
        },
      });

      // Must be 500, NOT 200 duplicate!
      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('INTERNAL_SERVER_ERROR');
      expect(body.duplicate).toBeUndefined();
    } finally {
      serviceSpy.approveExpense = originalApprove;
    }
  });

  it('should reject event with 400 INVALID_PAYLOAD if payload.expenseId is missing, even if envelope aggregateId is present (workflow ID)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/event-outbox/events',
      payload: {
        eventId: 'workflow-agg-id-test-111111111111',
        eventType: 'approval.workflow_completed',
        aggregateId: 'workflow-id-12345', // Approval Policy sets this to workflow ID
        payload: {
          workspaceId: WORKSPACE_ID,
          finalApproverId: APPROVER_ID,
          // note: expenseId is missing!
        },
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('INVALID_PAYLOAD');
    expect(body.message).toContain('expenseId');
  });
});
