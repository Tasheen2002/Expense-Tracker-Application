import { IChannelProvider } from './channel-provider.interface';

/** Non-idempotent transports require reconciliation after a prepared attempt. */
export interface IRecoverableEmailProvider extends IChannelProvider {
  readonly providerName: string;
  readonly senderEmail: string;
  /** Omitted means the original contract: durable-key idempotency for 24h. */
  readonly supportsIdempotency?: boolean;
}
