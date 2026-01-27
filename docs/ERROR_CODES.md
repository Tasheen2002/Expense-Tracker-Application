# API Error Codes Documentation

This document provides a comprehensive reference for all error codes used in the Expense Tracker API.

## Overview

All API errors follow a consistent structure with machine-readable error codes. This makes it easy to:
- Handle errors programmatically in your frontend
- Implement internationalization (i18n) for error messages
- Track and analyze errors in monitoring systems
- Generate consistent API documentation

## Error Response Format

All errors return the following structure:

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "errors": [] // Optional: validation errors array
}
```

## Error Codes by Module

### Approval Workflow Module

#### Approval Chain Errors
- **APPROVAL_CHAIN_NOT_FOUND** (404)
  - Approval chain with specified ID not found
  - Example: `Approval chain with ID abc123 not found`

- **NO_MATCHING_APPROVAL_CHAIN** (400)
  - No applicable approval chain found for the given criteria
  - Example: `No applicable approval chain found for expense amount 5000 in workspace xyz789`

#### Approval Step Errors
- **APPROVAL_STEP_NOT_FOUND** (404)
  - Approval step with specified ID not found
  - Example: `Approval step with ID step123 not found`

- **CURRENT_STEP_NOT_FOUND** (404)
  - No current step found in workflow
  - Example: `No current step found in workflow for expense exp123`

- **WORKFLOW_STEP_NOT_FOUND** (404)
  - Specific step number not found in workflow
  - Example: `Step 3 not found in workflow`

#### Approval Actions Errors
- **INVALID_APPROVAL_TRANSITION** (400)
  - Invalid state transition attempted
  - Example: `Invalid approval transition from APPROVED to PENDING`

- **UNAUTHORIZED_APPROVER** (403)
  - User not authorized to approve the step
  - Example: `User user123 is not authorized to approve step step456`

- **APPROVAL_ALREADY_PROCESSED** (409)
  - Approval step has already been processed
  - Example: `Approval step step123 has already been processed`

- **SELF_APPROVAL_NOT_ALLOWED** (403)
  - User cannot approve their own expenses
  - Example: `User user123 cannot be in their own approval chain (self-approval is not allowed for fraud prevention)`

#### Delegation Errors
- **INVALID_DELEGATION** (400)
  - Invalid delegation attempt
  - Example: Custom message based on delegation rules

#### Workflow Errors
- **WORKFLOW_NOT_FOUND** (404)
  - Workflow for expense not found
  - Example: `Workflow for expense exp123 not found`

- **WORKFLOW_ALREADY_EXISTS** (409)
  - Workflow already exists for expense
  - Example: `Workflow for expense exp123 already exists`

- **WORKFLOW_ALREADY_COMPLETED** (409)
  - Workflow is already in completed state
  - Example: `Workflow for expense exp123 is already completed with status: APPROVED`

---

### Expense Ledger Module

#### Expense Errors
- **EXPENSE_NOT_FOUND** (404)
  - Expense with specified ID not found
  - Example: `Expense with ID exp123 not found in workspace ws456`

- **EXPENSE_ALREADY_EXISTS** (409)
  - Expense with identifier already exists
  - Example: `Expense with identifier ref-2024-001 already exists`

- **INVALID_EXPENSE_STATUS** (400)
  - Cannot perform operation with current expense status
  - Example: `Cannot delete expense exp123 with status APPROVED`

- **INVALID_EXPENSE_DATA** (400)
  - Invalid data provided for expense field
  - Example: `Invalid expense data for field 'amount': Must be greater than zero`

- **UNAUTHORIZED_EXPENSE_ACCESS** (403)
  - User unauthorized to access or modify expense
  - Example: `User user123 is unauthorized to delete expense exp456`

#### Category Errors
- **CATEGORY_NOT_FOUND** (404)
  - Category with specified ID not found
  - Example: `Category with ID cat123 not found in workspace ws456`

- **CATEGORY_ALREADY_EXISTS** (409)
  - Category with name already exists
  - Example: `Category with name 'Travel' already exists in workspace ws456`

- **CATEGORY_IN_USE** (409)
  - Cannot delete category as it's in use
  - Example: `Cannot delete category cat123 as it is used by 15 expense(s). Please reassign or delete those expenses first.`

#### Tag Errors
- **TAG_NOT_FOUND** (404)
  - Tag with specified ID not found
  - Example: `Tag with ID tag123 not found in workspace ws456`

- **TAG_ALREADY_EXISTS** (409)
  - Tag with name already exists
  - Example: `Tag with name 'urgent' already exists in workspace ws456`

- **TAG_ALREADY_ASSIGNED** (409)
  - Tag already assigned to expense
  - Example: `Tag tag123 is already assigned to expense exp456`

#### Attachment Errors
- **ATTACHMENT_NOT_FOUND** (404)
  - Attachment with specified ID not found
  - Example: `Attachment with ID att123 not found`

- **ATTACHMENT_UPLOAD_ERROR** (500)
  - Failed to upload attachment
  - Example: `Failed to upload attachment: Storage service unavailable`

- **INVALID_FILE_TYPE** (400)
  - File type not allowed
  - Example: `Invalid file type 'application/exe'. Allowed types: image/jpeg, image/png, application/pdf`

- **FILE_SIZE_LIMIT_EXCEEDED** (400)
  - File size exceeds maximum limit
  - Example: `File size 15728640 bytes exceeds maximum allowed size of 10485760 bytes`

#### Recurring Expense Errors
- **RECURRING_EXPENSE_NOT_FOUND** (404)
  - Recurring expense with specified ID not found
  - Example: `Recurring expense with ID rec123 not found`

- **INVALID_RECURRENCE_PATTERN** (400)
  - Invalid recurrence pattern specified
  - Example: `Invalid recurrence pattern: End date must be after start date`

---

### Budget Management Module

#### Budget Errors
- **BUDGET_NOT_FOUND** (404)
  - Budget with specified ID not found
  - Example: `Budget with ID bud123 not found in workspace ws456`

- **BUDGET_ALREADY_EXISTS** (409)
  - Budget with name already exists
  - Example: `Budget with name 'Q1 2024' already exists in workspace ws456`

- **INVALID_BUDGET_PERIOD** (400)
  - Invalid budget period specified
  - Example: `Invalid budget period: End date must be after start date`

- **INVALID_BUDGET_STATUS** (400)
  - Invalid budget status transition
  - Example: `Cannot transition budget status from CLOSED to ACTIVE`

- **BUDGET_EXCEEDED** (400)
  - Budget has been exceeded
  - Example: `Budget bud123 has been exceeded. Allocated: 10000, Spent: 12500`

- **UNAUTHORIZED_BUDGET_ACCESS** (403)
  - Unauthorized to access or modify budget
  - Example: `Unauthorized to delete this budget`

#### Allocation Errors
- **ALLOCATION_NOT_FOUND** (404)
  - Budget allocation with specified ID not found
  - Example: `Budget allocation with ID alloc123 not found`

- **ALLOCATION_ALREADY_EXISTS** (409)
  - Allocation already exists for category
  - Example: `Budget bud123 already has an allocation for category cat456`

- **INVALID_ALLOCATION_AMOUNT** (400)
  - Allocation amount exceeds available budget
  - Example: `Allocation amount 5000 exceeds available budget 3000`

- **ALLOCATION_EXCEEDED** (400)
  - Allocation has been exceeded
  - Example: `Allocation alloc123 has been exceeded. Allocated: 2000, Spent: 2500`

#### Alert Errors
- **ALERT_NOT_FOUND** (404)
  - Budget alert with specified ID not found
  - Example: `Budget alert with ID alert123 not found`

#### Spending Limit Errors
- **SPENDING_LIMIT_NOT_FOUND** (404)
  - Spending limit with specified ID not found
  - Example: `Spending limit with ID limit123 not found`

- **SPENDING_LIMIT_EXCEEDED** (400)
  - Spending limit has been exceeded
  - Example: `Spending limit 5000 has been exceeded. Current spending: 5250`

- **SPENDING_LIMIT_ALREADY_EXISTS** (409)
  - Spending limit already exists for scope
  - Example: `A spending limit already exists for user:user123`

---

### Receipt Vault Module

#### Receipt Errors
- **RECEIPT_NOT_FOUND** (404)
  - Receipt with specified ID not found
  - Example: `Receipt with ID rec123 not found in workspace ws456`

- **DUPLICATE_RECEIPT** (409)
  - Receipt with file hash already exists
  - Example: `A receipt with file hash sha256:abc123... already exists`

- **INVALID_STATUS_TRANSITION** (400)
  - Invalid receipt status transition
  - Example: `Cannot transition receipt status from ARCHIVED to PROCESSING`

- **INVALID_RECEIPT_OPERATION** (400)
  - Cannot perform operation on receipt
  - Example: `Cannot delete: Receipt is linked to an approved expense`

- **DELETED_RECEIPT** (410)
  - Receipt has been deleted
  - Example: `Receipt rec123 has been deleted`

- **RECEIPT_VALIDATION_ERROR** (422)
  - Validation failed for receipt field
  - Example: `Validation failed for date: Date cannot be in the future`

#### Receipt Metadata Errors
- **RECEIPT_METADATA_NOT_FOUND** (404)
  - Metadata not found for receipt
  - Example: `Metadata not found for receipt rec123`

- **RECEIPT_METADATA_ALREADY_EXISTS** (409)
  - Metadata already exists for receipt
  - Example: `Metadata already exists for receipt rec123`

#### Receipt Tag Errors
- **RECEIPT_TAG_NOT_FOUND** (404)
  - Receipt tag with specified ID not found
  - Example: `Tag with ID tag123 not found in workspace ws456`

- **DUPLICATE_TAG_NAME** (409)
  - Tag with name already exists
  - Example: `Tag with name "important" already exists in workspace ws456`

#### File Errors
- **INVALID_FILE** (400)
  - Invalid file provided
  - Example: `Invalid file: File is corrupted or empty`

- **FILE_SIZE_EXCEEDED** (413)
  - File size exceeds maximum limit
  - Example: `File size 15.50MB exceeds maximum allowed size of 10.00MB`

- **INVALID_MIME_TYPE** (400)
  - MIME type not allowed
  - Example: `MIME type "application/zip" is not allowed. Allowed types: image/jpeg, image/png, application/pdf`

- **INVALID_STORAGE_PROVIDER** (400)
  - Invalid storage provider specified
  - Example: `Invalid storage provider: glacier`

---

### Notification Dispatch Module

#### Notification Errors
- **NOTIFICATION_NOT_FOUND** (404)
  - Notification with specified ID not found
  - Example: `Notification with ID notif123 not found`

- **NOTIFICATION_SEND_FAILED** (500)
  - Failed to send notification
  - Example: `Failed to send notification via EMAIL: SMTP connection timeout`

- **INVALID_NOTIFICATION_DATA** (400)
  - Invalid notification data provided
  - Example: `Invalid notification data: title - Title cannot be empty`

- **INVALID_ID_FORMAT** (400)
  - Invalid ID format provided
  - Example: `Invalid notification ID format: not-a-uuid`

#### Template Errors
- **NOTIFICATION_TEMPLATE_NOT_FOUND** (404)
  - No active template found for type and channel
  - Example: `No active template found for type 'EXPENSE_APPROVED' and channel 'EMAIL'`

- **TEMPLATE_NOT_FOUND** (404)
  - Template with specified ID not found
  - Example: `Notification template with ID tmpl123 not found`

#### Preference Errors
- **NOTIFICATION_PREFERENCE_NOT_FOUND** (404)
  - Notification preferences not found
  - Example: `Notification preferences not found for user user123 in workspace ws456`

---

### Identity & Workspace Module

#### User Errors
- **USER_NOT_FOUND** (404)
  - User with specified identifier not found
  - Example: `User user123 not found`

- **USER_ALREADY_EXISTS** (409)
  - User with email already exists
  - Example: `User with email 'john@example.com' already exists`

- **INVALID_CREDENTIALS** (401)
  - Invalid email or password
  - Example: `Invalid email or password`

- **EMAIL_NOT_VERIFIED** (403)
  - Email address not verified
  - Example: `Email address has not been verified`

- **USER_INACTIVE** (403)
  - User account is inactive
  - Example: `User account is inactive`

#### Workspace Errors
- **WORKSPACE_NOT_FOUND** (404)
  - Workspace with specified identifier not found
  - Example: `Workspace ws123 not found`

- **WORKSPACE_ALREADY_EXISTS** (409)
  - Workspace with slug already exists
  - Example: `Workspace with slug 'acme-corp' already exists`

- **WORKSPACE_INACTIVE** (403)
  - Workspace is inactive
  - Example: `Workspace ws123 is inactive`

#### Membership Errors
- **MEMBERSHIP_NOT_FOUND** (404)
  - Membership not found
  - Example: `Membership for user user123 in workspace ws456 not found`

- **MEMBERSHIP_ALREADY_EXISTS** (409)
  - User already a member of workspace
  - Example: `User user123 is already a member of workspace ws456`

- **INSUFFICIENT_PERMISSIONS** (403)
  - Insufficient permissions to perform operation
  - Example: `Insufficient permissions to delete workspace`

- **CANNOT_REMOVE_OWNER** (400)
  - Cannot remove workspace owner
  - Example: `Cannot remove the workspace owner. Transfer ownership first.`

#### Invitation Errors
- **INVITATION_NOT_FOUND** (404)
  - Invitation with token not found
  - Example: `Invitation with token abc123 not found`

- **INVITATION_EXPIRED** (400)
  - Invitation has expired
  - Example: `Invitation has expired`

- **INVITATION_ALREADY_ACCEPTED** (400)
  - Invitation already accepted
  - Example: `Invitation has already been accepted`

#### Session Errors
- **SESSION_NOT_FOUND** (401)
  - Session not found or expired
  - Example: `Session not found or expired`

- **SESSION_EXPIRED** (401)
  - Session has expired
  - Example: `Session has expired`

---

## Usage Examples

### Frontend Error Handling

```typescript
try {
  await api.createExpense(expenseData);
} catch (error) {
  if (error.code === 'EXPENSE_ALREADY_EXISTS') {
    showNotification('This expense already exists', 'warning');
  } else if (error.code === 'UNAUTHORIZED_EXPENSE_ACCESS') {
    redirectToLogin();
  } else {
    showNotification(error.message, 'error');
  }
}
```

### Internationalization (i18n)

```typescript
// en.json
{
  "errors": {
    "EXPENSE_NOT_FOUND": "Expense not found",
    "CATEGORY_ALREADY_EXISTS": "Category already exists",
    "BUDGET_EXCEEDED": "Budget limit exceeded"
  }
}

// Error handler
const errorMessage = t(`errors.${error.code}`, { defaultValue: error.message });
```

### Analytics Tracking

```typescript
analytics.track('api_error', {
  code: error.code,
  statusCode: error.statusCode,
  endpoint: '/api/v1/expenses',
  userId: currentUser.id
});
```

---

## Best Practices

1. **Always check error codes** - Use `error.code` for programmatic error handling
2. **Fallback to message** - Display `error.message` if error code is unknown
3. **Log errors** - Track all errors for monitoring and debugging
4. **User-friendly messages** - Map error codes to user-friendly messages in your UI
5. **Retry logic** - Implement automatic retries for 5xx errors
6. **Rate limiting** - Handle 429 errors with exponential backoff

---

## HTTP Status Code Reference

- **200** - Success
- **400** - Bad Request (invalid data, validation errors)
- **401** - Unauthorized (authentication required)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found (resource doesn't exist)
- **409** - Conflict (duplicate resource, state conflict)
- **410** - Gone (resource permanently deleted)
- **413** - Payload Too Large (file size exceeded)
- **422** - Unprocessable Entity (validation failed)
- **500** - Internal Server Error (server-side error)

---

**Last Updated:** 2026-01-27
**API Version:** 1.0.0
