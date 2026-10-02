import { EmailDeliveryService } from '../modules/notification-dispatch/application/services/email-delivery.service';

export class EmailDeliveryWorker {
  private timer?: ReturnType<typeof setInterval>;
  private active?: Promise<void>;
  constructor(private readonly service: EmailDeliveryService,
    private readonly onError: (error: unknown) => void = () => {}, private readonly intervalMs = 5000) {}

  start(): void {
    if (this.timer) return;
    const tick = () => {
      if (this.active) return;
      this.active = this.service.runBatch().catch(this.onError).finally(() => { this.active = undefined; });
    };
    this.timer = setInterval(tick, this.intervalMs); this.timer.unref(); tick();
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.active;
  }
}
