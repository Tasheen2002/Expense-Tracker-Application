import { FastifyInstance } from 'fastify';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '../../../domain/enums';
import { z } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient, Prisma, type Notification } from '../../../../../prisma-client';
import { NotificationId, PreferenceId, UserId, WorkspaceId } from '../../../domain/value-objects';
import { NotificationPreference, TypeSettingValue } from '../../../domain/entities/notification-preference.entity';
import sanitizeHtml from 'sanitize-html';
import { validateText } from '../../../domain/entities/entity-validation';
import { NOTIFICATION_TITLE_MAX_LENGTH, NOTIFICATION_CONTENT_MAX_LENGTH } from '../../../domain/constants';
import { InvalidNotificationDataError, NotificationRequestConflictError } from '../../../domain/errors/notification.errors';
import { notificationWebhookRateLimit } from '@shared/http/notification-rate-limits';
import { AccountNotificationService } from '../../../application/services/account-notification.service';
import { AccountNotificationRepositoryImpl } from '../../persistence/account-notification.repository.impl';
import { accountEventOwner } from '../../../../../../../../packages/contracts/src/account-events';

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
    }
    return item;
  });
}

const OutboxEventPayloadSchema = z.object({
  eventId: z.string().uuid().refine(NotificationId.isValid, 'Unsupported notification ID format').transform(value => value.toLowerCase()),
  eventType: z.string().trim().min(1).max(100),
  aggregateId: z.string().optional(),
  aggregateType: z.string().optional(),
  payload: z.record(z.unknown()).optional().default({}),
  timestamp: z.string().datetime({ offset: true }).refine(value => Number.isFinite(Date.parse(value))).optional(),
});

export type OutboxEventPayload = z.infer<typeof OutboxEventPayloadSchema>;

export async function registerNotificationOutboxEventRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  accountNotifications = new AccountNotificationService(new AccountNotificationRepositoryImpl(prisma)),
) {
  fastify.post(
    '/event-outbox/events',
    {
      onRequest: [notificationWebhookRateLimit],
      // Envelope parsing below preserves producer compatibility without AJV
      // coercing raw event fields. Authentication is installed by the app.
    },
    async (request, reply) => {
      const parseResult = OutboxEventPayloadSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      const { eventId, eventType, payload, timestamp } = parseResult.data;
      let accountId: string | null;
      try { accountId = accountEventOwner(parseResult.data); }
      catch { return reply.code(400).send({ success: false, error: 'Invalid account event scope' }); }
      if (accountId) {
        try {
          const result = await accountNotifications.accept(parseResult.data);
          return reply.code(result.duplicate || result.suppressed ? 200 : 201).send({ success: true, ...result,
            notificationId: result.suppressed ? undefined : result.notificationId });
        } catch (err: unknown) {
          if (err instanceof NotificationRequestConflictError) return reply.code(409).send({ success: false, error: 'Event ID conflict' });
          if (err instanceof InvalidNotificationDataError) return reply.code(400).send({ success: false, error: err.code });
          request.log.error({ err }, 'Account notification acceptance failed');
          return reply.code(500).send({ success: false, error: 'Failed to create account notification' });
        }
      }
      const fingerprint = createHash('sha256').update(canonicalJson(parseResult.data)).digest('hex');
      const nested = payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
        ? payload.data as Record<string, unknown> : {};
      const normalizedType = eventType.toLowerCase();
      const expenseStatusChanged = normalizedType === 'expense.status_changed' || normalizedType === 'expensestatuschanged';
      const approvalStarted = normalizedType === 'approval.workflow_started' || normalizedType === 'approvalworkflowstarted';
      const budgetThreshold = normalizedType === 'budget.threshold_exceeded';
      const categorySuggestionCreated = normalizedType === 'categorysuggestioncreated';
      if (categorySuggestionCreated && !z.object({
        suggestionId: z.string().uuid(), expenseId: z.string().uuid(), suggestedCategoryId: z.string().uuid(),
        expenseOwnerId: z.string().uuid().refine(UserId.isValid),
      }).safeParse(payload).success) {
        return reply.code(400).send({ success: false, error: 'Category suggestion requires valid resource IDs and its verified expense owner' });
      }

      // 2. Extract recipient and workspace
      const rawRecipient =
        (categorySuggestionCreated ? payload.expenseOwnerId : undefined) ||
        (budgetThreshold ? payload.recipientId : undefined) ||
        (expenseStatusChanged ? payload.expenseOwnerId : approvalStarted ? payload.requesterId : undefined) ||
        payload?.userId ||
        payload?.recipientId ||
        payload?.ownerId ||
        nested.userId ||
        (budgetThreshold ? payload.createdBy : undefined);

      const recipientId = typeof rawRecipient === 'string' && UserId.isValid(rawRecipient) ? rawRecipient.toLowerCase() : null;

      const rawWorkspace = payload.workspaceId || nested.workspaceId;
      const workspaceId = typeof rawWorkspace === 'string' && WorkspaceId.isValid(rawWorkspace) ? rawWorkspace.toLowerCase() : null;

      if (!recipientId) {
        if (budgetThreshold) {
          return reply.code(400).send({ success: false, error: 'Budget threshold event requires a recipient or budget creator' });
        }
        if (rawRecipient !== undefined && rawRecipient !== null) {
          return reply.code(400).send({ success: false, error: 'Valid recipientId is required' });
        }
        request.log.warn({ eventId, eventType }, 'No valid recipient ID in outbox event; skipping notification creation');
        return reply.code(200).send({
          success: true,
          message: 'Event received but no notification recipient specified',
        });
      }
      if (!workspaceId) {
        return reply.code(400).send({ success: false, error: 'Valid workspaceId is required' });
      }

      const acknowledgeExisting = async (existing: Notification) => {
        let storedFingerprint = existing.sourceEventFingerprint;
        if (!storedFingerprint) {
          // Legacy deliveries lack aggregate metadata. Verify every preserved
          // field before adopting the first complete replay fingerprint.
          const stored = existing.data && typeof existing.data === 'object' && !Array.isArray(existing.data)
            ? { ...existing.data } as Record<string, unknown> : {};
          const storedType = stored.sourceEventType;
          delete stored.eventId; delete stored.sourceEventType;
          const comparablePayload = { ...payload };
          delete comparablePayload.eventId; delete comparablePayload.sourceEventType;
          if (existing.workspaceId !== workspaceId || existing.recipientId !== recipientId
            || storedType !== eventType || canonicalJson(stored) !== canonicalJson(comparablePayload)
            || (timestamp && existing.createdAt.getTime() !== Date.parse(timestamp))) {
            return reply.code(409).send({ success: false, error: 'Event ID conflict' });
          }
          await prisma.notification.updateMany({ where: { id: eventId, sourceEventFingerprint: null },
            data: { sourceEventFingerprint: fingerprint } });
          storedFingerprint = (await prisma.notification.findUniqueOrThrow({ where: { id: eventId } })).sourceEventFingerprint;
        }
        if (storedFingerprint !== fingerprint) {
          return reply.code(409).send({ success: false, error: 'Event ID conflict' });
        }
        return reply.code(200).send({ success: true, duplicate: true, message: 'Event already processed', notificationId: existing.id });
      };

      // 3. Determine notification type & content based on eventType
      let type: NotificationType = NotificationType.SYSTEM_ALERT;
      let title = `Notification: ${eventType}`;
      let content = `An event of type ${eventType} has occurred.`;
      let priority: NotificationPriority = NotificationPriority.MEDIUM;

      if (categorySuggestionCreated) {
        title = 'Category suggestion available';
        content = 'A category has been suggested for your expense. Review the suggestion to accept or reject it.';
      } else if (expenseStatusChanged) {
        if (payload.newStatus !== 'APPROVED' && payload.newStatus !== 'REJECTED') {
          return reply.code(200).send({ success: true, message: 'Expense status does not require a notification' });
        }
        const approved = payload.newStatus === 'APPROVED';
        type = approved ? NotificationType.EXPENSE_APPROVED : NotificationType.EXPENSE_REJECTED;
        title = approved ? 'Expense Approved' : 'Expense Rejected';
        content = approved ? 'Your expense has been approved.' : 'Your expense has been rejected.';
        priority = approved ? NotificationPriority.MEDIUM : NotificationPriority.HIGH;
      } else if (approvalStarted) {
        title = 'Approval Started';
        content = 'Your expense has been submitted for approval.';
      } else if (normalizedType === 'syncsessionfailed') {
        type = NotificationType.SYSTEM_ALERT;
        title = 'Bank sync failed';
        content = 'Your bank transactions could not be synced. Check the connection and try again.';
        priority = NotificationPriority.HIGH;
      } else if (normalizedType === 'expense.approved' || normalizedType === 'expenseapproved') {
        type = NotificationType.EXPENSE_APPROVED;
        title = 'Expense Approved';
        content = payload?.title ? `Your expense "${payload.title}" has been approved.` : 'Your expense has been approved.';
      } else if (normalizedType === 'expense.rejected' || normalizedType === 'expenserejected') {
        type = NotificationType.EXPENSE_REJECTED;
        title = 'Expense Rejected';
        content = payload?.reason ? `Your expense was rejected: ${payload.reason}` : 'Your expense has been rejected.';
        priority = NotificationPriority.HIGH;
      } else if (normalizedType.includes('threshold') || normalizedType.includes('budget')) {
        type = NotificationType.BUDGET_ALERT;
        title = 'Budget Alert';
        content = typeof payload.message === 'string' ? payload.message : 'A budget threshold has been exceeded.';
        priority = NotificationPriority.HIGH;
      } else if (normalizedType.includes('invitation')) {
        type = NotificationType.INVITATION;
        title = 'Workspace Invitation';
        content = 'You have received an invitation to join a workspace.';
      } else if (normalizedType.includes('user_created') || normalizedType.includes('usercreated')) {
        type = NotificationType.SYSTEM_ALERT;
        title = 'Welcome to Expense Tracker';
        content = 'Your account has been created successfully.';
      }

      try {
        const priorReceipt = await prisma.notificationRequest.findUnique({ where: { id: eventId } });
        if (priorReceipt) {
          if (priorReceipt.kind !== 'WEBHOOK' || priorReceipt.fingerprint !== fingerprint
            || priorReceipt.workspaceId !== workspaceId || priorReceipt.recipientId !== recipientId) {
            throw new NotificationRequestConflictError();
          }
          const suppressed = priorReceipt.notificationIds.length === 0;
          return reply.code(200).send({ success: true, duplicate: true, suppressed,
            notificationId: suppressed ? undefined : eventId });
        }
        const existing = await prisma.notification.findUnique({ where: { id: eventId } });
        if (existing) return await acknowledgeExisting(existing);
        validateText('title', title, NOTIFICATION_TITLE_MAX_LENGTH);
        validateText('content', content, NOTIFICATION_CONTENT_MAX_LENGTH);
        // This consumer generates plain-text messages from upstream fields.
        // Remove markup before storage, including content from trusted services.
        content = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
        validateText('content', content, NOTIFICATION_CONTENT_MAX_LENGTH);
        const deliveredAt = new Date();
        const outcome = await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${eventId}, 0))::text`;
          if (await tx.accountNotificationRequest.findUnique({ where: { id: eventId } })) throw new NotificationRequestConflictError();
          const receipt = await tx.notificationRequest.findUnique({ where: { id: eventId } });
          if (receipt) {
            if (receipt.kind !== 'WEBHOOK' || receipt.fingerprint !== fingerprint
              || receipt.workspaceId !== workspaceId || receipt.recipientId !== recipientId) {
              throw new NotificationRequestConflictError();
            }
            return { duplicate: true, suppressed: receipt.notificationIds.length === 0 };
          }
          // All supported webhook notifications honor global and per-type in-app
          // preferences. No payload field may declare an event mandatory. Evaluate
          // once on acceptance; a replay preserves that original decision.
          const storedPreference = await tx.notificationPreference.findUnique({
            where: { userId_workspaceId: { userId: recipientId, workspaceId } } });
          const preference = storedPreference ? NotificationPreference.fromPersistence({
            id: PreferenceId.fromString(storedPreference.id), userId: UserId.fromString(recipientId),
            workspaceId: WorkspaceId.fromString(workspaceId), emailEnabled: storedPreference.emailEnabled,
            inAppEnabled: storedPreference.inAppEnabled, pushEnabled: storedPreference.pushEnabled,
            typeSettings: storedPreference.typeSettings as Record<string, TypeSettingValue> ?? {},
            createdAt: storedPreference.createdAt, updatedAt: storedPreference.updatedAt,
          }) : NotificationPreference.create({ userId: UserId.fromString(recipientId), workspaceId: WorkspaceId.fromString(workspaceId) });
          const enabled = preference.isChannelEnabledForType(type, 'inApp');
          await tx.notificationRequest.create({ data: { id: eventId, kind: 'WEBHOOK', fingerprint,
            workspaceId, recipientId, notificationIds: enabled ? [eventId] : [] } });
          if (!enabled) return { duplicate: false, suppressed: true };
          const created = await tx.notification.create({
            data: {
              id: eventId,
              workspaceId,
              recipientId,
              type,
              channel: NotificationChannel.IN_APP,
              priority,
              sourceEventFingerprint: fingerprint,
              title,
              content,
              data: {
                ...payload,
                eventId,
                sourceEventType: eventType,
              } as Prisma.InputJsonObject,
              status: NotificationStatus.SENT,
              sentAt: deliveredAt,
              createdAt: timestamp ? new Date(timestamp) : new Date(),
            },
          });
          await tx.outboxEvent.create({ data: {
            id: randomUUID(), aggregateId: eventId, aggregateType: 'Notification', eventType: 'notification.created',
            payload: { notificationId: eventId, workspaceId, recipientId, type, channel: NotificationChannel.IN_APP, priority },
            status: 'PENDING',
          } });
          await tx.outboxEvent.create({ data: {
            id: randomUUID(), aggregateId: eventId, aggregateType: 'Notification', eventType: 'notification.sent',
            payload: { notificationId: eventId, workspaceId, recipientId, channel: NotificationChannel.IN_APP,
              sentAt: deliveredAt.toISOString() }, status: 'PENDING',
          } });
          return { duplicate: false, suppressed: false, notificationId: created.id };
        });

        request.log.info({ eventId, suppressed: outcome.suppressed }, 'Notification event accepted');
        return reply.code(outcome.duplicate || outcome.suppressed ? 200 : 201).send({
          success: true,
          duplicate: outcome.duplicate,
          suppressed: outcome.suppressed,
          notificationId: outcome.suppressed ? undefined : eventId,
        });
      } catch (err: unknown) {
        if (err instanceof NotificationRequestConflictError) {
          return reply.code(409).send({ success: false, error: 'Event ID conflict' });
        }
        if (err instanceof InvalidNotificationDataError) {
          return reply.code(err.statusCode).send({ success: false, error: err.code, message: err.message });
        }
        // Handle concurrent race condition for the same eventId
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const existing = await prisma.notification.findUnique({ where: { id: eventId } });
          if (existing) return await acknowledgeExisting(existing);
        }
        request.log.error(err, 'Failed to process outbox event in notification service');
        return reply.code(500).send({
          success: false,
          error: 'Failed to create notification',
          message: 'An unexpected error occurred',
        });
      }
    }
  );
}
