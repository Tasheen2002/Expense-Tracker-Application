import { ViolationService } from '../services/violation.service';
import { OperationService } from '@shared/services/operation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { UnauthorizedViolationActionError } from '../../domain/errors/policy-controls.errors';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface AcknowledgeViolationCommand extends ICommand {
  readonly violationId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly acknowledgedBy?: string;
  readonly note?: string;
  readonly authToken?: string;
}

export type AcknowledgeViolationInput = AcknowledgeViolationCommand;

export class AcknowledgeViolationHandler implements ICommandHandler<AcknowledgeViolationCommand, CommandResult<PolicyViolationDTO>> {
  constructor(
    private readonly violationService: ViolationService,
    private readonly operations: OperationService
  ) {}

  async handle(command: AcknowledgeViolationCommand): Promise<CommandResult<PolicyViolationDTO>> {
    const actorId = command.actorId ?? command.acknowledgedBy!;
    const membership = await this.operations.authorize({
      actorId,
      workspaceId: command.workspaceId,
      authToken: command.authToken,
    });

    const violation = await this.violationService.getViolationEntity(
      command.violationId,
      command.workspaceId
    );

    const isOwner = violation.userId.getValue() === actorId;
    const isElevated = ['ADMIN', 'OWNER', 'FINANCE_APPROVER'].includes(membership.role);

    if (!isOwner && !isElevated) {
      throw new UnauthorizedViolationActionError(actorId, 'acknowledge');
    }

    const dto =
      command.note !== undefined
        ? await this.violationService.acknowledgeViolation(
            command.violationId,
            command.workspaceId,
            actorId,
            command.note
          )
        : await this.violationService.acknowledgeViolation(
            command.violationId,
            command.workspaceId,
            actorId
          );
    return CommandResult.success(dto);
  }
}
