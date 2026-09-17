import { IPolicyRepository } from "../../domain/repositories/policy.repository";
import { IViolationRepository } from "../../domain/repositories/violation.repository";
import { IExemptionRepository } from "../../domain/repositories/exemption.repository";
import { ExpensePolicy } from "../../domain/entities/expense-policy.entity";
import type { PolicyExemption } from "../../domain/entities/policy-exemption.entity";
import { PolicyViolation } from "../../domain/entities/policy-violation.entity";
import { PolicyType } from "../../domain/enums/policy-type.enum";
import { ViolationSeverity } from "../../domain/enums/violation-severity.enum";
import { PolicyEvaluationError } from "../../domain/errors/policy-controls.errors";
import { WorkspaceId, UserId, ExpenseId } from '@core/domain/value-objects';
import { createHash } from 'crypto';

export function generateDeterministicViolationId(workspaceId: string, expenseId: string, policyId: string): string {
  const hash = createHash('sha256').update(`${workspaceId}:${expenseId}:${policyId}`).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

export interface ExpenseContext {
  expenseId: string;
  workspaceId: string;
  userId: string;
  amount: number;
  currency: string;
  categoryId?: string;
  merchant?: string;
  description?: string;
  hasReceipt: boolean;
  expenseDate: Date;
  userRole?: string;
  timezone?: string;
}

export interface PolicyEvaluationResult {
  passed: boolean;
  requiresApproval: boolean;
  approvalRequiredPolicyIds: string[];
  violations: PolicyViolation[];
  blockedByPolicy?: ExpensePolicy;
}

export interface CheckExpenseResult {
  wouldPass: boolean;
  requiresApproval: boolean;
  approvalRequiredPolicyIds: string[];
  potentialViolations: Array<{
    policyName: string;
    policyType: PolicyType;
    severity: ViolationSeverity;
    details: string;
  }>;
}

interface EvaluatedPolicyViolation {
  policy: ExpensePolicy;
  details: string;
  requiresApproval?: boolean;
}

function validateIanaTimezone(timeZone: string): void {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
  } catch {
    throw new PolicyEvaluationError(`Invalid IANA timezone identifier: ${timeZone}`);
  }
}

