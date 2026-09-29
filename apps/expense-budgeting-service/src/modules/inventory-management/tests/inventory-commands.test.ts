import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { RemovePurchaseOrderItemHandler } from '../application/commands/remove-purchase-order-item.command';
import { UpdateStockSettingsHandler } from '../application/commands/update-stock-settings.command';
import type { PurchaseOrderService } from '../application/services/purchase-order.service';
import type { StockService } from '../application/services/stock.service';

describe('inventory command boundaries', () => {
  it('passes the route purchase-order ID when removing an item', async () => {
    const service = { removeItem: vi.fn().mockResolvedValue(undefined) } as unknown as PurchaseOrderService;
    const command = {
      itemId: randomUUID(), purchaseOrderId: randomUUID(), workspaceId: randomUUID(),
    };

    const result = await new RemovePurchaseOrderItemHandler(service).handle(command);

    expect(service.removeItem).toHaveBeenCalledWith(
      command.itemId, command.purchaseOrderId, command.workspaceId
    );
    expect(result.success).toBe(true);
  });

  it('forwards both reorder settings and returns the updated stock', async () => {
    const stock = { stockId: randomUUID(), reorderLevel: 5, reorderQuantity: 20 };
    const service = { updateStockSettings: vi.fn().mockResolvedValue(stock) } as unknown as StockService;
    const command = {
      stockId: stock.stockId, workspaceId: randomUUID(),
      reorderLevel: 5, reorderQuantity: 20,
    };

    const result = await new UpdateStockSettingsHandler(service).handle(command);

    expect(service.updateStockSettings).toHaveBeenCalledWith(
      command.stockId, command.workspaceId,
      { reorderLevel: 5, reorderQuantity: 20 }
    );
    expect(result.data).toBe(stock);
  });
});
