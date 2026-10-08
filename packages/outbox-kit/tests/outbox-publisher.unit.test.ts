import { createServer } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpWebhookPublisher, WebhookDeliveryError } from '../src/outbox-publisher';
import type { OutboxEventDTO } from '../src/outbox-event.entity';

describe('HTTP outbox publisher', () => {
  const servers: ReturnType<typeof createServer>[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  });

  it.each([400, 409, 422])('does not retry permanent HTTP %s payload rejection', async status => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    let requests = 0;
    const server = createServer((_request, response) => { requests++; response.writeHead(status); response.end('{}'); });
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const publisher = new HttpWebhookPublisher({ Created: [`http://127.0.0.1:${address.port}/events`] });
    const event: OutboxEventDTO = { id: crypto.randomUUID(), aggregateType: 'Budget', aggregateId: crypto.randomUUID(),
      eventType: 'Created', payload: {}, status: 'PROCESSING', retryCount: 0,
      createdAt: new Date().toISOString(), processedAt: null, error: null };
    const delivered = vi.fn();
    const error = await publisher.publish(event, delivered).catch(error => error);
    expect(error).toBeInstanceOf(WebhookDeliveryError);
    expect(error.retryable).toBe(false);
    expect(error.httpStatuses).toEqual([status]);
    expect(errorLog).not.toHaveBeenCalled();
    expect(requests).toBe(1);
    expect(delivered).not.toHaveBeenCalled();
  });

  it.each([429, 503])('still retries temporary HTTP %s failure', async status => {
    let requests = 0;
    const server = createServer((_request, response) => {
      requests++; response.writeHead(requests === 1 ? status : 200, { 'content-type': 'application/json' }); response.end('{}');
    });
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const publisher = new HttpWebhookPublisher({ Created: [`http://127.0.0.1:${address.port}/events`] });
    const event: OutboxEventDTO = { id: crypto.randomUUID(), aggregateType: 'Budget', aggregateId: crypto.randomUUID(),
      eventType: 'Created', payload: {}, status: 'PROCESSING', retryCount: 0,
      createdAt: new Date().toISOString(), processedAt: null, error: null };
    const delivered = vi.fn(); await publisher.publish(event, delivered);
    expect(requests).toBe(2); expect(delivered).toHaveBeenCalledOnce();
  });

  it('does not follow redirects carrying internal credentials or mark delivery complete', async () => {
    vi.stubEnv('INTERNAL_API_KEY', 'test-internal-key');
    let redirectedRequests = 0;
    const server = createServer((request, response) => {
      if (request.url === '/target') { redirectedRequests++; response.end('{}'); return; }
      response.writeHead(307, { location: '/target' }); response.end();
    });
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const publisher = new HttpWebhookPublisher({ Created: [`http://127.0.0.1:${address.port}/events`] });
    const event: OutboxEventDTO = {
      id: crypto.randomUUID(), aggregateType: 'CategorySuggestion', aggregateId: crypto.randomUUID(),
      eventType: 'Created', payload: {}, status: 'PROCESSING', retryCount: 0,
      createdAt: new Date().toISOString(), processedAt: null, error: null,
    };
    const delivered = vi.fn();
    await expect(publisher.publish(event, delivered)).rejects.toThrow('Delivery failed');
    expect(redirectedRequests).toBe(0); expect(delivered).not.toHaveBeenCalled();
  });

  it('does not open the subscriber circuit after repeated invalid payloads', async () => {
    let requests = 0;
    const server = createServer((_request, response) => {
      requests++; response.writeHead(requests <= 6 ? 400 : 200, { 'content-type': 'application/json' }); response.end('{}');
    });
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const publisher = new HttpWebhookPublisher({ Created: [`http://127.0.0.1:${address.port}/events`] });
    const event: OutboxEventDTO = { id: crypto.randomUUID(), aggregateType: 'Budget', aggregateId: crypto.randomUUID(),
      eventType: 'Created', payload: {}, status: 'PROCESSING', retryCount: 0,
      createdAt: new Date().toISOString(), processedAt: null, error: null };
    for (let i = 0; i < 6; i++) await expect(publisher.publish(event)).rejects.toMatchObject({ retryable: false });
    await expect(publisher.publish(event)).resolves.toBeUndefined();
    expect(requests).toBe(7);
  });

  it('retains retryability when another subscriber has a temporary failure', async () => {
    const counts = { invalid: 0, unavailable: 0 };
    const server = createServer((request, response) => {
      const invalid = request.url === '/invalid';
      counts[invalid ? 'invalid' : 'unavailable']++;
      response.writeHead(invalid ? 400 : 503); response.end('{}');
    });
    servers.push(server);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const base = `http://127.0.0.1:${address.port}`;
    const publisher = new HttpWebhookPublisher({ Created: [`${base}/invalid`, `${base}/unavailable`] });
    const event: OutboxEventDTO = { id: crypto.randomUUID(), aggregateType: 'Budget', aggregateId: crypto.randomUUID(),
      eventType: 'Created', payload: {}, status: 'PROCESSING', retryCount: 0,
      createdAt: new Date().toISOString(), processedAt: null, error: null };
    await expect(publisher.publish(event)).rejects.toMatchObject({ retryable: true });
    expect(counts).toEqual({ invalid: 1, unavailable: 3 });
  });

  it('does not treat a webhook as delivered when recording its receipt fails', async () => {
    let requests = 0;
    const server = createServer((_request, response) => {
      requests++;
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{}');
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    const url = `http://127.0.0.1:${address.port}/events`;
    const publisher = new HttpWebhookPublisher({ Created: [url] });
    const event: OutboxEventDTO = {
      id: crypto.randomUUID(), aggregateType: 'BankConnection', aggregateId: crypto.randomUUID(),
      eventType: 'Created', payload: {}, status: 'PROCESSING', retryCount: 0,
      createdAt: new Date().toISOString(), processedAt: null, error: null,
    };

    await expect(publisher.publish(event, async () => {
      throw new Error('database unavailable');
    })).rejects.toThrow('delivery state could not be recorded');
    expect(requests).toBe(1);
  });
});
