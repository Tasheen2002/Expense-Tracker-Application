export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  // Reserved for a future two-location transfer; single-location transactions reject it.
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}
