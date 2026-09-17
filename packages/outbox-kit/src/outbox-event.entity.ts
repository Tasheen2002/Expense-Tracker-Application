export type OutboxEventStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

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
}

export interface IOutboxEventRepository {
  findPending(limit: number): Promise<OutboxEventDTO[]>;
  findFailed(limit: number, maxRetries: number): Promise<OutboxEventDTO[]>;
  updateStatus(id: string, status: OutboxEventStatus, error?: string | null): Promise<void>;
  incrementRetry(id: string, error: string): Promise<void>;
  deleteProcessedBefore(days: number): Promise<number>;
  save(event: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}
