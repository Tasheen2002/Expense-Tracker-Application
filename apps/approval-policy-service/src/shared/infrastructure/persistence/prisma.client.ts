import { createRequire } from 'module';
import type { PrismaClient as IPrismaClient, Prisma as IPrisma } from '@prisma/client';

const require = createRequire(import.meta.url);
const clientModule = require('.prisma/client-approval');

export const PrismaClient: typeof IPrismaClient = clientModule.PrismaClient;
export type PrismaClient = IPrismaClient;

export const Prisma: typeof IPrisma = clientModule.Prisma;

export const PrismaClientKnownRequestError: typeof IPrisma.PrismaClientKnownRequestError = clientModule.PrismaClientKnownRequestError;
export type PrismaClientKnownRequestError = IPrisma.PrismaClientKnownRequestError;

export const PrismaClientValidationError: typeof IPrisma.PrismaClientValidationError = clientModule.PrismaClientValidationError;
export type PrismaClientValidationError = IPrisma.PrismaClientValidationError;

export const Decimal: typeof IPrisma.Decimal = clientModule.Decimal;
export type Decimal = IPrisma.Decimal;

export const WorkflowStatus: typeof import('@prisma/client').WorkflowStatus = clientModule.WorkflowStatus;
export type WorkflowStatus = (typeof clientModule.WorkflowStatus)[keyof typeof clientModule.WorkflowStatus];

export const ApprovalStatus: typeof import('@prisma/client').ApprovalStatus = clientModule.ApprovalStatus;
export type ApprovalStatus = (typeof clientModule.ApprovalStatus)[keyof typeof clientModule.ApprovalStatus];

export const PolicyType: typeof import('@prisma/client').PolicyType = clientModule.PolicyType;
export type PolicyType = (typeof clientModule.PolicyType)[keyof typeof clientModule.PolicyType];

export const ViolationSeverity: typeof import('@prisma/client').ViolationSeverity = clientModule.ViolationSeverity;
export type ViolationSeverity = (typeof clientModule.ViolationSeverity)[keyof typeof clientModule.ViolationSeverity];

export const ViolationStatus: typeof import('@prisma/client').ViolationStatus = clientModule.ViolationStatus;
export type ViolationStatus = (typeof clientModule.ViolationStatus)[keyof typeof clientModule.ViolationStatus];

export const ExemptionStatus: typeof import('@prisma/client').ExemptionStatus = clientModule.ExemptionStatus;
export type ExemptionStatus = (typeof clientModule.ExemptionStatus)[keyof typeof clientModule.ExemptionStatus];

export const OutboxEventStatus: typeof import('@prisma/client').OutboxEventStatus = clientModule.OutboxEventStatus;
export type OutboxEventStatus = (typeof clientModule.OutboxEventStatus)[keyof typeof clientModule.OutboxEventStatus];
