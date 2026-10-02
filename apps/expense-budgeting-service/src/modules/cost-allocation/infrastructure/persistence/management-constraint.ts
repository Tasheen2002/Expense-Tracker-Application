import { Prisma } from '@prisma/client';

/** Only the workspace/code unique key maps to a duplicate-code domain error. */
export function isWorkspaceCodeConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;
  if (!Array.isArray(target)) return false;
  const fields = target.map((field) => String(field).toLowerCase());
  return fields.includes('code') && fields.some((field) => field === 'workspaceid' || field === 'workspace_id');
}
