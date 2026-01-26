import { SpendingLimitService } from '../services/spending-limit.service'
import { SpendingLimit } from '../../domain/entities/spending-limit.entity'

export interface UpdateSpendingLimitDto {
  limitId: string
  workspaceId: string
  limitAmount?: number | string
}

export class UpdateSpendingLimitHandler {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(dto: UpdateSpendingLimitDto): Promise<SpendingLimit> {
    return await this.limitService.updateSpendingLimit(dto.limitId, dto.workspaceId, {
      limitAmount: dto.limitAmount,
    })
  }
}
