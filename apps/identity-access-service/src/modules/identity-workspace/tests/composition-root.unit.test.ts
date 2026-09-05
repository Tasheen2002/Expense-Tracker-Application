import { describe, it, expect, vi } from 'vitest';
import { createCompositionRoot, CompositionRoot } from '../../../composition-root';
import { buildIdentityApp } from '../../../app';
import { PrismaClient } from '@prisma/client';

describe('Composition Root — Typed Factory Pattern (Unit)', () => {
  const createMockPrisma = () =>
    ({
      $queryRaw: vi.fn(),
      $transaction: vi.fn(),
      user: { findUnique: vi.fn(), create: vi.fn() },
      workspace: { findUnique: vi.fn(), create: vi.fn() },
      workspaceMember: { findUnique: vi.fn(), create: vi.fn() },
      workspaceInvitation: { findUnique: vi.fn(), create: vi.fn() },
      authSession: { findUnique: vi.fn(), create: vi.fn() },
      outboxEvent: { findMany: vi.fn(), updateMany: vi.fn() },
    } as unknown as PrismaClient);

  it('fails fast if PrismaClient is missing', () => {
    expect(() => createCompositionRoot(null as unknown as PrismaClient)).toThrow(
      '[CompositionRoot] FATAL: A valid PrismaClient instance must be provided.'
    );
  });

  it('constructs a strongly-typed graph with frozen public surfaces and zero string lookups', () => {
    const mockPrisma = createMockPrisma();
    const root = createCompositionRoot(mockPrisma);

    expect(root).toBeDefined();
    expect(root.sessionService).toBeDefined();
    expect(root.controllers).toBeDefined();
    expect(root.controllers.authController).toBeDefined();
    expect(root.controllers.workspaceController).toBeDefined();
    expect(root.controllers.invitationController).toBeDefined();
    expect(root.controllers.memberController).toBeDefined();

    // Verify public surface is frozen
    expect(Object.isFrozen(root)).toBe(true);
    expect(Object.isFrozen(root.controllers)).toBe(true);
  });

  it('guarantees isolated, independent dependency graphs across multiple calls (zero singleton state)', () => {
    const mockPrisma1 = createMockPrisma();
    const mockPrisma2 = createMockPrisma();

    const root1 = createCompositionRoot(mockPrisma1);
    const root2 = createCompositionRoot(mockPrisma2);

    expect(root1).not.toBe(root2);
    expect(root1.controllers).not.toBe(root2.controllers);
    expect(root1.sessionService).not.toBe(root2.sessionService);
    expect(root1.controllers.authController).not.toBe(root2.controllers.authController);
  });

  it('injects custom compositionRootFactory into buildIdentityApp tied to Fastify prisma lifecycle', async () => {
    let factoryCalledWithPrisma: PrismaClient | null = null;

    const mockFactory = vi.fn((prisma: PrismaClient): CompositionRoot => {
      factoryCalledWithPrisma = prisma;
      const actualRoot = createCompositionRoot(prisma);
      return actualRoot;
    });

    const app = await buildIdentityApp({
      enableInternalAuth: false,
      logger: false,
      compositionRootFactory: mockFactory,
    });

    try {
      expect(mockFactory).toHaveBeenCalledTimes(1);
      expect(factoryCalledWithPrisma).toBe(app.prisma);
      expect(app.hasRoute({ method: 'POST', url: '/api/v1/auth/login' })).toBe(true);
      expect(app.hasRoute({ method: 'POST', url: '/api/v1/workspaces' })).toBe(true);
    } finally {
      await app.close();
    }
  });
});
