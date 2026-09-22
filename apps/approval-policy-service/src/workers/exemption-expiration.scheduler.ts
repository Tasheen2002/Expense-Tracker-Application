import { PrismaClient } from '../shared/infrastructure/persistence/prisma.client';
import { ExpireExemptionsHandler } from '../modules/policy-controls/application/commands/expire-exemptions.command';

export interface ExemptionExpirationSchedulerOptions {
  readonly intervalMs?: number;
  readonly internalApiKey?: string;
}

/**
 * Background scheduler that periodically processes and transitions expired policy exemptions
 * across active workspaces in production. Uses a verified service principal ('cron-worker').
 */
export class ExemptionExpirationScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isProcessing = false;
  private readonly intervalMs: number;
  private readonly internalApiKey?: string;

  constructor(
    private readonly expireExemptionsHandler: ExpireExemptionsHandler,
    private readonly prisma: PrismaClient,
    options?: ExemptionExpirationSchedulerOptions
  ) {
    this.intervalMs =
      options?.intervalMs ??
      parseInt(process.env.EXEMPTION_EXPIRATION_INTERVAL_MS || '60000', 10);
    this.internalApiKey =
      options?.internalApiKey ?? process.env.INTERNAL_API_KEY;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run first iteration after a brief startup delay (10 seconds)
    this.timer = setTimeout(() => {
      void this.tick();
    }, 10000);
    this.timer.unref();
  }

  private activeProcessingPromise: Promise<void> | null = null;

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.activeProcessingPromise) {
      console.log('[ExemptionExpirationScheduler] Awaiting active expiration batch before shutdown...');
      await this.activeProcessingPromise;
    }
  }

  async tick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    this.activeProcessingPromise = (async () => {
      try {
        const distinctWorkspaces = await this.prisma.policyExemption.findMany({
          where: {
            status: 'APPROVED',
            validUntil: { lt: new Date() },
          },
          select: { workspaceId: true },
          distinct: ['workspaceId'],
          take: 50,
        });

        for (const { workspaceId } of distinctWorkspaces) {
          try {
            await this.expireExemptionsHandler.handle({
              workspaceId,
              servicePrincipal: 'cron-worker',
              authToken: this.internalApiKey,
            });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(
              `[ExemptionExpirationScheduler] Error expiring exemptions for workspace ${workspaceId}: ${message}`
            );
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `[ExemptionExpirationScheduler] Error in expiration tick: ${message}`
        );
      } finally {
        this.isProcessing = false;
        this.activeProcessingPromise = null;
        if (this.isRunning) {
          this.timer = setTimeout(() => {
            this.tick();
          }, this.intervalMs);
          this.timer.unref();
        }
      }
    })();

    await this.activeProcessingPromise;
  }
}
