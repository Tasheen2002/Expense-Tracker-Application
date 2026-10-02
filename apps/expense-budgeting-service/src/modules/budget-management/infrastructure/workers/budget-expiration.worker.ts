import { PrismaClient } from '@prisma/client';
import { BudgetService } from '../../application/services/budget.service';
import { BudgetStatus } from '../../domain/enums/budget-status';

export class BudgetExpirationWorker {
  private timer?: ReturnType<typeof setInterval>;
  private activeRun?: Promise<void>;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly budgets: BudgetService,
    private readonly onError: (error: unknown) => void
  ) {}

  async start(intervalMs = 60_000): Promise<void> {
    if (this.timer) return;
    this.timer = setInterval(() => void this.runOnce(), intervalMs);
    this.timer.unref?.();
    await this.runOnce(true);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.activeRun;
  }

  runOnce(reconcile = false): Promise<void> {
    if (this.activeRun) return this.activeRun;
    const run = this.processWorkspaces(reconcile);
    this.activeRun = run.finally(() => { this.activeRun = undefined; });
    return this.activeRun;
  }

  private async processWorkspaces(reconcile: boolean): Promise<void> {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const workspaces = await this.prisma.budget.findMany({
        where: {
          status: { in: [BudgetStatus.ACTIVE, BudgetStatus.EXCEEDED] },
          ...(reconcile ? {} : { endDate: { lt: today } }),
        },
        distinct: ['workspaceId'],
        select: { workspaceId: true },
      });
      for (const workspace of workspaces) {
        try {
          await this.budgets.processExpiredBudgets(workspace.workspaceId);
        } catch (error) {
          this.onError(error);
        }
        if (reconcile) {
          try {
            await this.budgets.reconcileActiveSpending(workspace.workspaceId);
          } catch (error) {
            this.onError(error);
          }
        }
      }
    } catch (error) {
      this.onError(error);
    }
  }
}
