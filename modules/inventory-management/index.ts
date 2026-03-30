/**
 * Inventory Management Module
 * 
 * This module handles stock management, purchase orders, suppliers, locations,
 * stock alerts, and pickup reservations for the e-commerce platform.
 * 
 * Following DDD architecture:
 * - application/: Use cases (commands, queries, services)
 * - domain/: Business logic (entities, value objects, repositories)
 * - infrastructure/: Technical implementation (HTTP, persistence)
 * - tests/: Module tests
 */

// Domain Exports
export * from "./domain/entities/purchase-order.entity";
export * from "./domain/entities/purchase-order-item.entity";
export * from "./domain/entities/stock.entity";
export * from "./domain/entities/location.entity";
export * from "./domain/entities/supplier.entity";
export * from "./domain/entities/stock-alert.entity";
export * from "./domain/entities/pickup-reservation.entity";
export * from "./domain/entities/inventory-transaction.entity";

export * from "./domain/value-objects/purchase-order-id.vo";
export * from "./domain/value-objects/supplier-id.vo";
export * from "./domain/value-objects/purchase-order-status.vo";
export * from "./domain/value-objects/alert-type.vo";

export * from "./domain/repositories/purchase-order.repository";
export * from "./domain/repositories/purchase-order-item.repository";
export * from "./domain/repositories/stock.repository";
export * from "./domain/repositories/location.repository";
export * from "./domain/repositories/supplier.repository";

export * from "./domain/errors/inventory.errors";

// Application Exports
export * from "./application/services/purchase-order-management.service";
export * from "./application/services/stock-management.service";
export * from "./application/services/location-management.service";
export * from "./application/services/supplier-management.service";
export * from "./application/services/stock-alert.service";
export * from "./application/services/pickup-reservation.service";

// Infrastructure Exports
export * from "./infrastructure/http/routes/inventory.routes";
export * from "./infrastructure/persistence/purchase-order.repository.impl";
export * from "./infrastructure/persistence/purchase-order-item.repository.impl";
