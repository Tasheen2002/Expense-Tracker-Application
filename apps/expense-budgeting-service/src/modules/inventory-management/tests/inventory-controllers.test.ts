import type { FastifyReply } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { CommandResult } from '@core/application/command-result';
import { SupplierController } from '../infrastructure/http/controllers/supplier.controller';
import { LocationController } from '../infrastructure/http/controllers/location.controller';
import { StockController } from '../infrastructure/http/controllers/stock.controller';
import { PurchaseOrderController } from '../infrastructure/http/controllers/purchase-order.controller';

function response() {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply as unknown as FastifyReply;
}

const command = () => ({ handle: vi.fn().mockResolvedValue(CommandResult.success({})) });
const query = () => ({ handle: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 10, offset: 0, hasMore: false }) });

describe('inventory controllers', () => {
  it('uses supplier route IDs even if a body contains conflicting IDs', async () => {
    const create = command();
    const update = command();
    const controller = new SupplierController(create as never, update as never, command() as never, query() as never, query() as never);
    const reply = response();

    await controller.createSupplier({
      params: { workspaceId: 'route-workspace' },
      body: { name: 'Acme', workspaceId: 'body-workspace' },
    } as never, reply);
    await controller.updateSupplier({
      params: { workspaceId: 'route-workspace', supplierId: 'route-supplier' },
      body: { name: 'Acme II', workspaceId: 'body-workspace', supplierId: 'body-supplier' },
    } as never, reply);

    expect(create.handle).toHaveBeenCalledWith({
      workspaceId: 'route-workspace', name: 'Acme',
      contactEmail: undefined, contactPhone: undefined, address: undefined,
    });
    expect(update.handle).toHaveBeenCalledWith({
      workspaceId: 'route-workspace', supplierId: 'route-supplier', name: 'Acme II',
      contactEmail: undefined, contactPhone: undefined, address: undefined,
    });
    expect(reply.status).toHaveBeenCalledWith(201);
  });

  it('forwards location IDs and preserves a null address on update', async () => {
    const update = command();
    const controller = new LocationController(command() as never, update as never, command() as never, query() as never, query() as never);

    await controller.updateLocation({
      params: { workspaceId: 'workspace', locationId: 'location' },
      body: { address: null },
    } as never, response());

    expect(update.handle).toHaveBeenCalledWith({
      workspaceId: 'workspace', locationId: 'location',
      name: undefined, type: undefined, address: null,
    });
  });

  it('takes the stock actor from authentication and passes both transaction filters', async () => {
    const adjust = command();
    const list = query();
    const controller = new StockController(adjust as never, command() as never, query() as never, list as never);

    await controller.adjustStock({
      user: { userId: 'authenticated-user' },
      params: { workspaceId: 'route-workspace' },
      body: {
        workspaceId: 'body-workspace', createdBy: 'body-user',
        variantId: 'widget', locationId: 'location', quantity: 2, type: 'IN',
      },
    } as never, response());
    await controller.listTransactions({
      params: { workspaceId: 'route-workspace' },
      query: { variantId: 'widget', locationId: 'location', limit: 10, offset: 0 },
    } as never, response());

    expect(adjust.handle).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'route-workspace', createdBy: 'authenticated-user',
    }));
    expect(list.handle).toHaveBeenCalledWith({
      workspaceId: 'route-workspace', variantId: 'widget', locationId: 'location', limit: 10, offset: 0,
    });
  });

  it('uses purchase-order route IDs and the authenticated receiver', async () => {
    const add = command();
    const receive = command();
    const controller = new PurchaseOrderController(
      command() as never, command() as never, command() as never,
      command() as never, command() as never, receive as never,
      command() as never, add as never, command() as never,
      query() as never, query() as never
    );

    await controller.addItem({
      params: { workspaceId: 'route-workspace', purchaseOrderId: 'route-order' },
      body: {
        workspaceId: 'body-workspace', purchaseOrderId: 'body-order',
        variantId: 'widget', variantName: 'Widget', quantity: 1, unitPrice: 1,
      },
    } as never, response());
    await controller.receivePurchaseOrder({
      user: { userId: 'authenticated-user' },
      params: { workspaceId: 'route-workspace', purchaseOrderId: 'route-order' },
      body: { locationId: 'location', receivedBy: 'body-user' },
    } as never, response());

    expect(add.handle).toHaveBeenCalledWith({
      workspaceId: 'route-workspace', purchaseOrderId: 'route-order',
      variantId: 'widget', variantName: 'Widget', quantity: 1, unitPrice: 1,
    });
    expect(receive.handle).toHaveBeenCalledWith({
      workspaceId: 'route-workspace', purchaseOrderId: 'route-order',
      locationId: 'location', receivedBy: 'authenticated-user',
    });
  });
});
