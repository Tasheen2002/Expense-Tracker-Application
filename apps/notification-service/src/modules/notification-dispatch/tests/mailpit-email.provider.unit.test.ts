import { afterEach, describe, expect, it, vi } from 'vitest';
import { MailpitEmailProvider } from '../infrastructure/adapters/mailpit-email.provider';
import { createCompositionRoot } from '../../../composition-root';
import { PrismaClient } from '../../../prisma-client';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const message = { idempotencyKey: 'notification-test', recipientId: 'recipient',
  recipientEmail: 'developer@example.test', subject: 'Local test', content: '<p>Captured locally</p>' };

describe('Mailpit development transport', () => {
  it('sends the documented API contract and declares non-idempotent behavior', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ID: 'captured-id' }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const provider = new MailpitEmailProvider('http://localhost:8025', 'notifications@expense-tracker.test');
    expect(provider.supportsIdempotency).toBe(false);
    expect(await provider.send(message)).toEqual({ success: true, messageId: 'captured-id' });
    expect(fetch).toHaveBeenCalledWith('http://localhost:8025/api/v1/send', expect.objectContaining({
      method: 'POST', redirect: 'error', body: JSON.stringify({ From: { Email: 'notifications@expense-tracker.test' },
        To: [{ Email: message.recipientEmail }], Subject: message.subject, HTML: message.content,
        Headers: { 'X-Notification-ID': message.idempotencyKey } }),
    }));
  });
  it('does not call the transport without a recipient', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await new MailpitEmailProvider('http://localhost:8025', 'sender@example.test')
      .send({ ...message, recipientEmail: undefined })).success).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([500, 429, 200])('treats response %s without a capture ID as uncertain', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    expect(await new MailpitEmailProvider('http://localhost:8025', 'sender@example.test').send(message))
      .toMatchObject({ success: false, retryable: true });
  });
  it('sanitizes terminal errors and uncertain network outcomes', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('private details', { status: 400 }))
      .mockRejectedValueOnce(new Error('private transport failure'));
    vi.stubGlobal('fetch', fetch);
    const provider = new MailpitEmailProvider('http://localhost:8025', 'sender@example.test');
    expect(await provider.send(message)).toEqual({ success: false, retryable: false, error: 'Mailpit response 400' });
    expect(await provider.send(message)).toEqual({ success: false, retryable: true, error: 'Mailpit capture outcome is uncertain' });
  });
  it.each(['file:///tmp', 'http://user:secret@localhost:8025', 'http://localhost:8025/path', 'http://localhost:8025?secret=x'])
    ('rejects invalid origin %s', url => {
      expect(() => new MailpitEmailProvider(url, 'sender@example.test')).toThrow('HTTP origin');
    });
  it('rejects Mailpit selection in production and unsupported provider names', () => {
    vi.stubEnv('NOTIFICATION_EMAIL_PROVIDER', 'mailpit'); vi.stubEnv('NODE_ENV', 'production');
    const prisma = new PrismaClient();
    expect(() => createCompositionRoot(prisma)).toThrow('Mailpit is disabled');
    vi.stubEnv('NOTIFICATION_EMAIL_PROVIDER', 'unknown');
    expect(() => createCompositionRoot(prisma)).toThrow('must be resend or mailpit');
  });
  it('wires development delivery without Resend credentials', () => {
    vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('NOTIFICATION_EMAIL_PROVIDER', 'mailpit');
    vi.stubEnv('RESEND_API_KEY', ''); vi.stubEnv('NOTIFICATION_EMAIL_FROM', '');
    expect(createCompositionRoot(new PrismaClient()).workers.email).toBeDefined();
  });
});
