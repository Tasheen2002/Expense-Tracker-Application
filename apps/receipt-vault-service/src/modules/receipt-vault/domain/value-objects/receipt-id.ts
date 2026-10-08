import { randomUUID } from "crypto";
import { UuidId } from '@core/domain/value-objects/uuid-id.base';

export class ReceiptId extends UuidId {
  private constructor(value: string) {
    super(value, "ReceiptId");
    Object.freeze(this);
  }

  static create(): ReceiptId {
    return new ReceiptId(randomUUID());
  }

  static fromString(id: string): ReceiptId {
    return new ReceiptId(id);
  }
}
