import { describe, it, expect } from 'vitest';
import { Stock } from '../domain/entities/stock.entity';
import {
  InsufficientStockError,
  InvalidQuantityError,
} from '../domain/errors/inventory.errors';

describe('Stock Entity', () => {
  const validData = {
    workspaceId: 'workspace-123',
    variantId: 'variant-123',
    locationId: 'location-123',
  };

  describe('create', () => {
    it('should create stock with defaults', () => {
      const stock = Stock.create(validData);
      expect(stock).toBeDefined();
      expect(stock.quantity).toBe(0);
      expect(stock.reservedQuantity).toBe(0);
      expect(stock.reorderLevel).toBe(0);
      expect(stock.reorderQuantity).toBe(0);
    });

    it('should create stock with initial quantity', () => {
      const stock = Stock.create({ ...validData, quantity: 100 });
      expect(stock.quantity).toBe(100);
    });
  });

  describe('addQuantity', () => {
    it('should add quantity', () => {
      const stock = Stock.create({ ...validData, quantity: 10 });
      stock.addQuantity(5);
      expect(stock.quantity).toBe(15);
    });

    it('should throw for zero or negative amount', () => {
      const stock = Stock.create(validData);
      expect(() => stock.addQuantity(0)).toThrow(InvalidQuantityError);
      expect(() => stock.addQuantity(-5)).toThrow(InvalidQuantityError);
    });
  });

  describe('removeQuantity', () => {
    it('should remove quantity', () => {
      const stock = Stock.create({ ...validData, quantity: 10 });
      stock.removeQuantity(5);
      expect(stock.quantity).toBe(5);
    });

    it('should throw for insufficient stock', () => {
      const stock = Stock.create({ ...validData, quantity: 5 });
      expect(() => stock.removeQuantity(10)).toThrow(InsufficientStockError);
    });

    it('should consider reserved quantity when checking availability', () => {
      const stock = Stock.create({ ...validData, quantity: 10 });
      stock.reserve(5);
      // Available = 10 - 5 = 5, trying to remove 6 should fail
      expect(() => stock.removeQuantity(6)).toThrow(InsufficientStockError);
    });
  });

  describe('reserve', () => {
    it('should reserve quantity', () => {
      const stock = Stock.create({ ...validData, quantity: 10 });
      stock.reserve(3);
      expect(stock.reservedQuantity).toBe(3);
      expect(stock.getAvailableQuantity()).toBe(7);
    });

    it('should throw for insufficient available quantity', () => {
      const stock = Stock.create({ ...validData, quantity: 5 });
      expect(() => stock.reserve(10)).toThrow(InsufficientStockError);
    });
  });

  describe('releaseReservation', () => {
    it('should release reserved quantity', () => {
      const stock = Stock.create({ ...validData, quantity: 10 });
      stock.reserve(5);
      stock.releaseReservation(3);
      expect(stock.reservedQuantity).toBe(2);
    });

    it('should not go below zero', () => {
      const stock = Stock.create({ ...validData, quantity: 10 });
      stock.reserve(3);
      stock.releaseReservation(10); // releasing more than reserved
      expect(stock.reservedQuantity).toBe(0);
    });
  });

  describe('adjustQuantity', () => {
    it('should set quantity to new value', () => {
      const stock = Stock.create({ ...validData, quantity: 10 });
      stock.adjustQuantity(50);
      expect(stock.quantity).toBe(50);
    });

    it('should throw for negative quantity', () => {
      const stock = Stock.create(validData);
      expect(() => stock.adjustQuantity(-1)).toThrow(InvalidQuantityError);
    });
  });

  describe('isLowStock', () => {
    it('should return true when quantity <= reorder level', () => {
      const stock = Stock.create({
        ...validData,
        quantity: 5,
        reorderLevel: 10,
      });
      expect(stock.isLowStock()).toBe(true);
    });

    it('should return false when quantity > reorder level', () => {
      const stock = Stock.create({
        ...validData,
        quantity: 20,
        reorderLevel: 10,
      });
      expect(stock.isLowStock()).toBe(false);
    });

    it('should return false when reorder level is 0', () => {
      const stock = Stock.create({
        ...validData,
        quantity: 0,
        reorderLevel: 0,
      });
      expect(stock.isLowStock()).toBe(false);
    });
  });

  describe('toDTO', () => {
    it('should convert to DTO correctly', () => {
      const stock = Stock.create({
        ...validData,
        quantity: 100,
        reorderLevel: 10,
      });
      stock.reserve(20);
      const dto = Stock.toDTO(stock);
      expect(dto.stockId).toBe(stock.id.getValue());
      expect(dto.quantity).toBe(100);
      expect(dto.reservedQuantity).toBe(20);
      expect(dto.availableQuantity).toBe(80);
      expect(dto.isLowStock).toBe(false);
    });
  });
});
