import { ViolationService } from '../services/violation.service';
import { OperationService } from '@shared/services/operation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ViolationSeverity } from '../../domain/enums/violation-severity.enum';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

import { UnauthorizedWorkspaceAccessError } from '@shared/errors/workspace-authorization.error';

export interface RecordViolationCommand extends ICommand {
  readonly actorId?: string;
  readonly servicePrincipal?: string;
  readonly workspaceId: string;
  readonly policyId: string;
  readonly expenseId: string;
  readonly userId: string;
  readonly severity: ViolationSeverity;
  readonly violationDetails: string;
  readonly expenseAmount: number;
  readonly currency?: string;
  readonly authToken?: string;
}

export type RecordViolationInput = RecordViolationCommand;

export class RecordViolationHandler implements ICommandHandler<RecordViolationCommand, CommandResult<PolicyViolationDTO>> {
  constructor(
    private readonly violationService: ViolationService,
    private readonly operations: OperationService
  ) {}

  async handle(
    command: RecordViolationCommand
  ): Promise<CommandResult<PolicyViolationDTO>> {
    if (!command.actorId && !command.servicePrincipal) {
      throw new UnauthorizedWorkspaceAccessError(
        'RecordViolation requires an authenticated actorId (ADMIN) or verified servicePrincipal'
      );
    }

    if (command.servicePrincipal) {
      await this.operations.authorize({
        servicePrincipal: command.servicePrincipal,
        workspaceId: command.workspaceId,
        authToken: command.authToken,
      });
    } else if (command.actorId) {
      await this.operations.authorize({
        actorId: command.actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      });
    }

    const dto = await this.violationService.createViolation({
      workspaceId: command.workspaceId,
      policyId: command.policyId,
      expenseId: command.expenseId,
      userId: command.userId,
      severity: command.severity,
      violationDetails: command.violationDetails,
      expenseAmount: command.expenseAmount,
      currency: command.currency,
    });
    return CommandResult.success(dto);
  }
}
