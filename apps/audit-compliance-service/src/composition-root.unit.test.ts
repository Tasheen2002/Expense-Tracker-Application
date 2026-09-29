import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { createCompositionRoot } from './composition-root';

describe('audit composition root', () => {
  it('creates an independent, typed dependency graph for each Prisma client', () => {
    const first = createCompositionRoot({} as PrismaClient);
    const second = createCompositionRoot({} as PrismaClient);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
    expect(first).not.toBe(second);
    expect(first.auditService).not.toBe(second.auditService);
    expect(first.auditLogController).not.toBe(second.auditLogController);
  });

  it('rejects a missing database dependency', () => {
    expect(() => createCompositionRoot(undefined as unknown as PrismaClient)).toThrow();
  });
});
