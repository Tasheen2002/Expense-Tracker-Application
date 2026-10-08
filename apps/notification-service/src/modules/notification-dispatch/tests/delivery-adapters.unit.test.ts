import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmailProvider } from '../application/providers/email.provider';
import { PrismaRecipientLookupAdapter } from '../infrastructure/adapters/recipient-lookup.adapter';
import { UserId } from '../domain/value-objects';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const config = { host: 'test', port: 587, secure: false, auth: { user: 'test', pass: 'test' }, from: 'sender@example.com' };
const message = { recipientId: UserId.create().getValue(), recipientEmail: 'review@example.com',
  idempotencyKey: 'stable-key', subject: 'Subject', content: '<p>Body</p>' };

describe('Email provider', () => {
  it('reports failure when no real transport exists', async () => {
    expect(await new EmailProvider(config).send(message)).toEqual({ success: false, error: 'Email transport is not configured' });
  });
  it('requires an address before calling a transport', async () => {
    const send = vi.fn();
    expect((await new EmailProvider(config, { send }).send({ ...message, recipientEmail: undefined })).success).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it('passes the durable key to a real transport and preserves its result', async () => {
    const send = vi.fn().mockResolvedValue({ success: true, messageId: 'provider-id' });
    expect(await new EmailProvider(config, { send }).send(message)).toEqual({ success: true, messageId: 'provider-id' });
    expect(send).toHaveBeenCalledWith({ from: config.from, to: message.recipientEmail,
      subject: message.subject, html: message.content, idempotencyKey: message.idempotencyKey });
  });
  it('does not treat a transport exception as success', async () => {
    expect(await new EmailProvider(config, { send: vi.fn().mockRejectedValue(new Error('failed')) }).send(message))
      .toEqual({ success: false, error: 'failed' });
  });
});

describe('Recipient lookup adapter', () => {
  const user = UserId.fromString(message.recipientId);
  it('fails before network access when service credentials are missing', async () => {
    vi.stubEnv('INTERNAL_API_KEY', ''); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(new PrismaRecipientLookupAdapter().findEmail(user)).rejects.toThrow('credentials');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('sends internal credentials and uses a bounded timeout', async () => {
    vi.stubEnv('INTERNAL_API_KEY', 'test-only-key');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { userId: user.getValue(), email: 'review@example.com' } })));
    vi.stubGlobal('fetch', fetch);
    expect(await new PrismaRecipientLookupAdapter().findEmail(user)).toBe('review@example.com');
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/users/${user.getValue()}`),
      expect.objectContaining({ headers: { 'x-internal-api-key': 'test-only-key', 'x-user-id': user.getValue() }, signal: expect.any(AbortSignal) }));
  });
  it.each([401, 500])('does not disguise downstream status %s as a missing user', async status => {
    vi.stubEnv('INTERNAL_API_KEY', 'test-only-key'); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })));
    await expect(new PrismaRecipientLookupAdapter().findEmail(user)).rejects.toThrow(`status ${status}`);
  });
  it('returns null only for a missing user', async () => {
    vi.stubEnv('INTERNAL_API_KEY', 'test-only-key'); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    expect(await new PrismaRecipientLookupAdapter().findEmail(user)).toBeNull();
  });
  it('rejects mismatched user data instead of emailing another user', async () => {
    vi.stubEnv('INTERNAL_API_KEY', 'test-only-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { userId: UserId.create().getValue(), email: 'other@example.com' } }))));
    await expect(new PrismaRecipientLookupAdapter().findEmail(user)).rejects.toThrow('mismatched');
  });
  it('rejects an id-only fixture that does not match the Identity user DTO', async () => {
    vi.stubEnv('INTERNAL_API_KEY', 'test-only-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { id: user.getValue(), email: 'review@example.com' },
    }))));
    await expect(new PrismaRecipientLookupAdapter().findEmail(user)).rejects.toThrow('invalid');
  });
});
