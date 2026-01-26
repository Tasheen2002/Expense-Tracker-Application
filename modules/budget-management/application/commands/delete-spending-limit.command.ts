import { SpendingLimitService } from '../services/spending-limit.service'

export interface DeleteSpendingLimitDto {
  limitId: string
  workspaceId: string
}

export class DeleteSpendingLimitHandler {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(dto: DeleteSpendingLimitDto): Promise<void> {
    await this.limitService.deleteSpendingLimit(dto.limitId, dto.workspaceId)
  }
}
