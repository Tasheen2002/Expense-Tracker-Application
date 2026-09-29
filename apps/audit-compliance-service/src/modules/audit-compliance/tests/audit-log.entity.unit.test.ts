import { describe, expect, it } from 'vitest';
import { AuditLog } from '../domain/entities/audit-log.entity';
import { InvalidAuditIdentityError } from '../domain/errors/audit.errors';

const workspaceId = '123e4567-e89b-12d3-a456-426614174001';
const userId = '123e4567-e89b-12d3-a456-426614174002';
const entityId = '123e4567-e89b-12d3-a456-426614174003';

function data() {
  return {
    workspaceId, userId, action: 'expense.created', entityType: 'Expense', entityId,
    details: { nested: { amount: 20 } }, metadata: { source: { name: 'webhook' } },
    ipAddress: null, userAgent: null, createdAt: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('AuditLog immutable state', () => {
  it('copies input and returns independent dates and JSON objects', () => {
    const input = data();
    const log = AuditLog.create(input);
    input.createdAt.setUTCFullYear(2030);
    input.details.nested.amount = 99;
    input.metadata.source.name = 'modified';

    log.createdAt.setUTCFullYear(2040);
    (log.details!.nested as { amount: number }).amount = 88;
    (log.metadata!.source as { name: string }).name = 'changed';
    const dto = AuditLog.toDTO(log);
    (dto.details!.nested as { amount: number }).amount = 77;

    expect(log.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(log.details).toEqual({ nested: { amount: 20 } });
    expect(log.metadata).toEqual({ source: { name: 'webhook' } });
  });

  it('rejects invalid workspace and actor IDs in domain creation', () => {
    expect(() => AuditLog.create({ ...data(), workspaceId: 'invalid' })).toThrow(InvalidAuditIdentityError);
    expect(() => AuditLog.create({ ...data(), userId: 'invalid' })).toThrow(InvalidAuditIdentityError);
  });
});
