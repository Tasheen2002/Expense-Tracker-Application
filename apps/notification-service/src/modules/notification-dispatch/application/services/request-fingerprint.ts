import { createHash } from 'node:crypto';

export function requestFingerprint(value: unknown): string {
  const canonical = JSON.stringify(value, (_key, item: unknown) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
    }
    return item;
  });
  return createHash('sha256').update(canonical).digest('hex');
}
