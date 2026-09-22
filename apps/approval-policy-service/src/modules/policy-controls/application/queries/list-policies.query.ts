import { PolicyService } from '../services/policy.service';
import { ExpensePolicyDTO } from '../../domain/entities/expense-policy.entity';
import { PolicyType } from '../../domain/enums/policy-type.enum';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { OperationService } from '../../../../shared/services/operation.service';
import { UnauthorizedWorkspaceAccessError } from '../../../../shared/errors/workspace-authorization.error';

export interface ListPoliciesInput extends IQuery {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly activeOnly?: boolean;
  readonly policyType?: PolicyType;
  readonly pagination?: PaginationOptions;
  readonly authToken?: string;
}

export class ListPoliciesHandler implements IQueryHandler<ListPoliciesInput, PaginatedResult<ExpensePolicyDTO>> {
  constructor(
    private readonly policyService: PolicyService,
    private readonly operations: OperationService
  ) {}

  async handle(input: ListPoliciesInput): Promise<PaginatedResult<ExpensePolicyDTO>> {
    if (!input.actorId) {
      throw new UnauthorizedWorkspaceAccessError('Actor ID is required for query authorization');
    }

    await this.operations.authorize({
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      authToken: input.authToken,
    });

    return this.policyService.listPolicies(
      input.workspaceId,
      { activeOnly: input.activeOnly, policyType: input.policyType },
      input.pagination
    );
  }
}
