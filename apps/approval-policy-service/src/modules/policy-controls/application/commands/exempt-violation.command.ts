import { ViolationService } from '../services/violation.service';
import { OperationService } from '@shared/services/operation.service';
import { PolicyViolationDTO } from '../../domain/entities/policy-violation.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface ExemptViolationCommand extends ICommand {
  readonly violationId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly exemptedBy?: string;
  readonly notes?: string;
  readonly exemptionId: string;
  readonly authToken?: string;
}

export type ExemptViolationInput = ExemptViolationCommand;

export class ExemptViolationHandler implements ICommandHandler<ExemptViolationCommand, CommandResult<PolicyViolationDTO>> {
  constructor(
    private readonly violationService: ViolationService,
    private readonly operations: OperationService
  ) {}

  async handle(command: ExemptViolationCommand): Promise<CommandResult<PolicyViolationDTO>> {
    const actorId = command.actorId ?? command.exemptedBy!;
    const dto = await this.operations.execute(
      {
        actorId,
        workspaceId: command.workspaceId,
        role: 'ADMIN',
        authToken: command.authToken,
      },
      async () =>
        this.violationService.exemptViolation(
          command.violationId,
          command.workspaceId,
          actorId,
          command.notes,
          command.exemptionId
        )
    );
    return CommandResult.success(dto);
  }
}
