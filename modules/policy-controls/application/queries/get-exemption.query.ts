import { ExemptionRepository } from '../../domain/repositories/exemption.repository';
import { PolicyExemption } from '../../domain/entities/policy-exemption.entity';
import { ExemptionId } from '../../domain/value-objects/exemption-id';
import { ExemptionNotFoundError } from '../../domain/errors/policy-controls.errors';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';
export interface GetExemptionInput extends IQuery {
  exemptionId: string;
  workspaceId: string;
}

export class GetExemptionHandler implements IQueryHandler<
  GetExemptionInput,
  QueryResult<PolicyExemption>
> {
  constructor(private readonly exemptionRepository: ExemptionRepository) {}

  async handle(
    input: GetExemptionInput
  ): Promise<QueryResult<PolicyExemption>> {
    try {
      const exemption = await this.exemptionRepository.findById(
        ExemptionId.fromString(input.exemptionId)
      );
      if (
        !exemption ||
        exemption.getWorkspaceId().getValue() !== input.workspaceId
      ) {
        throw new ExemptionNotFoundError(input.exemptionId);
      }
      return QueryResult.success(exemption);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
