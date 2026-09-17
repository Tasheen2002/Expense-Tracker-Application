import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExemptionExpirationScheduler } from '../exemption-expiration.scheduler';
import { ExpireExemptionsHandler } from '../../modules/policy-controls/application/commands/expire-exemptions.command';
import { OperationService } from '../../shared/services/operation.service';
import { DefaultServiceAuthenticationService } from '../../shared/services/service-authentication.service';
import { IExemptionRepository } from '../../modules/policy-controls/domain/repositories/exemption.repository';
import { CommandResult } from '@core/application/cqrs';

describe('ExemptionExpirationScheduler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should pass configured internalApiKey as authToken when executing expiration tick', async () => {
    const mockHandler = {
      handle: vi.fn().mockResolvedValue(CommandResult.success()),
    } as unknown as ExpireExemptionsHandler;

    const mockPrisma = {
      policyExemption: {
        findMany: vi.fn().mockResolvedValue([
          { workspaceId: 'ws-1' },
          { workspaceId: 'ws-2' },
        ]),
      },
    };

    const scheduler = new ExemptionExpirationScheduler(
      mockHandler,
      mockPrisma as any,
      { internalApiKey: 'test-api-key-999' }
    );

    await scheduler.tick();

    expect(mockPrisma.policyExemption.findMany).toHaveBeenCalledTimes(1);
    expect(mockHandler.handle).toHaveBeenCalledTimes(2);
    expect(mockHandler.handle).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      servicePrincipal: 'cron-worker',
      authToken: 'test-api-key-999',
    });
    expect(mockHandler.handle).toHaveBeenCalledWith({
      workspaceId: 'ws-2',
      servicePrincipal: 'cron-worker',
      authToken: 'test-api-key-999',
    });
  });

  it('should successfully authenticate with OperationService in production mode when INTERNAL_API_KEY is supplied', async () => {
    process.env.NODE_ENV = 'production';
    process.env.INTERNAL_API_KEY = 'prod-cluster-key-456';

    const serviceAuth = new DefaultServiceAuthenticationService();
    const mockWorkspaceAuth = { authorize: vi.fn() } as any;
    const operationService = new OperationService(mockWorkspaceAuth, serviceAuth);

    const mockExemptionRepo: IExemptionRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByWorkspace: vi.fn(),
      findByUser: vi.fn(),
      findActiveForUser: vi.fn(),
      findActiveForUserPolicies: vi.fn(),
      findPendingByWorkspace: vi.fn(),
      countByWorkspace: vi.fn(),
      delete: vi.fn(),
      expireExpiredBatch: vi.fn().mockResolvedValue(0),
    };

    const realHandler = new ExpireExemptionsHandler(mockExemptionRepo, operationService);

    const mockPrisma = {
      policyExemption: {
        findMany: vi.fn().mockResolvedValue([{ workspaceId: '123e4567-e89b-12d3-a456-426614174000' }]),
      },
    };

    const scheduler = new ExemptionExpirationScheduler(
      realHandler,
      mockPrisma as any,
      { internalApiKey: 'prod-cluster-key-456' }
    );

    // Should execute without throwing authorization error
    await expect(scheduler.tick()).resolves.toBeUndefined();
    expect(mockExemptionRepo.expireExpiredBatch).toHaveBeenCalledTimes(1);
  });

  it('should prevent overlapping tick executions', async () => {
    let resolveFirst: () => void;
    const firstCallPromise = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });

    const mockHandler = {
      handle: vi.fn().mockImplementation(async () => {
        await firstCallPromise;
        return CommandResult.success();
      }),
    } as unknown as ExpireExemptionsHandler;

    const mockPrisma = {
      policyExemption: {
        findMany: vi.fn().mockResolvedValue([{ workspaceId: 'ws-1' }]),
      },
    };

    const scheduler = new ExemptionExpirationScheduler(mockHandler, mockPrisma as any);

    // Start first tick (will pause inside handle)
    const tick1 = scheduler.tick();

    // Start second tick while first is still running
    const tick2 = scheduler.tick();

    // Resolve first tick
    resolveFirst!();
    await Promise.all([tick1, tick2]);

    // findMany should only be called once because tick2 bailed out due to isProcessing
    expect(mockPrisma.policyExemption.findMany).toHaveBeenCalledTimes(1);
  });

  it('should properly start and stop timer lifecycle', () => {
    vi.useFakeTimers();

    const mockHandler = { handle: vi.fn() } as any;
    const mockPrisma = { policyExemption: { findMany: vi.fn() } } as any;

    const scheduler = new ExemptionExpirationScheduler(mockHandler, mockPrisma, { intervalMs: 30000 });

    scheduler.start();
    // Subsequent start call should be a no-op
    scheduler.start();

    scheduler.stop();
    // Subsequent stop call should be a no-op
    scheduler.stop();

    vi.useRealTimers();
  });
});
