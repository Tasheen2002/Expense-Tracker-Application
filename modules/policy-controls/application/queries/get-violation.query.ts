import { ViolationRepository } from '../../domain/repositories/violation.repository';
import { PolicyViolation } from '../../domain/entities/policy-violation.entity';
import { ViolationId } from '../../domain/value-objects/violation-id';
import { ViolationNotFoundError } from '../../domain/errors/policy-controls.errors';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
export interface GetViolationInput extends IQuery {
  violationId: string;
  workspaceId: string;
}

export class GetViolationHandler implements IQueryHandler<
  GetViolationInput,
  QueryResult<PolicyViolation>
> {
  constructor(private readonly violationRepository: ViolationRepository) {}

  async handle(
    input: GetViolationInput
  ): Promise<QueryResult<PolicyViolation>> {
    try {
      const violation = await this.violationRepository.findById(
        ViolationId.fromString(input.violationId)
      );
      if (
        !violation ||
        violation.getWorkspaceId().getValue() !== input.workspaceId
      ) {
        throw new ViolationNotFoundError(input.violationId);
      }
      return QueryResult.success(violation);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
