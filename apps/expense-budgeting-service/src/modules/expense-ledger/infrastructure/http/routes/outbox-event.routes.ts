import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ExpenseService } from '../../../application/services/expense.service';
import { PrismaUnitOfWork } from '@shared/infrastructure/persistence/prisma-unit-of-work';
import {
  InvalidExpenseStatusError,
  ExpenseNotFoundError,
} from '../../../domain/errors/expense.errors';
import { ExpenseStatus } from '../../../domain/enums/expense-status';

const WorkflowNestedDataSchema = z
  .object({
    expenseId: z.string().min(1).optional(),
    workspaceId: z.string().min(1).optional(),
    finalApproverId: z.string().min(1).optional(),
    approverId: z.string().min(1).optional(),
    rejectedBy: z.string().min(1).optional(),
    cancelledBy: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    reason: z.string().optional(),
  })
  .passthrough()
  .optional();

export const WorkflowEventPayloadSchema = z
  .object({
    workflowId: z.string().optional(),
    expenseId: z.string().min(1).optional(),
    workspaceId: z.string().min(1).optional(),
    finalApproverId: z.string().min(1).optional(),
    approverId: z.string().min(1).optional(),
    rejectedBy: z.string().min(1).optional(),
    cancelledBy: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    reason: z.string().optional(),
    aggregateId: z.string().optional(),
    data: WorkflowNestedDataSchema,
  })
  .passthrough();

export type WorkflowEventPayload = z.infer<typeof WorkflowEventPayloadSchema>;

export const OutboxEventPayloadSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  eventType: z.string().min(1, 'eventType is required'),
  aggregateId: z.string().optional(),
  aggregateType: z.string().optional(),
  payload: WorkflowEventPayloadSchema.default({}),
  timestamp: z.string().optional(),
});

export type OutboxEventPayload = z.infer<typeof OutboxEventPayloadSchema>;

const SUPPORTED_COMPLETED_EVENTS = new Set([
  'approval.workflow_completed',
  'approval_workflow.completed',
  'approvalworkflowcompleted',
]);

const SUPPORTED_REJECTED_EVENTS = new Set([
  'approval.workflow_rejected',
  'approval_workflow.rejected',
  'approvalworkflowrejected',
]);

const SUPPORTED_CANCELLED_EVENTS = new Set([
  'approval.workflow_cancelled',
  'approval_workflow.cancelled',
  'approvalworkflowcancelled',
]);

function isProcessedEventIdUniqueViolation(err: unknown): boolean {
  if (
    typeof err !== 'object' ||
    err === null ||
    !('code' in err) ||
    (err as { code: unknown }).code !== 'P2002'
  ) {
    return false;
  }

  const meta = (err as { meta?: { target?: unknown; modelName?: unknown } }).meta;
  if (!meta) {
    return false;
  }

  const modelName = typeof meta.modelName === 'string' ? meta.modelName : '';
  if (modelName === 'ProcessedEvent') {
    return true;
  }

  if (Array.isArray(meta.target)) {
    return meta.target.some(
      (t) =>
        typeof t === 'string' &&
        (t === 'eventId' ||
          t === 'event_id' ||
          t.toLowerCase().includes('event_id') ||
          t.toLowerCase().includes('processed_event'))
    );
  }

  if (typeof meta.target === 'string') {
    const lower = meta.target.toLowerCase();
    return (
      lower === 'eventid' ||
      lower === 'event_id' ||
      lower.includes('event_id') ||
      lower.includes('processed_events')
    );
  }

  return false;
}

