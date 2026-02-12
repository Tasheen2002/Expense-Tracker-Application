import { ExemptionRepository } from "../../domain/repositories/exemption.repository";
import { ExemptionStatus } from "../../domain/enums/exemption-status.enum";

export interface ExpireExemptionsInput {
  workspaceId: string;
}

export interface ExpireExemptionsResult {
  expiredCount: number;
}

export class ExpireExemptionsHandler {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async handle(input: ExpireExemptionsInput): Promise<ExpireExemptionsResult> {
    // Get all approved exemptions and check which ones have expired
    const result = await this.exemptionRepository.findByWorkspace(
      input.workspaceId,
      {
        status: ExemptionStatus.APPROVED,
      },
    );

    let expiredCount = 0;
    for (const exemption of result.items) {
      if (exemption.isExpired()) {
        exemption.markExpired();
        await this.exemptionRepository.save(exemption);
        expiredCount++;
      }
    }

    return { expiredCount };
  }
}
