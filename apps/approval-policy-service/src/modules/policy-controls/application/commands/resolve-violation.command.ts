import { ViolationService } from '../services/violation.service';
import { OperationService } from '@shared/services/operation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface ResolveViolationCommand extends ICommand {
  readonly violationId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly resolvedBy?: string;
  readonly resolutionNote?: string;
  readonly authToken?: string;
}

export type ResolveViolationInput = ResolveViolationCommand;

export class ResolveViolationHandler implements ICommandHandler<ResolveViolationCommand, CommandResult<PolicyViolationDTO>> {
  constructor(
    private readonly violationService: ViolationService,
    private readonly operations: OperationService
  ) {}

  async handle(command: ResolveViolationCommand): Promise<CommandResult<PolicyViolationDTO>> {
    const actorId = command.actorId ?? command.resolvedBy!;
    const dto = await this.operations.execute(
      {
        actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      },
      async () =>
        this.violationService.resolveViolation(
          command.violationId,
          command.workspaceId,
          actorId,
          command.resolutionNote
        )
    );
    return CommandResult.success(dto);
  }
}
