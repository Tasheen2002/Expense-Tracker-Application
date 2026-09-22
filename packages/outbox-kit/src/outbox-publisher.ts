import ky from 'ky';
import { OutboxEventDTO } from './outbox-event.entity';

export interface IEventPublisher {
  publish(event: OutboxEventDTO): Promise<void>;
}

// Map event types to arrays of microservice endpoint URLs that subscribe to them
export type WebhookRoutes = Record<string, string[]>;

export class HttpWebhookPublisher implements IEventPublisher {
  constructor(private readonly routes: WebhookRoutes) {}

  async publish(event: OutboxEventDTO): Promise<void> {
    const urls = this.routes[event.eventType];
    if (!urls || urls.length === 0) {
      return;
    }

    // Deliver event to all registered microservices concurrently
    const deliverPromises = urls.map(async (url) => {
      try {
        await ky.post(url, {
          json: {
            eventId: event.id,
            eventType: event.eventType,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            payload: event.payload,
            timestamp: event.createdAt,
          },
          timeout: 5000,
        }).json();
      } catch (error: any) {
        console.error(
          `[Outbox-Publisher] Failed to dispatch event ${event.eventType} (ID: ${event.id}) to ${url}:`,
          error.message || error
        );
        throw error; // Propagate error so the outbox publisher marks this event run as failed
      }
    });

    await Promise.all(deliverPromises);
  }
}