export async function registerExpenseOutboxEventRoutes(
  fastify: FastifyInstance,
  expenseService: ExpenseService,
  prisma: PrismaClient
) {
  fastify.post(
    '/event-outbox/events',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = OutboxEventPayloadSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const { eventId, eventType, payload } = parseResult.data;
      const normalizedType = eventType.toLowerCase().trim();

      const isWorkflowCompleted = SUPPORTED_COMPLETED_EVENTS.has(normalizedType);
      const isWorkflowRejected = SUPPORTED_REJECTED_EVENTS.has(normalizedType);
      const isWorkflowCancelled = SUPPORTED_CANCELLED_EVENTS.has(normalizedType);

      const isKnownWorkflowEvent =
        isWorkflowCompleted || isWorkflowRejected || isWorkflowCancelled;

      if (!isKnownWorkflowEvent) {
        return reply.code(400).send({
          success: false,
          error: 'UNSUPPORTED_EVENT_TYPE',
          message: `Event type '${eventType}' is not supported by expense outbox receiver`,
        });
      }

      // Require payload.expenseId (or payload.data.expenseId) explicitly for workflow events.
      // Do NOT fall back to envelope aggregateId or payload.aggregateId because Approval Policy
      // sets aggregateId to the workflow ID, which would produce a misleading expense-not-found error.
      const expenseId = payload?.expenseId || payload?.data?.expenseId;

      const workspaceId =
        payload?.workspaceId ||
        payload?.data?.workspaceId;

      // Mandatory field validation for workflow synchronization events
      if (!expenseId || !workspaceId) {
        return reply.code(400).send({
          success: false,
          error: 'INVALID_PAYLOAD',
          message: 'Workflow event payload must contain valid expenseId and workspaceId',
        });
      }

      const targetExpenseId = expenseId;
      const targetWorkspaceId = workspaceId;

      type ProcessingResult = {
        statusCode: number;
        body: Record<string, unknown>;
      };

      const uow = new PrismaUnitOfWork(prisma);

      try {
        const result = await uow.execute<ProcessingResult>(async () => {
          const client = PrismaUnitOfWork.getClient(prisma);

          // 2. Idempotency Check: check if event was already processed
          const existing = await client.processedEvent.findUnique({
            where: { eventId },
          });

          if (existing) {
            request.log.info(
              { eventId, eventType },
              'Expense outbox event already processed (idempotent ignore)'
            );
            return {
              statusCode: 200,
              body: {
                success: true,
                duplicate: true,
                message: 'Event already processed',
              },
            };
          }

          // 3. Synchronize Expense aggregate state based on Approval Policy events
          if (isWorkflowCompleted) {
            const finalApproverId =
              payload?.finalApproverId ||
              payload?.approverId ||
              payload?.data?.finalApproverId ||
              payload?.data?.approverId ||
              'system-approval-service';

            try {
              await expenseService.approveExpense(
                targetExpenseId,
                targetWorkspaceId,
                finalApproverId
              );
              request.log.info(
                { expenseId, workspaceId, finalApproverId },
                'Expense approved via workflow completed event'
              );
            } catch (err: unknown) {
              if (err instanceof InvalidExpenseStatusError) {
                // If and only if already APPROVED, treat as idempotent duplicate delivery
                if (err.currentStatus === ExpenseStatus.APPROVED) {
                  request.log.info(
                    { expenseId },
                    'Expense was already in approved state (idempotent duplicate)'
                  );
                } else {
                  // Mismatched state (e.g. expense is REJECTED, DRAFT, etc.) -> DO NOT mark processed
                  request.log.warn(
                    { expenseId, currentStatus: err.currentStatus },
                    'Workflow completed event rejected due to incompatible status'
                  );
                  return {
                    statusCode: 409,
                    body: {
                      success: false,
                      error: 'STATUS_MISMATCH',
                      message: `Cannot approve expense ${expenseId} because it is in status '${err.currentStatus}'`,
                    },
                  };
                }
              } else if (err instanceof ExpenseNotFoundError) {
                return {
                  statusCode: 404,
                  body: {
                    success: false,
                    error: 'EXPENSE_NOT_FOUND',
                    message: err.message,
                  },
                };
              } else {
                throw err;
              }
            }
          } else if (isWorkflowRejected) {
            const rejectedBy =
              payload?.rejectedBy ||
              payload?.userId ||
              payload?.data?.rejectedBy ||
              payload?.data?.userId ||
              'system-approval-service';
            const reason = payload?.reason || payload?.data?.reason;

            try {
              await expenseService.rejectExpense(
                targetExpenseId,
                targetWorkspaceId,
                rejectedBy,
                reason
              );
              request.log.info(
                { expenseId: targetExpenseId, workspaceId: targetWorkspaceId, rejectedBy },
                'Expense rejected via workflow rejected event'
              );
            } catch (err: unknown) {
              if (err instanceof InvalidExpenseStatusError) {
                // If and only if already REJECTED, treat as idempotent duplicate delivery
                if (err.currentStatus === ExpenseStatus.REJECTED) {
                  request.log.info(
                    { expenseId: targetExpenseId },
                    'Expense was already in rejected state (idempotent duplicate)'
                  );
                } else {
                  // Mismatched state (e.g. expense is APPROVED, DRAFT, etc.) -> DO NOT mark processed
                  request.log.warn(
                    { expenseId: targetExpenseId, currentStatus: err.currentStatus },
                    'Workflow rejected event rejected due to incompatible status'
                  );
                  return {
                    statusCode: 409,
                    body: {
                      success: false,
                      error: 'STATUS_MISMATCH',
                      message: `Cannot reject expense ${targetExpenseId} because it is in status '${err.currentStatus}'`,
                    },
                  };
                }
              } else if (err instanceof ExpenseNotFoundError) {
                return {
                  statusCode: 404,
                  body: {
                    success: false,
                    error: 'EXPENSE_NOT_FOUND',
                    message: err.message,
                  },
                };
              } else {
                throw err;
              }
            }
          } else if (isWorkflowCancelled) {
            const cancelledBy =
              payload?.cancelledBy ||
              payload?.userId ||
              payload?.data?.cancelledBy ||
              payload?.data?.userId ||
              'system-approval-service';

            try {
              await expenseService.revertExpenseToDraft(
                targetExpenseId,
                targetWorkspaceId,
                cancelledBy
              );
              request.log.info(
                { expenseId: targetExpenseId, workspaceId: targetWorkspaceId, cancelledBy },
                'Expense reverted to draft via workflow cancelled event'
              );
            } catch (err: unknown) {
              if (err instanceof InvalidExpenseStatusError) {
                if (err.currentStatus === ExpenseStatus.DRAFT) {
                  request.log.info(
                    { expenseId },
                    'Expense was already in draft state (idempotent duplicate)'
                  );
                } else {
                  request.log.warn(
                    { expenseId, currentStatus: err.currentStatus },
                    'Workflow cancelled event rejected due to incompatible status'
                  );
                  return {
                    statusCode: 409,
                    body: {
                      success: false,
                      error: 'STATUS_MISMATCH',
                      message: `Cannot cancel workflow for expense ${expenseId} because it is in status '${err.currentStatus}'`,
                    },
                  };
                }
              } else if (err instanceof ExpenseNotFoundError) {
                return {
                  statusCode: 404,
                  body: {
                    success: false,
                    error: 'EXPENSE_NOT_FOUND',
                    message: err.message,
                  },
                };
              } else {
                throw err;
              }
            }
          }

          // 4. Mark event as processed in the SAME atomic transaction
          await client.processedEvent.create({
            data: {
              eventId,
              eventType,
              processedAt: new Date(),
            },
          });

          return {
            statusCode: 200,
            body: {
              success: true,
              eventId,
              processed: true,
            },
          };
        });

        // 5. Send HTTP response AFTER transaction is fully committed to database
        return reply.code(result.statusCode).send(result.body);
      } catch (err: unknown) {
        // Handle concurrent race condition strictly for the same ProcessedEvent.eventId
        if (isProcessedEventIdUniqueViolation(err)) {
          return reply.code(200).send({
            success: true,
            duplicate: true,
            message: 'Event already processed concurrently',
          });
        }

        request.log.error(
          err,
          `Failed to process outbox event ${eventType} in expense service`
        );
        return reply.code(500).send({
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected internal error occurred while processing the event',
        });
      }
    }
  );
}
