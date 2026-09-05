export enum ReceiptStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export function isValidReceiptStatus(status: string): status is ReceiptStatus {
  return Object.values(ReceiptStatus).includes(status as ReceiptStatus)
}

export function canTransitionTo(from: ReceiptStatus, to: ReceiptStatus): boolean {
  const transitions: Record<ReceiptStatus, ReceiptStatus[]> = {
    [ReceiptStatus.PENDING]: [
      ReceiptStatus.PROCESSING,
      ReceiptStatus.REJECTED,
    ],
    [ReceiptStatus.PROCESSING]: [
      ReceiptStatus.PROCESSED,
      ReceiptStatus.FAILED,
      ReceiptStatus.REJECTED,
    ],
    [ReceiptStatus.PROCESSED]: [
      ReceiptStatus.VERIFIED,
      ReceiptStatus.REJECTED,
      ReceiptStatus.PROCESSING, // Reprocess
    ],
    [ReceiptStatus.FAILED]: [
      ReceiptStatus.PROCESSING, // Retry
      ReceiptStatus.REJECTED,
    ],
    [ReceiptStatus.VERIFIED]: [
      ReceiptStatus.REJECTED,
    ],
    [ReceiptStatus.REJECTED]: [],
  }

  return transitions[from]?.includes(to) ?? false
}

export function getStatusLabel(status: ReceiptStatus): string {
  const labels: Record<ReceiptStatus, string> = {
    [ReceiptStatus.PENDING]: 'Pending',
    [ReceiptStatus.PROCESSING]: 'Processing',
    [ReceiptStatus.PROCESSED]: 'Processed',
    [ReceiptStatus.FAILED]: 'Failed',
    [ReceiptStatus.VERIFIED]: 'Verified',
    [ReceiptStatus.REJECTED]: 'Rejected',
  }

  return labels[status]
}
