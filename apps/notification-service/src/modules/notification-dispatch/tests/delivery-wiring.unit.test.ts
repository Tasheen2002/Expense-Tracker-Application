import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCompositionRoot } from '../../../composition-root';
import { PrismaClient } from '../../../prisma-client';
import { SendNotificationHandler } from '../application/commands/send-notification.command';

const prisma = new PrismaClient();
afterEach(() => { vi.unstubAllEnvs(); });
afterAll(async () => { await prisma.$disconnect(); });
describe('Production delivery composition', () => {
  beforeEach(() => { vi.stubEnv('NOTIFICATION_EMAIL_PROVIDER', 'resend'); });
  it('pauses delivery when both email settings are absent and wires the required-ID command', () => {
    vi.stubEnv('RESEND_API_KEY', ''); vi.stubEnv('NOTIFICATION_EMAIL_FROM', ''); const root = createCompositionRoot(prisma);
    expect(root.workers.email).toBeUndefined();
    expect(root.sendNotificationHandler).toBeInstanceOf(SendNotificationHandler);
  });
  it.each(['key', 'sender'])('rejects partially configured transport: only %s', field => {
    vi.stubEnv('RESEND_API_KEY', field === 'key' ? 'test-only-key' : '');
    vi.stubEnv('NOTIFICATION_EMAIL_FROM', field === 'sender' ? 'sender@example.com' : '');
    expect(() => createCompositionRoot(prisma)).toThrow('Configure both');
  });
  it('wires the durable worker when transport configuration is complete', () => {
    vi.stubEnv('RESEND_API_KEY', 'test-only-key'); vi.stubEnv('NOTIFICATION_EMAIL_FROM', 'sender@example.com');
    const root = createCompositionRoot(prisma); expect(root.workers.email).toBeDefined();
  });
});

