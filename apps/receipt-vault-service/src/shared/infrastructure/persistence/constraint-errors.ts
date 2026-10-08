import { Prisma } from '@prisma/client';

export function isUniqueConstraint(error: unknown, field: string, constraint?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes(field) : typeof target === 'string' && target === constraint;
}
