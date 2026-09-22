import { createRequire } from 'module';
import type { PrismaClient as IPrismaClient, Prisma as IPrisma } from '@prisma/client';

const require = createRequire(import.meta.url);
const clientModule = require('.prisma/client-identity');

export const PrismaClient: typeof IPrismaClient = clientModule.PrismaClient;
export type PrismaClient = IPrismaClient;

export const Prisma: typeof IPrisma = clientModule.Prisma;

export const PrismaClientKnownRequestError: typeof IPrisma.PrismaClientKnownRequestError = clientModule.PrismaClientKnownRequestError;
export type PrismaClientKnownRequestError = IPrisma.PrismaClientKnownRequestError;

export const PrismaClientValidationError: typeof IPrisma.PrismaClientValidationError = clientModule.PrismaClientValidationError;
export type PrismaClientValidationError = IPrisma.PrismaClientValidationError;

export const Decimal: typeof IPrisma.Decimal = clientModule.Decimal;
export type Decimal = IPrisma.Decimal;

export const OutboxEventStatus: typeof import('@prisma/client').OutboxEventStatus = clientModule.OutboxEventStatus;
export type OutboxEventStatus = (typeof clientModule.OutboxEventStatus)[keyof typeof clientModule.OutboxEventStatus];
