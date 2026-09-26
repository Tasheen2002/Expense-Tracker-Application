export enum RecurrenceStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
}

export function isValidRecurrenceStatus(value: string): value is RecurrenceStatus {
  return Object.values(RecurrenceStatus).includes(value as RecurrenceStatus);
}

