export type OutboxEventStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'DEAD_LETTER';

export interface OutboxEventDTO {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: OutboxEventStatus;
  createdAt: string;
  processedAt: string | null;
  retryCount: number;
  error: string | null;
  deliveredTo?: string[];
  leaseToken?: string | null;
  leaseExpiresAt?: string | null;
  nextAttemptAt?: string | null;
}

export interface IOutboxEventRepository {
  findPending(limit: number): Promise<OutboxEventDTO[]>;
  findFailed(limit: number, maxRetries: number): Promise<OutboxEventDTO[]>;
  claimPending?(limit: number, leaseDurationMs?: number): Promise<OutboxEventDTO[]>;
  claimFailed?(limit: number, maxRetries: number, leaseDurationMs?: number): Promise<OutboxEventDTO[]>;
  releaseExpiredLeases?(): Promise<number>;
  markDelivered?(id: string, subscriberUrl: string, leaseToken?: string | null): Promise<boolean | void>;
  updateStatus(id: string, status: OutboxEventStatus, error?: string | null, leaseToken?: string | null): Promise<boolean | void>;
  incrementRetry(id: string, error: string, leaseToken?: string | null): Promise<boolean | void>;
  renewLease?(id: string, leaseToken: string, durationMs: number): Promise<boolean>;
  deleteProcessedBefore(days: number): Promise<number>;
  save(event: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}
