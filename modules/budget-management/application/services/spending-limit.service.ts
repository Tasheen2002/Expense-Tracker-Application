import { ISpendingLimitRepository, SpendingLimitFilters } from '../../domain/repositories/spending-limit.repository'
import { SpendingLimit } from '../../domain/entities/spending-limit.entity'
import { SpendingLimitId } from '../../domain/value-objects/spending-limit-id'
import { BudgetPeriodType } from '../../domain/enums/budget-period-type'

export class SpendingLimitService {
  constructor(private readonly limitRepository: ISpendingLimitRepository) {}

  async createSpendingLimit(params: {
    workspaceId: string
    userId?: string
    categoryId?: string
    limitAmount: number | string
    currency: string
    periodType: BudgetPeriodType
  }): Promise<SpendingLimit> {
    const limit = SpendingLimit.create({
      workspaceId: params.workspaceId,
      userId: params.userId,
      categoryId: params.categoryId,
      limitAmount: params.limitAmount,
      currency: params.currency,
      periodType: params.periodType,
    })

    await this.limitRepository.save(limit)

    return limit
  }

  async updateSpendingLimit(
    limitId: string,
    workspaceId: string,
    updates: {
      limitAmount?: number | string
    }
  ): Promise<SpendingLimit> {
    const limit = await this.limitRepository.findById(
      SpendingLimitId.fromString(limitId),
      workspaceId
    )

    if (!limit) {
      throw new Error('Spending limit not found')
    }

    if (updates.limitAmount) {
      limit.updateLimitAmount(updates.limitAmount)
    }

    await this.limitRepository.save(limit)

    return limit
  }

  async activateLimit(limitId: string, workspaceId: string): Promise<SpendingLimit> {
    const limit = await this.limitRepository.findById(
      SpendingLimitId.fromString(limitId),
      workspaceId
    )

    if (!limit) {
      throw new Error('Spending limit not found')
    }

    limit.activate()

    await this.limitRepository.save(limit)

    return limit
  }

  async deactivateLimit(limitId: string, workspaceId: string): Promise<SpendingLimit> {
    const limit = await this.limitRepository.findById(
      SpendingLimitId.fromString(limitId),
      workspaceId
    )

    if (!limit) {
      throw new Error('Spending limit not found')
    }

    limit.deactivate()

    await this.limitRepository.save(limit)

    return limit
  }

  async deleteSpendingLimit(limitId: string, workspaceId: string): Promise<void> {
    const limitIdObj = SpendingLimitId.fromString(limitId)

    const limit = await this.limitRepository.findById(limitIdObj, workspaceId)
    if (!limit) {
      throw new Error('Spending limit not found')
    }

    await this.limitRepository.delete(limitIdObj, workspaceId)
  }

  async getSpendingLimitById(
    limitId: string,
    workspaceId: string
  ): Promise<SpendingLimit | null> {
    return await this.limitRepository.findById(
      SpendingLimitId.fromString(limitId),
      workspaceId
    )
  }

  async getSpendingLimitsByWorkspace(workspaceId: string): Promise<SpendingLimit[]> {
    return await this.limitRepository.findByWorkspace(workspaceId)
  }

  async filterSpendingLimits(filters: SpendingLimitFilters): Promise<SpendingLimit[]> {
    return await this.limitRepository.findByFilters(filters)
  }

  async getApplicableLimits(
    workspaceId: string,
    userId?: string,
    categoryId?: string
  ): Promise<SpendingLimit[]> {
    return await this.limitRepository.findApplicableLimits(workspaceId, userId, categoryId)
  }

  // Validation method for checking if expense would violate limits
  async validateExpenseAgainstLimits(
    workspaceId: string,
    userId: string,
    categoryId: string | undefined,
    amount: number,
    currency: string
  ): Promise<{ valid: boolean; violatedLimits: SpendingLimit[] }> {
    const applicableLimits = await this.getApplicableLimits(
      workspaceId,
      userId,
      categoryId
    )

    const violatedLimits: SpendingLimit[] = []

    for (const limit of applicableLimits) {
      // Only check limits with matching currency
      if (limit.getCurrency() !== currency) {
        continue
      }

      // Check if limit applies to this expense
      if (limit.appliesTo(userId, categoryId)) {
        // Here you would need to query current spending for the period
        // and compare against the limit
        // This is a simplified version - you'd need to integrate with expense queries
        const limitAmount = Number(limit.getLimitAmount())
        if (amount > limitAmount) {
          violatedLimits.push(limit)
        }
      }
    }

    return {
      valid: violatedLimits.length === 0,
      violatedLimits,
    }
  }
}
