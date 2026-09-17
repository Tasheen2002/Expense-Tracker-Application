import { ExemptionService } from '../services/exemption.service';
import { OperationService } from '@shared/services/operation.service';
import { PolicyExemptionDTO, ExemptionScope } from '../../domain/entities/policy-exemption.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

import { UnauthorizedWorkspaceAccessError } from '@shared/errors/workspace-authorization.error';

export interface RequestExemptionCommand extends ICommand {
  readonly workspaceId: string;
  readonly policyId: string;
  readonly userId: string;
  readonly requestedBy?: string;
  readonly actorId?: string;
  readonly reason: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly scope?: ExemptionScope;
  readonly authToken?: string;
}

export type RequestExemptionInput = RequestExemptionCommand;

export class RequestExemptionHandler implements ICommandHandler<RequestExemptionCommand, CommandResult<PolicyExemptionDTO>> {
  constructor(
    private readonly exemptionService: ExemptionService,
    private readonly operations: OperationService
  ) {}

  async handle(
    command: RequestExemptionCommand
  ): Promise<CommandResult<PolicyExemptionDTO>> {
    const actorId = command.actorId ?? command.requestedBy ?? command.userId;
    const membership = await this.operations.authorize({
      actorId,
      workspaceId: command.workspaceId,
      authToken: command.authToken,
    });

    // If requesting on behalf of someone else, require elevated role (ADMIN, OWNER, FINANCE_APPROVER)
    if (command.userId && actorId !== command.userId) {
      const allowedElevatedRoles = ['ADMIN', 'OWNER', 'FINANCE_APPROVER'];
      const memberRole = (membership.role || '').toUpperCase();
      if (!allowedElevatedRoles.includes(memberRole)) {
        throw new UnauthorizedWorkspaceAccessError(
          'Only administrators or finance approvers can request policy exemptions on behalf of other users'
        );
      }
    }

    const dto = await this.exemptionService.requestExemption({
      workspaceId: command.workspaceId,
      policyId: command.policyId,
      userId: command.userId,
      requestedBy: actorId,
      reason: command.reason,
      startDate: command.startDate,
      endDate: command.endDate,
      scope: command.scope,
    });
    return CommandResult.success(dto);
  }
}
