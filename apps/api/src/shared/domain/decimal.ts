import { Decimal } from 'decimal.js';

/**
 * Shared Decimal type for the domain layer.
 * This abstracts away the underlying implementation (decimal.js) 
 * and prevents infrastructure leaks (like Prisma's Decimal) into the domain.
 */
export { Decimal };
