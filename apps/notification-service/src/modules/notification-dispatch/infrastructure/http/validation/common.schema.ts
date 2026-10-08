import { z } from 'zod';

// Match the UUID versions and variant supported by the domain ID abstraction.
export const domainIdSchema = z.string().uuid().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  'Unsupported ID format',
).transform(value => value.toLowerCase());

// Preserve template whitespace, while rejecting text containing only whitespace.
export function nonblankText(minimum: number, maximum: number) {
  return z.string().min(minimum).max(maximum).regex(/\S/, 'Text must not be blank');
}

export function paginationInteger(minimum: number, maximum: number, fallback: number) {
  return z.union([z.string().regex(/^\d+$/), z.number().int()])
    .pipe(z.coerce.number().int().min(minimum).max(maximum)).default(fallback);
}
