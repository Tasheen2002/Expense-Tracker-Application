import { describe, it, expect } from 'vitest';
import { PurchaseOrder } from '../domain/entities/purchase-order.entity';
import { PurchaseOrderStatus } from '../domain/enums/purchase-order-status';
import {
  InvalidPurchaseOrderStatusError,
  PurchaseOrderCannotBeEditedError,
  InvalidInventoryDataError,
} from '../domain/errors/inventory.errors';

describe('PurchaseOrder Entity', () => {
  const validData = {
    workspaceId: 'workspace-123',
    supplierId: 'supplier-123',
    orderDate: new Date('2024-01-15'),
    expectedDate: new Date('2024-02-15'),
    notes: 'Test order',
    createdBy: 'user-123',
  };

  describe('create', () => {
    it('should create a valid purchase order', () => {
      const po = PurchaseOrder.create(validData);
      expect(po).toBeDefined();
      expect(po.id).toBeDefined();
      expect(po.status).toBe(PurchaseOrderStatus.DRAFT);
      expect(po.supplierId).toBe('supplier-123');
      expect(po.currency).toBe('USD');
      expect(po.totalAmount.toNumber()).toBe(0);
    });

    it('should add PurchaseOrderCreatedEvent on create', () => {
      const po = PurchaseOrder.create(validData);
      expect(po.domainEvents).toHaveLength(1);
      expect(po.domainEvents[0].eventType).toBe('purchase_order.created');
    });

    it('should throw error without supplier ID', () => {
      expect(() => {
        PurchaseOrder.create({ ...validData, supplierId: '' });
      }).toThrow(InvalidInventoryDataError);
    });
  });

  describe('status transitions', () => {
    it('should transition DRAFT -> SUBMITTED', () => {
      const po = PurchaseOrder.create(validData);
      po.submit();
      expect(po.status).toBe(PurchaseOrderStatus.SUBMITTED);
      expect(po.isSubmitted()).toBe(true);
    });

    it('should transition SUBMITTED -> APPROVED', () => {
      const po = PurchaseOrder.create(validData);
      po.submit();
      po.approve();
      expect(po.status).toBe(PurchaseOrderStatus.APPROVED);
    });

    it('should transition APPROVED -> RECEIVED', () => {
      const po = PurchaseOrder.create(validData);
      po.submit();
      po.approve();
      po.receive();
      expect(po.status).toBe(PurchaseOrderStatus.RECEIVED);
      expect(po.receivedDate).toBeDefined();
    });

    it('should transition DRAFT -> CANCELLED', () => {
      const po = PurchaseOrder.create(validData);
      po.cancel();
      expect(po.status).toBe(PurchaseOrderStatus.CANCELLED);
    });

    it('should throw on invalid transition DRAFT -> APPROVED', () => {
      const po = PurchaseOrder.create(validData);
      expect(() => {
        po.approve();
      }).toThrow(InvalidPurchaseOrderStatusError);
    });

    it('should throw on invalid transition RECEIVED -> SUBMITTED', () => {
      const po = PurchaseOrder.create(validData);
      po.submit();
      po.approve();
      po.receive();
      expect(() => {
        po.submit();
      }).toThrow(InvalidPurchaseOrderStatusError);
    });

    it('should add status change event on each transition', () => {
      const po = PurchaseOrder.create(validData);
      po.clearDomainEvents(); // clear the created event
      po.submit();
      expect(po.domainEvents).toHaveLength(1);
      expect(po.domainEvents[0].eventType).toBe('purchase_order.status_changed');
    });
  });

  describe('editing restrictions', () => {
    it('should allow updates when DRAFT', () => {
      const po = PurchaseOrder.create(validData);
      po.updateNotes('Updated notes');
      expect(po.notes).toBe('Updated notes');
    });

    it('should throw when editing non-DRAFT order', () => {
      const po = PurchaseOrder.create(validData);
      po.submit();
      expect(() => {
        po.updateNotes('Cannot update');
      }).toThrow(PurchaseOrderCannotBeEditedError);
    });
  });

  describe('toDTO', () => {
    it('should convert to DTO correctly', () => {
      const po = PurchaseOrder.create(validData);
      const dto = PurchaseOrder.toDTO(po);
      expect(dto.purchaseOrderId).toBe(po.id.getValue());
      expect(dto.status).toBe(PurchaseOrderStatus.DRAFT);
      expect(dto.supplierId).toBe('supplier-123');
      expect(dto.totalAmount).toBe('0');
      expect(dto.currency).toBe('USD');
    });
  });
});
