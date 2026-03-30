import { PolicyRepository } from "../../domain/repositories/policy.repository";
import { ViolationRepository } from "../../domain/repositories/violation.repository";
import { ExemptionRepository } from "../../domain/repositories/exemption.repository";
import { ExpensePolicy } from "../../domain/entities/expense-policy.entity";
import { PolicyViolation } from "../../domain/entities/policy-violation.entity";
import { PolicyType } from "../../domain/enums/policy-type.enum";
import { ViolationSeverity } from "../../domain/enums/violation-severity.enum";

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
}

export interface PolicyEvaluationResult {
  passed: boolean;
  violations: PolicyViolation[];
  blockedByPolicy?: ExpensePolicy;
}

/**
 * Service for evaluating expenses against active policies
 */
export class PolicyEvaluationService {
  constructor(
    private readonly policyRepository: PolicyRepository,
    private readonly violationRepository: ViolationRepository,
    private readonly exemptionRepository: ExemptionRepository,
  ) {}

  /**
   * Evaluate an expense against all active policies in the workspace
   */
  async evaluateExpense(
    context: ExpenseContext,
  ): Promise<PolicyEvaluationResult> {
    const policies = await this.policyRepository.findActiveByWorkspace(
      context.workspaceId,
    );

    // Sort by priority (higher priority first)
    policies.sort((a, b) => b.getPriority() - a.getPriority());

    const violations: PolicyViolation[] = [];
    let blockedByPolicy: ExpensePolicy | undefined;

    for (const policy of policies) {
      // Check if policy applies to this expense context
      if (
        !policy.appliesTo({
          categoryId: context.categoryId,
          userRole: context.userRole,
          amount: context.amount,
        })
      ) {
        continue;
      }

      // Check if user has an active exemption for this policy
      const exemption = await this.exemptionRepository.findActiveForUser(
        context.workspaceId,
        context.userId,
        policy.getId().getValue(),
      );
      if (exemption && exemption.isActive()) {
        continue;
      }

      // Evaluate the policy
      const violationResult = await this.evaluatePolicy(policy, context);

      if (violationResult) {
        const violation = PolicyViolation.create({
          workspaceId: context.workspaceId,
          policyId: policy.getId().getValue(),
          expenseId: context.expenseId,
          userId: context.userId,
          severity: policy.getSeverity(),
          violationDetails: violationResult.details,
          expenseAmount: context.amount,
          currency: context.currency,
        });

        violations.push(violation);

        // Critical severity blocks the expense
        if (policy.getSeverity() === ViolationSeverity.CRITICAL) {
          blockedByPolicy = policy;
        }
      }
    }

    // Save all violations
    for (const violation of violations) {
      await this.violationRepository.save(violation);
    }

    return {
      passed: violations.length === 0,
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
  ): Promise<{ details: string } | null> {
    const config = policy.getConfiguration();
    const policyType = policy.getPolicyType();

    switch (policyType) {
      case PolicyType.SPENDING_LIMIT:
        if (config.threshold && context.amount > config.threshold) {
          return {
            details: `Expense amount ${context.amount} ${context.currency} exceeds spending limit of ${config.threshold} ${config.currency || context.currency}`,
          };
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
              details: `Category is restricted by policy "${policy.getName()}"`,
            };
          }
        }
        if (config.allowedCategoryIds?.length && context.categoryId) {
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
        const expenseDay = context.expenseDate.getDay();
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
        break;

      case PolicyType.DAILY_LIMIT:
      case PolicyType.WEEKLY_LIMIT:
      case PolicyType.MONTHLY_LIMIT:
        // These require querying historical expenses - would need expense lookup adapter
        // For now, skip these evaluations
        break;

      case PolicyType.APPROVAL_REQUIRED:
        // This would trigger approval workflow - handled separately
        break;
    }

    return null;
  }

  /**
   * Check if an expense would pass policy checks (dry run without saving violations)
   */
  async checkExpense(context: ExpenseContext): Promise<{
    wouldPass: boolean;
    potentialViolations: Array<{
      policyName: string;
      policyType: PolicyType;
      severity: ViolationSeverity;
      details: string;
    }>;
  }> {
    const policies = await this.policyRepository.findActiveByWorkspace(
      context.workspaceId,
    );
    const potentialViolations: Array<{
      policyName: string;
      policyType: PolicyType;
      severity: ViolationSeverity;
      details: string;
    }> = [];

    for (const policy of policies) {
      if (
        !policy.appliesTo({
          categoryId: context.categoryId,
          userRole: context.userRole,
          amount: context.amount,
        })
      ) {
        continue;
      }

      const exemption = await this.exemptionRepository.findActiveForUser(
        context.workspaceId,
        context.userId,
        policy.getId().getValue(),
      );
      if (exemption && exemption.isActive()) {
        continue;
      }

      const violationResult = await this.evaluatePolicy(policy, context);
      if (violationResult) {
        potentialViolations.push({
          policyName: policy.getName(),
          policyType: policy.getPolicyType(),
          severity: policy.getSeverity(),
          details: violationResult.details,
        });
      }
    }

    return {
      wouldPass: potentialViolations.length === 0,
      potentialViolations,
    };
  }
}
