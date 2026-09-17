import { ISessionRepository } from '../modules/identity-workspace/domain/repositories/session.repository';
import { IWorkspaceInvitationRepository } from '../modules/identity-workspace/domain/repositories/workspace-invitation.repository';
import { PrismaOutboxEventRepository } from '../outbox/prisma-outbox.repository';

export interface CleanupSchedulerLogger {
  info: (msg: string) => void;
  error: (msg: string) => void;
}

export interface CleanupSchedulerOptions {
  readonly intervalMs?: number;
  readonly initialDelayMs?: number;
  readonly outboxRetentionDays?: number;
  readonly logger?: CleanupSchedulerLogger;
}

/**
 * Background scheduler that periodically cleans up expired sessions, expired invitations,
 * and pruned outbox events in identity-access-service.
 */
export class CleanupScheduler {
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isProcessing = false;
  private readonly intervalMs: number;
  private readonly initialDelayMs: number;
  private readonly outboxRetentionDays: number;
  private readonly logger: CleanupSchedulerLogger;

  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly invitationRepo: IWorkspaceInvitationRepository,
    private readonly outboxRepo: PrismaOutboxEventRepository,
    options?: CleanupSchedulerOptions
  ) {
    this.intervalMs =
      options?.intervalMs ??
      parseInt(process.env.CLEANUP_INTERVAL_MS || String(60 * 60 * 1000), 10);
    this.initialDelayMs = options?.initialDelayMs ?? 10_000;
    this.outboxRetentionDays =
      options?.outboxRetentionDays ??
      parseInt(process.env.OUTBOX_RETENTION_DAYS || '7', 10);
    this.logger = options?.logger ?? console;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run first iteration after initial startup delay
    this.initialTimer = setTimeout(() => {
      void this.tick();
    }, this.initialDelayMs);
    if (this.initialTimer && typeof this.initialTimer.unref === 'function') {
      this.initialTimer.unref();
    }

    // Schedule regular interval thereafter
    this.intervalTimer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    if (this.intervalTimer && typeof this.intervalTimer.unref === 'function') {
      this.intervalTimer.unref();
    }
  }

  private activeProcessingPromise: Promise<void> | null = null;

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.initialTimer) {
      clearTimeout(this.initialTimer);
      this.initialTimer = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.activeProcessingPromise) {
      this.logger.info('[Identity-Access-Service] Awaiting active cleanup before shutdown...');
      await this.activeProcessingPromise;
    }
  }

  async tick(): Promise<void> {
    if (!this.isRunning || this.isProcessing) return;
    this.isProcessing = true;

    this.activeProcessingPromise = (async () => {
      try {
        const deletedSessions = await this.sessionRepo.deleteExpired();
        const deletedInvitations = await this.invitationRepo.deleteExpired();
        const deletedOutbox = await this.outboxRepo.deleteProcessedBefore(this.outboxRetentionDays);

        if (deletedSessions > 0 || deletedInvitations > 0 || deletedOutbox > 0) {
          this.logger.info(
            `[Identity-Access-Service] Scheduled cleanup: pruned ${deletedSessions} sessions, ${deletedInvitations} invitations, ${deletedOutbox} outbox events.`
          );
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`[Identity-Access-Service] Scheduled cleanup failed: ${errMsg}`);
      } finally {
        this.isProcessing = false;
        this.activeProcessingPromise = null;
      }
    })();

    await this.activeProcessingPromise;
  }
}
