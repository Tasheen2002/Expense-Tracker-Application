import Decimal from 'decimal.js';
import { Currency } from '@core/domain/value-objects/currency.vo';
import { UuidId } from '@core/domain/value-objects/uuid-id.base';
import { DomainEvent } from '@core/domain/events/domain-event';
import { ReceiptValidationError } from '../errors/receipt.errors';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export function invalid(field: string, message: string): never { throw new ReceiptValidationError(field, message); }
export function uuid(value: string, field: string): string {
  if (!UuidId.isValid(value)) invalid(field, 'Expected a UUID');
  return value.toLowerCase();
}
export function text(value: string | undefined, field: string, max: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > max) invalid(field, `Expected text of at most ${max} characters`);
  return value.trim() || undefined;
}
export function date(value: Date, field: string): Date {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) invalid(field, 'Expected a valid date');
  return new Date(value.getTime());
}
export function amount(value: Decimal.Value | undefined, field: string): Decimal | undefined {
  if (value === undefined) return undefined;
  let parsed: Decimal;
  try { parsed = new Decimal(value); } catch { return invalid(field, 'Expected a decimal amount'); }
  if (!parsed.isFinite() || parsed.isNegative() || parsed.decimalPlaces() > 2 || parsed.gt('9999999999.99')) invalid(field, 'Expected a nonnegative amount with at most two decimal places within Decimal(12,2)');
  return parsed;
}
export function currency(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  try { const code = Currency.create(value).getValue(); if (!/^[A-Z]{3}$/.test(code)) invalid('currency', 'Expected a three-letter supported currency'); return code; } catch { return invalid('currency', 'Unsupported currency'); }
}
export function json(value: unknown, depth = 0): JsonValue {
  if (depth > 10) invalid('customFields', 'JSON nesting exceeds ten levels');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(item => json(item, depth + 1));
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
    const result: { [key: string]: JsonValue } = {};
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key) || !key || key.length > 100) invalid('customFields', 'Invalid JSON key');
      result[key] = json(item, depth + 1);
    }
    return result;
  }
  return invalid('customFields', 'Expected finite JSON values');
}
export function jsonFields(value: unknown): Record<string, JsonValue> {
  const copied = json(value);
  if (copied === null || typeof copied !== 'object' || Array.isArray(copied)) invalid('customFields', 'Expected a JSON object');
  if (JSON.stringify(copied).length > 16384) invalid('customFields', 'JSON exceeds 16 KiB');
  return copied;
}
type ReceiptContext = { receiptId: string; workspaceId: string; userId: string };
type TagContext = { tagId: string; workspaceId: string };
type MetadataContext = { metadataId: string; receiptId: string };
export interface ReceiptAuditPayloads {
  ReceiptUnlinkedFromExpense: ReceiptContext;
  ReceiptProcessingStarted: ReceiptContext;
  ReceiptProcessingFailed: ReceiptContext & { reason: string };
  ReceiptVerified: ReceiptContext;
  ReceiptRejected: ReceiptContext & { reason?: string };
  ReceiptThumbnailUpdated: ReceiptContext;
  ReceiptRestored: ReceiptContext;
  ReceiptTagCreated: TagContext;
  ReceiptTagUpdated: TagContext;
  ReceiptMetadataCreated: MetadataContext;
  ReceiptMetadataUpdated: MetadataContext;
  ReceiptTagAssigned: ReceiptContext & { tagId: string };
  ReceiptTagRemoved: ReceiptContext & { tagId: string };
}
export type ReceiptLifecycleEventType = 'ReceiptUnlinkedFromExpense' | 'ReceiptProcessingStarted' | 'ReceiptVerified' | 'ReceiptThumbnailUpdated' | 'ReceiptRestored';
type AuditAggregate<T extends keyof ReceiptAuditPayloads> = T extends 'ReceiptTagCreated' | 'ReceiptTagUpdated' ? 'ReceiptTagDefinition' : T extends 'ReceiptMetadataCreated' | 'ReceiptMetadataUpdated' ? 'ReceiptMetadata' : 'Receipt';
export class ReceiptAuditEvent<T extends keyof ReceiptAuditPayloads> extends DomainEvent {
  private readonly payload: Record<string, JsonValue>;
  constructor(id: string, aggregateType: AuditAggregate<T>, public readonly eventType: T, payload: ReceiptAuditPayloads[T]) {
    super(id, aggregateType); this.payload = jsonFields(payload);
  }
  getPayload(): Record<string, unknown> { return jsonFields(this.payload); }
}

/** Value snapshot of the DomainEvent contract; concrete event prototypes are not copied. */
class DomainEventSnapshot extends DomainEvent {
  override readonly eventId: string;
  override readonly occurredAt: Date;
  readonly eventType: string;
  private readonly payload: Record<string, unknown>;

  constructor(event: DomainEvent) {
    super(event.aggregateId, event.aggregateType);
    this.eventId = event.eventId;
    this.occurredAt = new Date(event.occurredAt);
    this.eventType = event.eventType;
    this.payload = structuredClone(event.getPayload());
  }

  getPayload(): Record<string, unknown> {
    return structuredClone(this.payload);
  }
}

export function eventSnapshots(events: DomainEvent[]): DomainEvent[] {
  return events.map(event => new DomainEventSnapshot(event));
}
