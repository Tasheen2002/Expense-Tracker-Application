import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResendEmailProvider } from '../infrastructure/adapters/resend-email.provider';

afterEach(() => { vi.unstubAllGlobals(); });
const message = { idempotencyKey: 'durable-id', recipientId: 'recipient-id', recipientEmail: 'recipient@example.com',
  senderEmail: 'original-sender@example.com', subject: 'Subject', content: '<p>Content</p>' };
describe('Resend recovery transport', () => {
  it('uses the stored sender, fixed endpoint and durable idempotency header', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'provider-id' }))); vi.stubGlobal('fetch', fetch);
    const provider = new ResendEmailProvider('test-only-key', 'new-configured-sender@example.com');
    expect(await provider.send(message)).toEqual({ success: true, messageId: 'provider-id' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers).toMatchObject({ 'Idempotency-Key': message.idempotencyKey });
    expect(JSON.parse(init.body)).toEqual({ from: message.senderEmail, to: [message.recipientEmail],
      subject: message.subject, html: message.content });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([429, 500, 503])('retries transient status %s without storing raw response secrets', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'secret-provider-details' }), { status })));
    const result = await new ResendEmailProvider('test-only-key', 'sender@example.com').send(message);
    expect(result).toMatchObject({ success: false, retryable: true }); expect(result.error).not.toContain('secret-provider-details');
  });
  it('retries concurrent idempotency conflicts but terminates changed-payload conflicts', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ name: 'concurrent_idempotent_requests' }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: 'invalid_idempotent_request' }), { status: 409 }));
    vi.stubGlobal('fetch', fetch); const provider = new ResendEmailProvider('test-only-key', 'sender@example.com');
    expect((await provider.send(message)).retryable).toBe(true); expect((await provider.send(message)).retryable).toBe(false);
  });
  it('treats timeouts and invalid success bodies as uncertain, never as confirmed rejection', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('timeout-secret')).mockResolvedValueOnce(new Response('invalid-json'));
    vi.stubGlobal('fetch', fetch); const provider = new ResendEmailProvider('test-only-key', 'sender@example.com');
    expect(await provider.send(message)).toMatchObject({ success: false, retryable: true });
    expect(await provider.send(message)).toMatchObject({ success: false, retryable: true });
  });
  it('distinguishes provider credential identities without persisting raw API keys', () => {
    const a = new ResendEmailProvider('first-test-key', 'sender@example.com');
    const b = new ResendEmailProvider('second-test-key', 'sender@example.com');
    expect(a.providerName).not.toBe(b.providerName); expect(a.providerName).not.toContain('first-test-key');
  });
});