function getDayAndHourInTimezone(date: Date, timeZone: string = 'UTC'): { day: number; hour: number } {
  if (timeZone && timeZone !== 'UTC') {
    validateIanaTimezone(timeZone);
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value;
  const hourStr = parts.find((p) => p.type === 'hour')?.value;
  const daysMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const day = weekdayStr && daysMap[weekdayStr] !== undefined ? daysMap[weekdayStr] : date.getUTCDay();
  const hour = hourStr ? parseInt(hourStr, 10) : date.getUTCHours();
  return { day, hour };
}

/**
 * Service for evaluating expenses against active policies
 */
export class PolicyEvaluationService {
  constructor(
    private readonly policyRepository: IPolicyRepository,
    private readonly violationRepository: IViolationRepository,
    private readonly exemptionRepository: IExemptionRepository,
  ) {}

  /**
   * Internal common rule evaluation engine to eliminate logic drift between evaluateExpense and checkExpense.
   */
  private async evaluateRules(context: ExpenseContext): Promise<{
    evaluatedViolations: EvaluatedPolicyViolation[];
    approvalRequiredPolicyIds: string[];
    blockedByPolicy?: ExpensePolicy;
  }> {
    const wsId = WorkspaceId.fromString(context.workspaceId);
    const userId = UserId.fromString(context.userId);
    const activePolicies = await this.policyRepository.findAllActiveByWorkspace(wsId);

    // Sort by priority (higher priority first), with deterministic tie-breaker by createdAt DESC
    const sortedPolicies = [...activePolicies].sort(
      (a, b) => b.priority - a.priority || b.createdAt.getTime() - a.createdAt.getTime()
    );

    const applicablePolicies = sortedPolicies.filter((p) =>
      p.appliesTo({
        categoryId: context.categoryId,
        userRole: context.userRole,
        amount: context.amount,
      })
    );

    const exemptionMap = new Map<string, PolicyExemption>();
    const map = await this.exemptionRepository.findActiveForUserPolicies(
      wsId,
      userId,
      applicablePolicies.map((p) => p.id),
    );
    for (const [k, v] of map.entries()) {
      exemptionMap.set(k, v);
    }

    const evaluatedViolations: EvaluatedPolicyViolation[] = [];
    const approvalRequiredPolicyIds: string[] = [];
    let blockedByPolicy: ExpensePolicy | undefined;

    for (const policy of applicablePolicies) {
      // Check if user has an active exemption for this policy that applies to this expense
      const exemption = exemptionMap.get(policy.id.getValue());
      if (
        exemption &&
        exemption.appliesTo({
          categoryId: context.categoryId,
          amount: context.amount,
        })
      ) {
        continue;
      }

      // Evaluate the policy
      const violationResult = await this.evaluatePolicy(policy, context);

      if (violationResult) {
        if (violationResult.requiresApproval) {
          approvalRequiredPolicyIds.push(policy.id.getValue());
        }

        evaluatedViolations.push({
          policy,
          details: violationResult.details,
          requiresApproval: violationResult.requiresApproval,
        });

        // [P2] Critical severity blocks the expense; assign only while blockedByPolicy is undefined
        // to ensure the highest-priority critical policy is retained.
        if (policy.severity === ViolationSeverity.CRITICAL && !blockedByPolicy) {
          blockedByPolicy = policy;
        }
      }
    }

    return {
      evaluatedViolations,
      approvalRequiredPolicyIds,
      blockedByPolicy,
    };
  }

  /**
   * Evaluate an expense against all active policies in the workspace
   */
  async evaluateExpense(
    context: ExpenseContext,
  ): Promise<PolicyEvaluationResult> {
    const wsId = WorkspaceId.fromString(context.workspaceId);
    const expId = ExpenseId.fromString(context.expenseId);

    const {
      evaluatedViolations,
      approvalRequiredPolicyIds,
      blockedByPolicy,
    } = await this.evaluateRules(context);

    const violations: PolicyViolation[] = evaluatedViolations.map((item) => {
      const violationId = generateDeterministicViolationId(
        context.workspaceId,
        context.expenseId,
        item.policy.id.getValue()
      );

      return PolicyViolation.create({
        id: violationId,
        workspaceId: context.workspaceId,
        policyId: item.policy.id.getValue(),
        expenseId: context.expenseId,
        userId: context.userId,
        severity: item.policy.severity,
        violationDetails: item.details,
        expenseAmount: context.amount,
        currency: context.currency,
      });
    });

    // Save all violations atomically and idempotently for this expense
    await this.violationRepository.saveForExpense(wsId, expId, violations);

    const hasViolations = violations.length > 0;
    const hasApprovalRequirements = approvalRequiredPolicyIds.length > 0;

    return {
      passed: !hasViolations && !hasApprovalRequirements,
      requiresApproval: hasApprovalRequirements,
      approvalRequiredPolicyIds,
      violations,
      blockedByPolicy,
    };
  }

  /**
   * Evaluate a single policy against an expense context
   */
  private async evaluatePolicy(
    policy: ExpensePolicy,
    context: ExpenseContext,
  ): Promise<{ details: string; requiresApproval?: boolean } | null> {
    const config = policy.configuration;
    const policyType = policy.policyType;

    switch (policyType) {
      case PolicyType.SPENDING_LIMIT:
        if (config.threshold) {
          const policyCurrency = config.currency?.toUpperCase();
          const expenseCurrency = context.currency?.toUpperCase();
          if (policyCurrency && expenseCurrency && policyCurrency !== expenseCurrency) {
            // [P1] Currency mismatch fail-safe: cannot silently pass without exchange rate conversion
            return {
              details: `Cannot evaluate spending limit policy "${policy.name}": currency mismatch between policy currency (${policyCurrency}) and expense currency (${expenseCurrency}) requires currency conversion`,
            };
          }
          if (context.amount > config.threshold) {
            return {
              details: `Expense amount ${context.amount} ${context.currency} exceeds spending limit of ${config.threshold} ${config.currency || context.currency}`,
            };
          }
        }
        break;

      case PolicyType.RECEIPT_REQUIRED:
        const receiptThreshold = config.requirementThreshold ?? 0;
        if (context.amount > receiptThreshold && !context.hasReceipt) {
          return {
            details: `Receipt required for expenses over ${receiptThreshold} ${context.currency}. No receipt attached.`,
          };
        }
        break;

      case PolicyType.DESCRIPTION_REQUIRED:
        const descThreshold = config.requirementThreshold ?? 0;
        if (context.amount > descThreshold && !context.description?.trim()) {
          return {
            details: `Description required for expenses over ${descThreshold} ${context.currency}. No description provided.`,
          };
        }
        break;

      case PolicyType.CATEGORY_RESTRICTION:
        if (config.restrictedCategoryIds?.length && context.categoryId) {
          if (config.restrictedCategoryIds.includes(context.categoryId)) {
            return {
              details: `Category is restricted by policy "${policy.name}"`,
            };
          }
        }
        if (config.allowedCategoryIds?.length) {
          if (!context.categoryId) {
            return {
              details: `Category is required by policy "${policy.name}" and must be one of the allowed categories`,
            };
          }
          if (!config.allowedCategoryIds.includes(context.categoryId)) {
            return {
              details: `Category is not in the allowed categories list`,
            };
          }
        }
        break;

      case PolicyType.MERCHANT_BLACKLIST:
        if (config.blacklistedMerchants?.length && context.merchant) {
          const merchantLower = context.merchant.toLowerCase();
          const isBlacklisted = config.blacklistedMerchants.some((m) =>
            merchantLower.includes(m.toLowerCase()),
          );
          if (isBlacklisted) {
            return {
              details: `Merchant "${context.merchant}" is blacklisted`,
            };
          }
        }
        break;

      case PolicyType.TIME_RESTRICTION:
        const timezone = context.timezone || 'UTC';
        const { day: expenseDay, hour: expenseHour } = getDayAndHourInTimezone(context.expenseDate, timezone);

        if (config.blockedDays?.includes(expenseDay)) {
          const dayNames = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          return {
            details: `Expenses are not allowed on ${dayNames[expenseDay]}`,
          };
        }

        if (
          config.blockedHoursStart !== undefined &&
          config.blockedHoursEnd !== undefined
        ) {
          const inBlockedWindow =
            config.blockedHoursStart <= config.blockedHoursEnd
              ? expenseHour >= config.blockedHoursStart && expenseHour <= config.blockedHoursEnd
              : expenseHour >= config.blockedHoursStart || expenseHour <= config.blockedHoursEnd;

          if (inBlockedWindow) {
            return {
              details: `Expenses are not allowed between ${config.blockedHoursStart}:00 and ${config.blockedHoursEnd}:00`,
            };
          }
        }
        break;

      case PolicyType.DAILY_LIMIT:
      case PolicyType.WEEKLY_LIMIT:
      case PolicyType.MONTHLY_LIMIT:
        throw new PolicyEvaluationError(
          `Unsupported policy type evaluation: ${policy.policyType}`
        );

      case PolicyType.APPROVAL_REQUIRED: {
        const threshold = config.threshold ?? config.requirementThreshold ?? 0;
        const policyCurrency = config.currency?.toUpperCase();
        const expenseCurrency = context.currency?.toUpperCase();
        if (policyCurrency && expenseCurrency && policyCurrency !== expenseCurrency) {
          return {
            details: `Cannot evaluate approval-required policy "${policy.name}": currency mismatch between policy currency (${policyCurrency}) and expense currency (${expenseCurrency}) requires currency conversion`,
            requiresApproval: true,
          };
        }
        if (context.amount > threshold) {
          return {
            details: `Expense amount ${context.amount} ${context.currency} exceeds threshold ${threshold} ${config.currency || context.currency} requiring managerial approval`,
            requiresApproval: true,
          };
        }
        break;
      }
    }

    return null;
  }

  /**
   * Check if an expense would pass policy checks (dry run without saving violations)
   */
  async checkExpense(context: ExpenseContext): Promise<CheckExpenseResult> {
    const {
      evaluatedViolations,
      approvalRequiredPolicyIds,
    } = await this.evaluateRules(context);

    const potentialViolations = evaluatedViolations.map((item) => ({
      policyName: item.policy.name,
      policyType: item.policy.policyType,
      severity: item.policy.severity,
      details: item.details,
    }));

    const hasViolations = potentialViolations.length > 0;
    const hasApprovalRequirements = approvalRequiredPolicyIds.length > 0;

    return {
      wouldPass: !hasViolations && !hasApprovalRequirements,
      requiresApproval: hasApprovalRequirements,
      approvalRequiredPolicyIds,
      potentialViolations,
    };
  }
}
