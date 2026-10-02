import { afterEach, expect, it, vi } from 'vitest';
import { EmailDeliveryWorker } from '../email-delivery.worker';
import { EmailDeliveryService } from '../../modules/notification-dispatch/application/services/email-delivery.service';
import { IEmailDeliveryRepository } from '../../modules/notification-dispatch/application/ports/email-delivery.repository';

afterEach(() => { vi.useRealTimers(); });
function setup() {
  const repository: IEmailDeliveryRepository = { claim: vi.fn().mockResolvedValue([]), load: vi.fn(),
    prepare: vi.fn(), complete: vi.fn(), retry: vi.fn() };
  const service = new EmailDeliveryService(repository,
    { providerName: 'test', senderEmail: 'test@example.com', send: vi.fn() }, { findEmail: vi.fn() });
  const onError = vi.fn(); const worker = new EmailDeliveryWorker(service, onError, 1000);
  return { repository, worker, onError };
}
it('does not overlap batches and waits for an active batch during shutdown', async () => {
  vi.useFakeTimers(); const c = setup(); let resolveBatch!: (rows: []) => void;
  vi.mocked(c.repository.claim).mockImplementation(() => new Promise(resolve => { resolveBatch = resolve; }));
  c.worker.start(); c.worker.start(); await vi.advanceTimersByTimeAsync(3000);
  expect(c.repository.claim).toHaveBeenCalledTimes(1);
  let stopped = false; const stop = c.worker.stop().then(() => { stopped = true; });
  await Promise.resolve(); expect(stopped).toBe(false);
  resolveBatch([]); await stop; expect(stopped).toBe(true);
  await vi.advanceTimersByTimeAsync(3000); expect(c.repository.claim).toHaveBeenCalledTimes(1);
});
it('reports a failed batch and polls again rather than stopping permanently', async () => {
  vi.useFakeTimers(); const c = setup(); vi.mocked(c.repository.claim).mockRejectedValueOnce(new Error('database down'));
  c.worker.start(); await vi.advanceTimersByTimeAsync(1000);
  expect(c.onError).toHaveBeenCalledTimes(1); expect(c.repository.claim).toHaveBeenCalledTimes(2);
  await c.worker.stop();
});
