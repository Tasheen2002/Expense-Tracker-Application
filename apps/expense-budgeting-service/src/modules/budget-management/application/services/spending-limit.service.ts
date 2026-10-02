import {
  ISpendingLimitRepository,
  SpendingLimitFilters,
} from '../../domain/repositories/spending-limit.repository';
import {
  SpendingLimit,
  SpendingLimitDTO,
} from '../../domain/entities/spending-limit.entity';
import { SpendingLimitId } from '../../domain/value-objects/spending-limit-id';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';
import { SpendingLimitNotFoundError } from '../../domain/errors/budget.errors';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { IUnitOfWork } from '@shared/application/ports/unit-of-work.port';
import { IWorkspaceAccountingLock } from '../ports/workspace-accounting-lock.port';

export class SpendingLimitService {
  constructor(
    private readonly limitRepository: ISpendingLimitRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly accountingLock?: IWorkspaceAccountingLock
  ) {}

  async createSpendingLimit(params: {
    workspaceId: string;
    userId?: string;
    categoryId?: string;
    limitAmount: number | string;
    currency: string;
    periodType: BudgetPeriodType;
  }): Promise<SpendingLimitDTO> {
    const limit = SpendingLimit.create({
      workspaceId: params.workspaceId,
      userId: params.userId,
      categoryId: params.categoryId,
      limitAmount: params.limitAmount,
      currency: params.currency,
      periodType: params.periodType,
    });

    await this.unitOfWork.execute(async () => {
      await this.accountingLock?.acquire(limit.workspaceId);
      await this.limitRepository.create(limit);
    });

    return SpendingLimit.toDTO(limit);
  }

  async updateSpendingLimit(
    limitId: string,
    workspaceId: string,
    updates: {
      limitAmount?: number | string;
    }
  ): Promise<SpendingLimitDTO> {
    return this.unitOfWork.execute(async () => {
      await this.accountingLock?.acquire(workspaceId);
      const limit = await this.limitRepository.findById(
        SpendingLimitId.fromString(limitId), workspaceId
      );
      if (!limit) throw new SpendingLimitNotFoundError(limitId);
      if (updates.limitAmount !== undefined) limit.updateLimitAmount(updates.limitAmount);
      await this.limitRepository.save(limit);
      return SpendingLimit.toDTO(limit);
    });
  }

  async deleteSpendingLimit(
    limitId: string,
    workspaceId: string
  ): Promise<void> {
    const limitIdObj = SpendingLimitId.fromString(limitId);

    await this.unitOfWork.execute(async () => {
      await this.accountingLock?.acquire(workspaceId);
      const limit = await this.limitRepository.findById(limitIdObj, workspaceId);
      if (!limit) throw new SpendingLimitNotFoundError(limitId);
      limit.markAsDeleted();
      await this.limitRepository.save(limit);
      await this.limitRepository.delete(limitIdObj, workspaceId);
    });
  }

  async getSpendingLimitById(
    limitId: string,
    workspaceId: string
  ): Promise<SpendingLimitDTO | null> {
    const limit = await this.limitRepository.findById(
      SpendingLimitId.fromString(limitId),
      workspaceId
    );
    return limit ? SpendingLimit.toDTO(limit) : null;
  }

  async getSpendingLimitsByWorkspace(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<SpendingLimitDTO>> {
    const result = await this.limitRepository.findByWorkspace(
      workspaceId,
      options
    );
    return {
      ...result,
      items: result.items.map((l) => SpendingLimit.toDTO(l)),
    };
  }

  async filterSpendingLimits(
    filters: SpendingLimitFilters,
    options?: PaginationOptions
  ): Promise<PaginatedResult<SpendingLimitDTO>> {
    const result = await this.limitRepository.findByFilters(filters, options);
    return {
      ...result,
      items: result.items.map((l) => SpendingLimit.toDTO(l)),
    };
  }

  async getApplicableLimits(
    workspaceId: string,
    userId?: string,
    categoryId?: string
  ): Promise<SpendingLimit[]> {
    return await this.limitRepository.findApplicableLimits(
      workspaceId,
      userId,
      categoryId
    );
  }

}
