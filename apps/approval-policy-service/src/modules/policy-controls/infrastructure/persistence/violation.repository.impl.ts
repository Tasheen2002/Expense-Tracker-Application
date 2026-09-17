import { PrismaClient } from '@shared/infrastructure/persistence/prisma.client';
import type { Prisma } from '@prisma/client';
import {
  IViolationRepository,
  ViolationFilters,
  ViolationStats,
} from '../../domain/repositories/violation.repository';
import { PolicyViolation } from '../../domain/entities/policy-violation.entity';
import { ViolationId, PolicyId, ExemptionId } from '../../domain/value-objects';
import { WorkspaceId, UserId, ExpenseId } from '@core/domain/value-objects';
import { ViolationStatus } from '../../domain/enums/violation-status.enum';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { PrismaRepositoryHelper } from '@shared/infrastructure/persistence/prisma-repository.helper';
import { PrismaRepository } from '@shared/infrastructure/persistence/prisma-repository.base';
import { ViolationAlreadyResolvedError } from '../../domain/errors/policy-controls.errors';
import { IEventBus } from '@core/domain/events/domain-event';

export class PrismaViolationRepository
  extends PrismaRepository<PolicyViolation>
  implements IViolationRepository
{
  constructor(prisma: PrismaClient, eventBus: IEventBus) {
    super(prisma, eventBus);
  }

  async save(violation: PolicyViolation): Promise<void> {
    const isOverridden = violation.status === ViolationStatus.OVERRIDDEN;
    const isResolvedTransition = [
      ViolationStatus.RESOLVED,
      ViolationStatus.EXEMPTED,
      ViolationStatus.OVERRIDDEN,
    ].includes(violation.status);

    await this.prisma.$transaction(async (tx) => {
      if (isResolvedTransition) {
        const updateResult = await tx.policyViolation.updateMany({
          where: {
            id: violation.id.getValue(),
            status: { in: [ViolationStatus.PENDING, ViolationStatus.ACKNOWLEDGED] },
          },
          data: {
            status: violation.status,
            ...(violation.exemptionId && { exemptionId: violation.exemptionId.getValue() }),
            ...(violation.acknowledgedAt && { acknowledgedAt: violation.acknowledgedAt }),
            ...(violation.acknowledgedBy && { acknowledgedBy: violation.acknowledgedBy.getValue() }),
            ...(violation.resolvedAt && { resolvedAt: violation.resolvedAt }),
            ...(violation.resolvedBy && { resolvedBy: violation.resolvedBy.getValue() }),
            resolutionNote: violation.resolutionNotes ?? null,
            ...(isOverridden && violation.resolvedBy && { overriddenBy: violation.resolvedBy.getValue() }),
            ...(isOverridden && violation.resolutionNotes && { overrideReason: violation.resolutionNotes }),
            updatedAt: violation.updatedAt,
          },
        });

        if (updateResult.count === 0) {
          throw new ViolationAlreadyResolvedError(violation.id.getValue());
        }
      } else {
        const existing = await tx.policyViolation.findUnique({
          where: { id: violation.id.getValue() },
          select: { id: true, status: true },
        });

        if (!existing) {
          await tx.policyViolation.create({
            data: {
              id: violation.id.getValue(),
              workspaceId: violation.workspaceId.getValue(),
              policyId: violation.policyId.getValue(),
              expenseId: violation.expenseId.getValue(),
              userId: violation.userId.getValue(),
              status: violation.status,
              severity: violation.severity,
              violationDetails: violation.violationDetails,
              expenseAmount: violation.expenseAmount,
              ...(violation.currency && { currency: violation.currency }),
              ...(violation.exemptionId && { exemptionId: violation.exemptionId.getValue() }),
              ...(violation.acknowledgedAt && { acknowledgedAt: violation.acknowledgedAt }),
              ...(violation.acknowledgedBy && { acknowledgedBy: violation.acknowledgedBy.getValue() }),
              ...(violation.resolvedAt && { resolvedAt: violation.resolvedAt }),
              ...(violation.resolvedBy && { resolvedBy: violation.resolvedBy.getValue() }),
              resolutionNote: violation.resolutionNotes ?? null,
              ...(isOverridden && violation.resolvedBy && { overriddenBy: violation.resolvedBy.getValue() }),
              ...(isOverridden && violation.resolutionNotes && { overrideReason: violation.resolutionNotes }),
              updatedAt: violation.updatedAt,
            },
          });
        } else {
          const allowedCurrentStatuses = violation.status === ViolationStatus.ACKNOWLEDGED
            ? [ViolationStatus.PENDING, ViolationStatus.ACKNOWLEDGED]
            : [ViolationStatus.PENDING];

          const updateResult = await tx.policyViolation.updateMany({
            where: {
              id: violation.id.getValue(),
              status: { in: allowedCurrentStatuses },
            },
            data: {
              status: violation.status,
              severity: violation.severity,
              violationDetails: violation.violationDetails,
              expenseAmount: violation.expenseAmount,
              ...(violation.currency && { currency: violation.currency }),
              ...(violation.exemptionId && { exemptionId: violation.exemptionId.getValue() }),
              ...(violation.acknowledgedAt && { acknowledgedAt: violation.acknowledgedAt }),
              ...(violation.acknowledgedBy && { acknowledgedBy: violation.acknowledgedBy.getValue() }),
              ...(violation.resolvedAt && { resolvedAt: violation.resolvedAt }),
              ...(violation.resolvedBy && { resolvedBy: violation.resolvedBy.getValue() }),
              resolutionNote: violation.resolutionNotes ?? null,
              ...(isOverridden && violation.resolvedBy && { overriddenBy: violation.resolvedBy.getValue() }),
              ...(isOverridden && violation.resolutionNotes && { overrideReason: violation.resolutionNotes }),
              updatedAt: violation.updatedAt,
            },
          });

          if (updateResult.count === 0) {
            throw new ViolationAlreadyResolvedError(violation.id.getValue());
          }
        }
      }

      await this.persistOutboxEvents(tx, violation);
    });

    await this.dispatchEvents(violation);
  }

  async saveAll(violations: PolicyViolation[]): Promise<void> {
    if (violations.length === 0) return;

    const ids = violations.map((v) => v.id.getValue());
    const newViolationsToDispatch: PolicyViolation[] = [];

    await this.prisma.$transaction(async (tx) => {
      const existingRows = await tx.policyViolation.findMany({
        where: { id: { in: ids } },
      });
      const existingMap = new Map(existingRows.map((r) => [r.id, r]));

      for (const violation of violations) {
        const isOverridden = violation.status === ViolationStatus.OVERRIDDEN;
        const existing = existingMap.get(violation.id.getValue());

        if (!existing) {
          await tx.policyViolation.create({
            data: {
              id: violation.id.getValue(),
              workspaceId: violation.workspaceId.getValue(),
              policyId: violation.policyId.getValue(),
              expenseId: violation.expenseId.getValue(),
              userId: violation.userId.getValue(),
              status: violation.status,
              severity: violation.severity,
              violationDetails: violation.violationDetails,
              expenseAmount: violation.expenseAmount,
              ...(violation.currency && { currency: violation.currency }),
              ...(violation.exemptionId && { exemptionId: violation.exemptionId.getValue() }),
              ...(violation.acknowledgedAt && { acknowledgedAt: violation.acknowledgedAt }),
              ...(violation.acknowledgedBy && { acknowledgedBy: violation.acknowledgedBy.getValue() }),
              ...(violation.resolvedAt && { resolvedAt: violation.resolvedAt }),
              ...(violation.resolvedBy && { resolvedBy: violation.resolvedBy.getValue() }),
              ...(violation.resolutionNotes && { resolutionNote: violation.resolutionNotes }),
              ...(isOverridden && violation.resolvedBy && { overriddenBy: violation.resolvedBy.getValue() }),
              ...(isOverridden && violation.resolutionNotes && { overrideReason: violation.resolutionNotes }),
              updatedAt: violation.updatedAt,
            },
          });
          await this.persistOutboxEvents(tx, violation);
          newViolationsToDispatch.push(violation);
        } else {
          const terminalStatuses: string[] = [
            ViolationStatus.RESOLVED,
            ViolationStatus.EXEMPTED,
            ViolationStatus.OVERRIDDEN,
          ];

          if (terminalStatuses.includes(existing.status)) {
            // Terminal human decision stands: only update evaluated metrics, retain terminal state and lifecycle
            await tx.policyViolation.update({
              where: { id: existing.id },
              data: {
                severity: violation.severity,
                violationDetails: violation.violationDetails,
                expenseAmount: violation.expenseAmount,
                ...(violation.currency && { currency: violation.currency }),
                updatedAt: violation.updatedAt,
              },
            });
          } else if (existing.status === ViolationStatus.ACKNOWLEDGED && violation.status === ViolationStatus.PENDING) {
            // Preserve ACKNOWLEDGED state
            await tx.policyViolation.update({
              where: { id: existing.id },
              data: {
                severity: violation.severity,
                violationDetails: violation.violationDetails,
                expenseAmount: violation.expenseAmount,
                ...(violation.currency && { currency: violation.currency }),
                updatedAt: violation.updatedAt,
              },
            });
          } else {
            await tx.policyViolation.update({
              where: { id: existing.id },
              data: {
                status: violation.status,
                severity: violation.severity,
                violationDetails: violation.violationDetails,
                expenseAmount: violation.expenseAmount,
                ...(violation.currency && { currency: violation.currency }),
                ...(violation.exemptionId && { exemptionId: violation.exemptionId.getValue() }),
                ...(violation.acknowledgedAt && { acknowledgedAt: violation.acknowledgedAt }),
                ...(violation.acknowledgedBy && { acknowledgedBy: violation.acknowledgedBy.getValue() }),
                ...(violation.resolvedAt && { resolvedAt: violation.resolvedAt }),
                ...(violation.resolvedBy && { resolvedBy: violation.resolvedBy.getValue() }),
                ...(violation.resolutionNotes && { resolutionNote: violation.resolutionNotes }),
                ...(isOverridden && violation.resolvedBy && { overriddenBy: violation.resolvedBy.getValue() }),
                ...(isOverridden && violation.resolutionNotes && { overrideReason: violation.resolutionNotes }),
                updatedAt: violation.updatedAt,
              },
            });
            await this.persistOutboxEvents(tx, violation);
            newViolationsToDispatch.push(violation);
          }
        }
      }
    });

    for (const violation of newViolationsToDispatch) {
      await this.dispatchEvents(violation);
    }
  }

  async saveForExpense(
    workspaceId: WorkspaceId,
    expenseId: ExpenseId,
    violations: PolicyViolation[]
  ): Promise<void> {
    const wsId = workspaceId.getValue();
    const expId = expenseId.getValue();
    const newViolationIds = violations.map((v) => v.id.getValue());

    const clearedViolations: PolicyViolation[] = [];
    const newViolationsToDispatch: PolicyViolation[] = [];

    await this.prisma.$transaction(async (tx) => {
      // 0. Acquire PostgreSQL transaction-scoped advisory lock to strictly serialize concurrent evaluations of this expense
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`expense_eval_${wsId}_${expId}`}))`;

      // 1. Transition stale PENDING and ACKNOWLEDGED violations for this expense to RESOLVED with outbox event
      const staleRows = await tx.policyViolation.findMany({
        where: {
          workspaceId: wsId,
          expenseId: expId,
          status: { in: [ViolationStatus.PENDING, ViolationStatus.ACKNOWLEDGED] },
          ...(newViolationIds.length > 0 ? { id: { notIn: newViolationIds } } : {}),
        },
      });

      for (const staleRow of staleRows) {
        const staleViolation = this.toDomain(staleRow);
        staleViolation.clearByReevaluation('Cleared upon expense re-evaluation');
        const updateResult = await tx.policyViolation.updateMany({
          where: {
            id: staleViolation.id.getValue(),
            status: { in: [ViolationStatus.PENDING, ViolationStatus.ACKNOWLEDGED] },
          },
          data: {
            status: ViolationStatus.RESOLVED,
            resolvedBy: staleViolation.resolvedBy!.getValue(),
            resolvedAt: staleViolation.resolvedAt,
            resolutionNote: staleViolation.resolutionNotes,
            updatedAt: staleViolation.updatedAt,
          },
        });
        if (updateResult.count === 1) {
          await this.persistOutboxEvents(tx, staleViolation);
          clearedViolations.push(staleViolation);
        }
      }

      // 2. Query existing violations for newViolationIds to prevent evaluation race against terminal human decisions
      const existingRows = newViolationIds.length > 0
        ? await tx.policyViolation.findMany({
            where: {
              workspaceId: wsId,
              expenseId: expId,
              id: { in: newViolationIds },
            },
          })
        : [];
      const existingMap = new Map(existingRows.map((r) => [r.id, r]));

      for (const violation of violations) {
        const isOverridden = violation.status === ViolationStatus.OVERRIDDEN;
        const existing = existingMap.get(violation.id.getValue());

        if (!existing) {
          // New violation: create row and queue outbox event
          await tx.policyViolation.create({
            data: {
              id: violation.id.getValue(),
              workspaceId: violation.workspaceId.getValue(),
              policyId: violation.policyId.getValue(),
              expenseId: violation.expenseId.getValue(),
              userId: violation.userId.getValue(),
              status: violation.status,
              severity: violation.severity,
              violationDetails: violation.violationDetails,
              expenseAmount: violation.expenseAmount,
              ...(violation.currency && { currency: violation.currency }),
              ...(violation.exemptionId && { exemptionId: violation.exemptionId.getValue() }),
              ...(violation.acknowledgedAt && { acknowledgedAt: violation.acknowledgedAt }),
              ...(violation.acknowledgedBy && { acknowledgedBy: violation.acknowledgedBy.getValue() }),
              ...(violation.resolvedAt && { resolvedAt: violation.resolvedAt }),
              ...(violation.resolvedBy && { resolvedBy: violation.resolvedBy.getValue() }),
              resolutionNote: violation.resolutionNotes ?? null,
              ...(isOverridden && violation.resolvedBy && { overriddenBy: violation.resolvedBy.getValue() }),
              ...(isOverridden && violation.resolutionNotes && { overrideReason: violation.resolutionNotes }),
              updatedAt: violation.updatedAt,
            },
          });
          await this.persistOutboxEvents(tx, violation);
          newViolationsToDispatch.push(violation);
        } else {
          // Existing violation exists: guard terminal and acknowledged states
          const terminalStatuses: string[] = [
            ViolationStatus.RESOLVED,
            ViolationStatus.EXEMPTED,
            ViolationStatus.OVERRIDDEN,
          ];

          if (terminalStatuses.includes(existing.status)) {
            // Existing violation is already in a terminal human/system state (RESOLVED, EXEMPTED, OVERRIDDEN).
            // Retain its terminal status and all lifecycle information (resolvedAt, resolvedBy, resolutionNote, exemptionId, overriddenBy, overrideReason).
            // Only update evaluated financial/metric data.
            await tx.policyViolation.update({
              where: { id: existing.id },
              data: {
                severity: violation.severity,
                violationDetails: violation.violationDetails,
                expenseAmount: violation.expenseAmount,
                ...(violation.currency && { currency: violation.currency }),
                updatedAt: violation.updatedAt,
              },
            });
            // Do NOT re-emit ViolationCreated for an already resolved/exempted/overridden violation
          } else if (existing.status === ViolationStatus.ACKNOWLEDGED) {
            // Existing violation was acknowledged by the employee. Do not revert to PENDING.
            await tx.policyViolation.update({
              where: { id: existing.id },
              data: {
                severity: violation.severity,
                violationDetails: violation.violationDetails,
                expenseAmount: violation.expenseAmount,
                ...(violation.currency && { currency: violation.currency }),
                updatedAt: violation.updatedAt,
              },
            });
          } else {
            // Existing violation is PENDING: conditionally update where status is still PENDING
            // to guard against concurrent resolution while this reevaluation transaction is running!
            const updateResult = await tx.policyViolation.updateMany({
              where: {
                id: existing.id,
                status: ViolationStatus.PENDING,
              },
              data: {
                severity: violation.severity,
                violationDetails: violation.violationDetails,
                expenseAmount: violation.expenseAmount,
                ...(violation.currency && { currency: violation.currency }),
                updatedAt: violation.updatedAt,
              },
            });

            if (updateResult.count === 0) {
              // Concurrently resolved! Only update metrics without touching status/lifecycle
              await tx.policyViolation.update({
                where: { id: existing.id },
                data: {
                  severity: violation.severity,
                  violationDetails: violation.violationDetails,
                  expenseAmount: violation.expenseAmount,
                  ...(violation.currency && { currency: violation.currency }),
                  updatedAt: violation.updatedAt,
                },
              });
            }
          }
        }
      }
    });

    for (const cleared of clearedViolations) {
      await this.dispatchEvents(cleared);
    }

    for (const violation of newViolationsToDispatch) {
      await this.dispatchEvents(violation);
    }
  }

  async findById(id: ViolationId): Promise<PolicyViolation | null> {
    const row = await this.prisma.policyViolation.findUnique({
      where: { id: id.getValue() },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByWorkspace(
    workspaceId: WorkspaceId,
    filters?: ViolationFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PolicyViolation>> {
    const wsId = workspaceId.getValue();
    const where: Prisma.PolicyViolationWhereInput = { workspaceId: wsId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.severity) {
      where.severity = filters.severity;
    }
    if (filters?.userId) {
      where.userId = typeof filters.userId === 'string' ? filters.userId : filters.userId.getValue();
    }
    if (filters?.expenseId) {
      where.expenseId = typeof filters.expenseId === 'string' ? filters.expenseId : filters.expenseId.getValue();
    }
    if (filters?.policyId) {
      where.policyId = typeof filters.policyId === 'string' ? filters.policyId : filters.policyId.getValue();
    }
    if (filters?.startDate || filters?.endDate) {
      where.detectedAt = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    return PrismaRepositoryHelper.paginate(
      this.prisma.policyViolation,
      {
        where,
        orderBy: { detectedAt: 'desc' },
      },
      (row) => this.toDomain(row),
      options
    );
  }

  async findByExpense(
    workspaceId: WorkspaceId,
    expenseId: ExpenseId
  ): Promise<PolicyViolation[]> {
    const rows = await this.prisma.policyViolation.findMany({
      where: {
        workspaceId: workspaceId.getValue(),
        expenseId: expenseId.getValue(),
      },
      orderBy: { detectedAt: 'desc' },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async findByUser(
    workspaceId: WorkspaceId,
    userId: UserId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PolicyViolation>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.policyViolation,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          userId: userId.getValue(),
        },
        orderBy: { detectedAt: 'desc' },
      },
      (row) => this.toDomain(row),
      options
    );
  }

  async findPendingByWorkspace(
    workspaceId: WorkspaceId,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PolicyViolation>> {
    return PrismaRepositoryHelper.paginate(
      this.prisma.policyViolation,
      {
        where: {
          workspaceId: workspaceId.getValue(),
          status: ViolationStatus.PENDING,
        },
        orderBy: { detectedAt: 'desc' },
      },
      (row) => this.toDomain(row),
      options
    );
  }

  async countByWorkspace(
    workspaceId: WorkspaceId,
    filters?: ViolationFilters
  ): Promise<number> {
    const wsId = workspaceId.getValue();
    const where: Prisma.PolicyViolationWhereInput = { workspaceId: wsId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.severity) {
      where.severity = filters.severity;
    }
    if (filters?.userId) {
      where.userId = typeof filters.userId === 'string' ? filters.userId : filters.userId.getValue();
    }
    if (filters?.expenseId) {
      where.expenseId = typeof filters.expenseId === 'string' ? filters.expenseId : filters.expenseId.getValue();
    }
    if (filters?.policyId) {
      where.policyId = typeof filters.policyId === 'string' ? filters.policyId : filters.policyId.getValue();
    }
    if (filters?.startDate || filters?.endDate) {
      where.detectedAt = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    return this.prisma.policyViolation.count({ where });
  }

  async getStats(
    workspaceId: WorkspaceId,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<ViolationStats> {
    const wsId = workspaceId.getValue();
    const where: Prisma.PolicyViolationWhereInput = { workspaceId: wsId };

    if (filters?.startDate || filters?.endDate) {
      where.detectedAt = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    const [total, statusGroups, severityGroups] = await Promise.all([
      this.prisma.policyViolation.count({ where }),
      this.prisma.policyViolation.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.policyViolation.groupBy({
        by: ['severity'],
        where,
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<ViolationStatus, number> = {
      [ViolationStatus.PENDING]: 0,
      [ViolationStatus.ACKNOWLEDGED]: 0,
      [ViolationStatus.RESOLVED]: 0,
      [ViolationStatus.EXEMPTED]: 0,
      [ViolationStatus.OVERRIDDEN]: 0,
    };
    for (const g of statusGroups) {
      if (g.status in byStatus) {
        byStatus[g.status as ViolationStatus] = g._count._all;
      }
    }

    const bySeverity: Record<ViolationSeverity, number> = {
      [ViolationSeverity.LOW]: 0,
      [ViolationSeverity.MEDIUM]: 0,
      [ViolationSeverity.HIGH]: 0,
      [ViolationSeverity.CRITICAL]: 0,
    };
    for (const g of severityGroups) {
      if (g.severity in bySeverity) {
        bySeverity[g.severity as ViolationSeverity] = g._count._all;
      }
    }

    return { total, byStatus, bySeverity };
  }

  async deleteByExpense(
    workspaceId: WorkspaceId,
    expenseId: ExpenseId
  ): Promise<void> {
    await this.prisma.policyViolation.deleteMany({
      where: {
        workspaceId: workspaceId.getValue(),
        expenseId: expenseId.getValue(),
      },
    });
  }

  async delete(id: ViolationId): Promise<void> {
    await this.prisma.policyViolation.delete({
      where: { id: id.getValue() },
    });
  }

  private toDomain(
    row: Prisma.PolicyViolationGetPayload<object>
  ): PolicyViolation {
    return PolicyViolation.fromPersistence({
      violationId: ViolationId.fromString(row.id),
      workspaceId: WorkspaceId.fromString(row.workspaceId),
      policyId: PolicyId.fromString(row.policyId),
      expenseId: ExpenseId.fromString(row.expenseId),
      userId: UserId.fromString(row.userId),
      status: row.status as ViolationStatus,
      severity: row.severity as ViolationSeverity,
      violationDetails: row.violationDetails,
      expenseAmount: Number(row.expenseAmount),
      currency: row.currency ?? undefined,
      acknowledgedBy: row.acknowledgedBy ? UserId.fromString(row.acknowledgedBy) : undefined,
      acknowledgedAt: row.acknowledgedAt ?? undefined,
      resolvedBy: row.resolvedBy
        ? UserId.fromString(row.resolvedBy)
        : (row.overriddenBy ? UserId.fromString(row.overriddenBy) : undefined),
      resolvedAt: row.resolvedAt ?? undefined,
      resolutionNotes: row.resolutionNote ?? row.overrideReason ?? undefined,
      exemptionId: row.exemptionId ? ExemptionId.fromString(row.exemptionId) : undefined,
      createdAt: row.detectedAt,
      updatedAt: row.updatedAt,
    });
  }
}
