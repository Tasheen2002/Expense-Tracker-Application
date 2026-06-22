/**
 * Type of expense policy
 */
export enum PolicyType {
  SPENDING_LIMIT = "SPENDING_LIMIT", // Max amount per expense
  DAILY_LIMIT = "DAILY_LIMIT", // Max daily spending
  WEEKLY_LIMIT = "WEEKLY_LIMIT", // Max weekly spending
  MONTHLY_LIMIT = "MONTHLY_LIMIT", // Max monthly spending
  CATEGORY_RESTRICTION = "CATEGORY_RESTRICTION", // Restrict certain categories
  RECEIPT_REQUIRED = "RECEIPT_REQUIRED", // Require receipt above threshold
  APPROVAL_REQUIRED = "APPROVAL_REQUIRED", // Require approval above threshold
  MERCHANT_BLACKLIST = "MERCHANT_BLACKLIST", // Block specific merchants
  TIME_RESTRICTION = "TIME_RESTRICTION", // Restrict by time (weekends, holidays)
  DESCRIPTION_REQUIRED = "DESCRIPTION_REQUIRED", // Require description above threshold
}

export const PolicyTypeLabels: Record<PolicyType, string> = {
  [PolicyType.SPENDING_LIMIT]: "Spending Limit",
  [PolicyType.DAILY_LIMIT]: "Daily Limit",
  [PolicyType.WEEKLY_LIMIT]: "Weekly Limit",
  [PolicyType.MONTHLY_LIMIT]: "Monthly Limit",
  [PolicyType.CATEGORY_RESTRICTION]: "Category Restriction",
  [PolicyType.RECEIPT_REQUIRED]: "Receipt Required",
  [PolicyType.APPROVAL_REQUIRED]: "Approval Required",
  [PolicyType.MERCHANT_BLACKLIST]: "Merchant Blacklist",
  [PolicyType.TIME_RESTRICTION]: "Time Restriction",
  [PolicyType.DESCRIPTION_REQUIRED]: "Description Required",
};
