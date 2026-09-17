import { ViolationService } from '../services/violation.service';
import { OperationService } from '@shared/services/operation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface OverrideViolationCommand extends ICommand {
  readonly violationId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly overriddenBy?: string;
  readonly overrideReason: string;
  readonly authToken?: string;
}

export type OverrideViolationInput = OverrideViolationCommand;

export class OverrideViolationHandler implements ICommandHandler<OverrideViolationCommand, CommandResult<PolicyViolationDTO>> {
  constructor(
    private readonly violationService: ViolationService,
    private readonly operations: OperationService
  ) {}

  async handle(command: OverrideViolationCommand): Promise<CommandResult<PolicyViolationDTO>> {
    const actorId = command.actorId ?? command.overriddenBy!;
    const dto = await this.operations.execute(
      {
        actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      },
      async () =>
        this.violationService.overrideViolation(
          command.violationId,
          command.workspaceId,
          actorId,
          command.overrideReason
        )
    );
    return CommandResult.success(dto);
  }
}
