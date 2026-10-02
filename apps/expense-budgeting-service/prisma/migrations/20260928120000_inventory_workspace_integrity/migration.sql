-- Tenant-scoped foreign keys prevent rows from pointing at another workspace's supplier or location.
-- Existing inconsistent rows must be repaired before this migration can succeed.
CREATE UNIQUE INDEX "supplier_id_workspace_id_key"
  ON "inventory_management"."supplier" ("id", "workspace_id");
CREATE UNIQUE INDEX "location_id_workspace_id_key"
  ON "inventory_management"."location" ("id", "workspace_id");

ALTER TABLE "inventory_management"."purchase_order"
  DROP CONSTRAINT "purchase_order_supplier_id_fkey",
  ADD CONSTRAINT "purchase_order_supplier_id_workspace_id_fkey"
    FOREIGN KEY ("supplier_id", "workspace_id")
    REFERENCES "inventory_management"."supplier" ("id", "workspace_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_management"."stock"
  DROP CONSTRAINT "stock_location_id_fkey",
  ADD CONSTRAINT "stock_location_id_workspace_id_fkey"
    FOREIGN KEY ("location_id", "workspace_id")
    REFERENCES "inventory_management"."location" ("id", "workspace_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_management"."inventory_transaction"
  DROP CONSTRAINT "inventory_transaction_location_id_fkey",
  ADD CONSTRAINT "inventory_transaction_location_id_workspace_id_fkey"
    FOREIGN KEY ("location_id", "workspace_id")
    REFERENCES "inventory_management"."location" ("id", "workspace_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_management"."supplier"
  ADD CONSTRAINT "supplier_name_nonblank" CHECK (length(btrim("name")) > 0);
ALTER TABLE "inventory_management"."location"
  ADD CONSTRAINT "location_name_nonblank" CHECK (length(btrim("name")) > 0);
ALTER TABLE "inventory_management"."purchase_order"
  ADD CONSTRAINT "purchase_order_amount_nonnegative" CHECK ("total_amount" >= 0),
  ADD CONSTRAINT "purchase_order_expected_date_order" CHECK ("expected_date" IS NULL OR "expected_date" >= "order_date");
ALTER TABLE "inventory_management"."purchase_order_item"
  ADD CONSTRAINT "purchase_order_item_quantity_range" CHECK ("quantity" BETWEEN 1 AND 999999),
  ADD CONSTRAINT "purchase_order_item_received_range" CHECK ("received_quantity" BETWEEN 0 AND "quantity"),
  ADD CONSTRAINT "purchase_order_item_unit_price_range" CHECK ("unit_price" >= 0 AND "unit_price" <= 9999999999.99),
  ADD CONSTRAINT "purchase_order_item_variant_nonblank" CHECK (length(btrim("variant_id")) > 0);
ALTER TABLE "inventory_management"."stock"
  ADD CONSTRAINT "stock_quantity_range" CHECK ("quantity" BETWEEN 0 AND 999999),
  ADD CONSTRAINT "stock_reserved_range" CHECK ("reserved_quantity" BETWEEN 0 AND "quantity"),
  ADD CONSTRAINT "stock_reorder_level_range" CHECK ("reorder_level" BETWEEN 0 AND 999999),
  ADD CONSTRAINT "stock_reorder_quantity_range" CHECK ("reorder_quantity" BETWEEN 0 AND 999999),
  ADD CONSTRAINT "stock_variant_nonblank" CHECK (length(btrim("variant_id")) > 0);
ALTER TABLE "inventory_management"."inventory_transaction"
  ADD CONSTRAINT "inventory_transaction_quantity_range" CHECK (
    "quantity" BETWEEN 0 AND 999999 AND ("type" = 'ADJUSTMENT' OR "quantity" > 0)
  ),
  ADD CONSTRAINT "inventory_transaction_variant_nonblank" CHECK (length(btrim("variant_id")) > 0);
