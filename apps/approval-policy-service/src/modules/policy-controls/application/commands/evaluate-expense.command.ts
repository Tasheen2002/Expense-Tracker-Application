import {
  PolicyEvaluationService,
  ExpenseContext,
} from '../services/policy-evaluation.service';
import { OperationService } from '@shared/services/operation.service';
import { IExpenseSnapshotService } from '@shared/ports/expense-snapshot.port';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { UnauthorizedWorkspaceAccessError } from '@shared/errors/workspace-authorization.error';

export interface EvaluateExpenseCommand extends ICommand, ExpenseContext {
  readonly actorId?: string;
  readonly servicePrincipal?: string;
  readonly authToken?: string;
}

export type EvaluateExpenseInput = EvaluateExpenseCommand;

export interface EvaluateExpenseResult {
  passed: boolean;
  requiresApproval: boolean;
  approvalRequiredPolicyIds: string[];
  violationIds: string[];
  blockedByPolicyId?: string;
}

export class EvaluateExpenseHandler implements ICommandHandler<
  EvaluateExpenseCommand,
  CommandResult<EvaluateExpenseResult>
> {
  constructor(
    private readonly policyEvaluationService: PolicyEvaluationService,
    private readonly operations: OperationService,
    private readonly expenseSnapshotService?: IExpenseSnapshotService
  ) {}

  async handle(
    command: EvaluateExpenseCommand
  ): Promise<CommandResult<EvaluateExpenseResult>> {
    const actorId = command.actorId ?? command.userId;
    if (!actorId && !command.servicePrincipal) {
      throw new UnauthorizedWorkspaceAccessError(
        'EvaluateExpense requires an authenticated actorId (or userId) or verified servicePrincipal'
      );
    }

    let authoritativeContext: ExpenseContext;

    if (command.servicePrincipal) {
      await this.operations.authorize({
        servicePrincipal: command.servicePrincipal,
        workspaceId: command.workspaceId,
        authToken: command.authToken,
      });

      const allowedPrincipals = ['expense-service', 'system'];
      if (!allowedPrincipals.includes(command.servicePrincipal.toLowerCase().trim())) {
        throw new UnauthorizedWorkspaceAccessError(
          `Service principal '${command.servicePrincipal}' is not authorized to execute mutating expense evaluations`
        );
      }

      authoritativeContext = {
        ...command,
        userRole: command.userRole || 'MEMBER',
      };
    } else {
      const membership = await this.operations.authorize({
        actorId,
        workspaceId: command.workspaceId,
        authToken: command.authToken,
      });

      // Ordinary members cannot evaluate expenses on behalf of another user
      const isSelf = Boolean(command.userId) && actorId.toLowerCase() === command.userId.toLowerCase();
      const role = membership.role.toUpperCase();
      const isElevated = ['ADMIN', 'OWNER', 'FINANCE_APPROVER', 'SYSTEM'].includes(role);

      if (!isSelf && !isElevated) {
        throw new UnauthorizedWorkspaceAccessError(
          'Ordinary workspace members cannot evaluate expenses on behalf of another user'
        );
      }

      // Base context strictly binds userRole to authenticated membership
      authoritativeContext = {
        ...command,
        userRole: membership.role,
      };

      // Mutating evaluations by interactive users require authoritative expense snapshots
      if (!this.expenseSnapshotService) {
        throw new UnauthorizedWorkspaceAccessError(
          'IExpenseSnapshotService is required to perform authoritative mutating expense evaluation'
        );
      }

      const snapshot = await this.expenseSnapshotService.getExpenseSnapshot({
        workspaceId: command.workspaceId,
        expenseId: command.expenseId,
        userId: actorId,
        authToken: command.authToken,
      });

      if (snapshot.workspaceId !== command.workspaceId) {
        throw new UnauthorizedWorkspaceAccessError(
          `Expense ${command.expenseId} belongs to workspace ${snapshot.workspaceId}, not ${command.workspaceId}`
        );
      }

      if (isSelf && snapshot.userId.toLowerCase() !== actorId.toLowerCase()) {
        throw new UnauthorizedWorkspaceAccessError(
          `Expense ${command.expenseId} belongs to user ${snapshot.userId}, not ${actorId}`
        );
      }

      authoritativeContext = {
        ...authoritativeContext,
        expenseId: snapshot.expenseId,
        workspaceId: snapshot.workspaceId,
        userId: snapshot.userId,
        amount: snapshot.amount,
        currency: snapshot.currency,
        categoryId: snapshot.categoryId,
        hasReceipt: snapshot.hasReceipt,
        merchant: snapshot.merchant ?? undefined,
        description: snapshot.description ?? undefined,
        expenseDate: snapshot.expenseDate,
        userRole: membership.role,
      };
    }

    const result = await this.policyEvaluationService.evaluateExpense(authoritativeContext);

    return CommandResult.success({
      passed: result.passed,
      requiresApproval: result.requiresApproval,
      approvalRequiredPolicyIds: result.approvalRequiredPolicyIds,
      violationIds: result.violations.map((v) => v.id.getValue()),
      blockedByPolicyId: result.blockedByPolicy?.id.getValue(),
    });
  }
}
