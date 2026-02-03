// Policy name constraints
export const POLICY_NAME_MIN_LENGTH = 1;
export const POLICY_NAME_MAX_LENGTH = 100;
export const POLICY_DESCRIPTION_MAX_LENGTH = 500;

// Priority constraints
export const MIN_PRIORITY = 0;
export const MAX_PRIORITY = 1000;

// Amount constraints
export const MIN_THRESHOLD_AMOUNT = 0;
export const MAX_THRESHOLD_AMOUNT = 999999999;

// Exemption constraints
export const EXEMPTION_REASON_MIN_LENGTH = 10;
export const EXEMPTION_REASON_MAX_LENGTH = 1000;
export const EXEMPTION_MAX_DURATION_DAYS = 365;

// Violation note constraints
export const VIOLATION_NOTE_MAX_LENGTH = 500;
export const OVERRIDE_REASON_MIN_LENGTH = 10;
export const OVERRIDE_REASON_MAX_LENGTH = 500;

// Blacklist constraints
export const MAX_BLACKLISTED_MERCHANTS = 100;
export const MAX_RESTRICTED_CATEGORIES = 50;
export const MAX_ALLOWED_CATEGORIES = 50;
