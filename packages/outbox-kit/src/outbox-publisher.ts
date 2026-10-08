import ky, { HTTPError } from 'ky';
import { OutboxEventDTO } from './outbox-event.entity';
import { CircuitBreaker, withRetry, withTimeout } from '@expense-tracker/resilience';

export interface IEventPublisher {
  publish(
    event: OutboxEventDTO,
    onSubscriberSuccess?: (url: string) => Promise<void>
  ): Promise<void>;
}

// Map event types to arrays of microservice endpoint URLs that subscribe to them
export type WebhookRoutes = Record<string, string[]>;

export class WebhookDeliveryError extends Error {
  constructor(message: string, public readonly retryable: boolean, public readonly httpStatuses: readonly number[] = []) {
    super(message);
    this.name = 'WebhookDeliveryError';
  }
}

function isPermanentRejection(error: unknown): boolean {
  // Auth/configuration errors and rate limits may recover. Payload rejections
  // cannot recover by repeatedly sending an identical event.
  return error instanceof HTTPError && [400, 404, 405, 409, 410, 413, 415, 422].includes(error.response.status);
}

export class HttpWebhookPublisher implements IEventPublisher {
  private readonly circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(private readonly routes: WebhookRoutes) {
    // Create a circuit breaker per subscriber URL for isolated failure tracking
    for (const urls of Object.values(routes)) {
      for (const url of urls) {
        if (!this.circuitBreakers.has(url)) {
          this.circuitBreakers.set(
            url,
            new CircuitBreaker({
              name: `CB:${new URL(url).hostname}`,
              failureThreshold: 5,
              resetTimeoutMs: 30_000,
            })
          );
        }
      }
    }
  }

  async publish(
    event: OutboxEventDTO,
    onSubscriberSuccess?: (url: string) => Promise<void>
  ): Promise<void> {
    const urls = this.routes[event.eventType];
    if (!urls) {
      throw new WebhookDeliveryError(
        `[Outbox-Publisher] Unmapped event type "${event.eventType}" (ID: ${event.id}). No subscriber routes configured.`,
        false
      );
    }

    if (urls.length === 0) {
      return;
    }

    // Filter out URLs that have already received this event
    const deliveredSet = new Set(event.deliveredTo || []);
    const pendingUrls = urls.filter((url) => !deliveredSet.has(url));

    if (pendingUrls.length === 0) {
      return;
    }

    // Deliver event to all pending microservices concurrently
    // Use Promise.allSettled so one subscriber failure doesn't block others
    const results = await Promise.allSettled(
      pendingUrls.map((url) => this.deliverToSubscriber(url, event))
    );

    // Track per-subscriber outcomes and invoke success callback
    const failures: string[] = [];
    const httpStatuses = new Set<number>();
    let retryable = false;
    for (let index = 0; index < results.length; index++) {
      const result = results[index];
      const url = pendingUrls[index];

      if (result.status === 'rejected') {
        if (result.reason instanceof HTTPError) httpStatuses.add(result.reason.response.status);
        retryable ||= !isPermanentRejection(result.reason);
        const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        failures.push(`${url}: ${errMsg}`);
        if (!isPermanentRejection(result.reason)) console.error(
          `[Outbox-Publisher] Failed to dispatch event ${event.eventType} (ID: ${event.id}) to ${url}:`,
          errMsg
        );
      } else {
        if (onSubscriberSuccess) {
          try {
            await onSubscriberSuccess(url);
          } catch (persistErr: unknown) {
            retryable = true;
            const errMsg = persistErr instanceof Error ? persistErr.message : String(persistErr);
            failures.push(`${url}: delivery state could not be recorded: ${errMsg}`);
            console.error(
              `[Outbox-Publisher] Failed to record delivery for event ${event.id} to ${url}:`,
              errMsg
            );
          }
        }
      }
    }

    // If ANY subscriber failed, throw so OutboxWorker retries failed subscribers later
    if (failures.length > 0) {
      throw new WebhookDeliveryError(
        `[Outbox-Publisher] Delivery failed for ${failures.length}/${pendingUrls.length} subscriber(s) for event ${event.eventType} (ID: ${event.id}): ${failures.join('; ')}`,
        retryable,
        [...httpStatuses]
      );
    }
  }

  private async deliverToSubscriber(url: string, event: OutboxEventDTO): Promise<void> {
    const cb = this.circuitBreakers.get(url);
    const correlationId =
      typeof event.payload === 'object' &&
      event.payload !== null &&
      'correlationId' in event.payload &&
      typeof (event.payload as Record<string, unknown>).correlationId === 'string'
        ? ((event.payload as Record<string, unknown>).correlationId as string)
        : event.id;

    const deliverFn = () =>
      withTimeout(
        () =>
          ky
            .post(url, {
              // Internal credentials and event payloads must never follow redirects.
              redirect: 'error',
              headers: {
                'x-correlation-id': correlationId,
                ...(process.env.INTERNAL_API_KEY ? { 'x-internal-api-key': process.env.INTERNAL_API_KEY } : {}),
              },
              json: {
                eventId: event.id,
                eventType: event.eventType,
                aggregateId: event.aggregateId,
                aggregateType: event.aggregateType,
                payload: event.payload,
                timestamp: event.createdAt,
              },
              timeout: 10_000,
              retry: 0, // One retry policy owns delivery; prevent Ky adding another.
            })
            .json(),
        10_000,
        `Webhook:${url}`
      );

    const retryingFn = () =>
      withRetry(deliverFn, {
        maxRetries: 2,
        baseDelayMs: 500,
        maxDelayMs: 5_000,
        name: `Retry:${url}`,
        shouldRetry: error => !isPermanentRejection(error),
      });

    if (cb) {
      // A validation rejection proves the subscriber is reachable. Do not let
      // malformed historical payloads open its availability circuit.
      const rejection = await cb.execute(async () => {
        try { await retryingFn(); return null; }
        catch (error) { if (isPermanentRejection(error)) return error; throw error; }
      });
      if (rejection) throw rejection;
    } else {
      await retryingFn();
    }
  }
}
