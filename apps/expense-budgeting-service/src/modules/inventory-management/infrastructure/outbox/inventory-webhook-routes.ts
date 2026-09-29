import type { WebhookRoutes } from '@expense-tracker/outbox-kit';

export function inventoryWebhookRoutes(auditServiceUrl: string): WebhookRoutes {
  const audit = `${auditServiceUrl}/api/v1/event-outbox/events`;
  return {
    'supplier.created': [audit],
    'supplier.updated': [audit],
    'supplier.deactivated': [audit],
    'supplier.activated': [audit],
    'supplier.deleted': [audit],
    'location.created': [audit],
    'location.updated': [audit],
    'location.deactivated': [audit],
    'location.activated': [audit],
    'location.deleted': [audit],
    'stock.created': [audit],
    'stock.level_changed': [audit],
    'stock.low_stock_alert': [audit],
    'stock.updated': [audit],
    'inventory_transaction.recorded': [audit],
    'purchase_order.created': [audit],
    'purchase_order.status_changed': [audit],
    'purchase_order.deleted': [audit],
    'purchase_order.item_added': [audit],
    'purchase_order.item_removed': [audit],
    'purchase_order.item_received': [audit],
  };
}
