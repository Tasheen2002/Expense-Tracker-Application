export enum ReceiptType {
  EXPENSE = 'EXPENSE',
  INVOICE = 'INVOICE',
  BILL = 'BILL',
  TICKET = 'TICKET',
  OTHER = 'OTHER',
}

export function isValidReceiptType(type: string): type is ReceiptType {
  return Object.values(ReceiptType).includes(type as ReceiptType)
}

export function getReceiptTypeLabel(type: ReceiptType): string {
  const labels: Record<ReceiptType, string> = {
    [ReceiptType.EXPENSE]: 'Expense Receipt',
    [ReceiptType.INVOICE]: 'Invoice',
    [ReceiptType.BILL]: 'Bill',
    [ReceiptType.TICKET]: 'Ticket',
    [ReceiptType.OTHER]: 'Other',
  }

  return labels[type]
}

export function getReceiptTypeDescription(type: ReceiptType): string {
  const descriptions: Record<ReceiptType, string> = {
    [ReceiptType.EXPENSE]: 'General expense receipt from merchant',
    [ReceiptType.INVOICE]: 'Invoice document for products or services',
    [ReceiptType.BILL]: 'Utility or service bill',
    [ReceiptType.TICKET]: 'Travel ticket (flight, train, bus, etc.)',
    [ReceiptType.OTHER]: 'Other type of receipt or document',
  }

  return descriptions[type]
}
