import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

/** Requeue only failed work. Never overwrite business payloads or delivery history. */
export async function retryFailedEvent(prisma: PrismaClient, eventId: string): Promise<boolean> {
  z.string().uuid().parse(eventId);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM categorization_rules.outbox_event WHERE id = ${eventId} FOR UPDATE`;
    const event = await tx.outboxEvent.findUnique({ where: { id: eventId } });
    if (!event || !['FAILED', 'DEAD_LETTER'].includes(event.status)) return false;
    if (event.eventType === 'CategorySuggestionAccepted') {
      const valid = z.object({ workspaceId: z.string().uuid(), expenseId: z.string().uuid(), categoryId: z.string().uuid(),
        acceptedBy: z.string().uuid(), expenseVersion: z.number().int().positive(),
      }).safeParse(event.payload);
      if (!valid.success) throw new Error('Legacy acceptance lacks verified actor/version metadata. Review it and create a fresh suggestion; payloads must not be invented.');
    }
    if (event.eventType === 'CategorySuggestionCreated' && !z.object({
      workspaceId: z.string().uuid(), suggestionId: z.string().uuid(), expenseId: z.string().uuid(),
      suggestedCategoryId: z.string().uuid(), expenseOwnerId: z.string().uuid(),
    }).safeParse(event.payload).success) {
      throw new Error('Legacy suggestion creation lacks verified expense-owner metadata. Create a fresh suggestion through the authorized API; payloads must not be invented.');
    }
    await tx.outboxEvent.update({ where: { id: eventId }, data: { status: 'PENDING', retryCount: 0,
      nextAttemptAt: new Date(), error: null, leaseToken: null, leaseExpiresAt: null, processedAt: null } });
    return true;
  });
}
