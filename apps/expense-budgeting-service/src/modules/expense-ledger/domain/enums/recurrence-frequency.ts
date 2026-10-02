export enum RecurrenceFrequency {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export function isValidRecurrenceFrequency(value: string): value is RecurrenceFrequency {
  return Object.values(RecurrenceFrequency).includes(value as RecurrenceFrequency);
}

