import { InvalidNotificationDataError } from '../errors/notification.errors';

export function validateText(field: string, value: string, maximum: number): void {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximum) {
    throw new InvalidNotificationDataError(field, `must be nonblank and at most ${maximum} characters`);
  }
}

export function validateEnum(field: string, value: string, values: readonly string[]): void {
  if (!values.includes(value)) throw new InvalidNotificationDataError(field, 'unsupported value');
}

export function copyDate(value: Date): Date {
  return new Date(value.getTime());
}
