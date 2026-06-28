# 🎨 Frontend Reconstruction & Integration Plan

This document details the blueprint for rebuilding the Next.js frontend ([apps/web](file:///c:/Users/TASHEEN/Desktop/Projects/Expense-Tracker-Application/apps/web)) from scratch to integrate with our 8 microservices through the API Gateway (port `3001`). 

The plan maps the 14 domain modules into user-facing features, outlining data requirements, routing layouts, and custom code generation prompts for each.

---

## User Review Required

> [!IMPORTANT]
> - **Gateway Routing Prefix**: All client-side requests must target the unified API Gateway at `http://localhost:3001` using prefix-rewritten routes:
>   * Authentication & Workspaces $\rightarrow$ `/api/v1/auth`, `/api/v1/workspaces`, `/api/v1/users`
>   * Expense Ledger, Budgets & Inventory $\rightarrow$ `/api/v1/expenses`, `/api/v1/budgets`, `/api/v1/budget-plans`, `/api/v1/departments`, `/api/v1/cost-centers`, `/api/v1/projects`, `/api/v1/inventory`
>   * Categorization Rules $\rightarrow$ `/api/v1/category-rules`
>   * Approvals & Policies $\rightarrow$ `/api/v1/approval-chains`, `/api/v1/expense-policies`
>   * Bank Feeds $\rightarrow$ `/api/v1/bank-feeds`
>   * Receipt Vault $\rightarrow$ `/api/v1/receipts`
>   * Notifications $\rightarrow$ `/api/v1/notifications`
>   * Audit Log $\rightarrow$ `/api/v1/audit-logs`
> - **Header Propagation**: Downstream authentication is handled implicitly by the API Gateway. The frontend is only responsible for sending the standard `Authorization: Bearer <token>` header on requests. The gateway will decode it and forward the respective `x-user-id` and `x-workspace-id` headers.

---

## Bounded Contexts & Features Mapping

Below is the conceptual structure of the frontend features directory:

```
apps/web/features/
├── auth/                       # Register, Login, Protected Route Guard, AuthContext
├── identity-workspace/         # Workspace Switcher, Invitations, User Account Profile
├── expense-ledger/             # Expenses, Categories, Tags, Recurrence, Splitting
├── budget-management/          # Budgets Tracker, Category Allocations, Alerts
├── budget-planning/            # Long-term Forecasting, What-if Scenarios
├── cost-allocation/            # Cost Centers, Departments, Project allocations
├── inventory-management/        # Warehouses, Stock board, Supplier PO manager
├── categorization-rules/       # Smart Rules Builder, Auto-categorize Logs
├── approval-workflow/          # Approvals Inbox, Chain setup
├── policy-controls/            # Violation Alerts, Exemption Request forms
├── bank-feed-sync/             # Bank connection manager, Transaction matching
├── receipt-vault/              # Drag-and-drop uploader, Metadata review, OCR editor
├── notification-dispatch/      # Preferences settings, In-app inbox
└── audit-compliance/           # Admin compliance logs search board
```

---

# Modular Code Generation Prompts

These prompts are designed to be copied directly and run in sequence to build out each feature cleanly.

---

### 🔑 Prompt 1: Authentication & Workspace Context (Identity Access Service)
```markdown
Context: Next.js App Router workspace using TailwindCSS, TanStack React Query, and Zustand.
Target Directory: apps/web/features/auth/ & apps/web/features/identity-workspace/

Build the Core Authentication and Workspace management features.

1. Implement auth.api.ts under features/auth/api/:
   - POST /api/v1/auth/register (fullName, email, password)
   - POST /api/v1/auth/login (email, password) -> returns JWT token and user info.
   - GET /api/v1/auth/me (Get current profile, requires Authorization header).
   - POST /api/v1/auth/logout

2. Implement a Zustand global store or React Context (AuthContext.tsx) to manage:
   - Current user details, login state, and JWT storage in localStorage.
   - Current active workspaceId. When switched, update state and attach it to API request headers.

3. Create UI Components using Lucide React, Shadcn/Radix primitives, and Tailwind CSS:
   - RegisterForm.tsx: Input validations, API handling, redirect to Login.
   - LoginForm.tsx: Standard credentials form, saves token, redirects to dashboard.
   - WorkspaceSwitcher.tsx: Dropdown in the main sidebar listing user's workspaces. Allows creating a new workspace (POST /api/v1/workspaces) and switching active context.
   - WorkspaceInvitations.tsx: Tab under Workspace Settings. Lists active members, pending invitations, and a form to invite a user by email with role assignment (ADMIN, MEMBER, VIEWER).

4. Create Guard Components:
   - ProtectedRoute.tsx: Checks for token, redirects to /login if empty, displays loading state.
   - PublicRoute.tsx: Redirects already-logged-in users away from /login and /register back to /workspaces.
```

---

### 💵 Prompt 2: Expense Center & Splits (Expense Budgeting Service)
```markdown
Context: Next.js App Router workspace.
Target Directory: apps/web/features/expense-ledger/

Build the core Expense Ledger, Tags, Categories, and Splitting modules.

1. Implement expenses.api.ts:
   - GET /api/v1/expenses (supports page, limit, search, status, categoryId, startDate, endDate).
   - POST /api/v1/expenses (title, description, amount, currency, categoryId, merchant, paymentMethod, isReimbursable).
   - PUT /api/v1/expenses/:id
   - DELETE /api/v1/expenses/:id
   - POST /api/v1/expenses/:id/submit (submits expense for approval)
   - GET /api/v1/expenses/categories & POST /api/v1/expenses/categories
   - GET /api/v1/expenses/tags & POST /api/v1/expenses/tags
   - GET /api/v1/expenses/splits/:expenseId & POST /api/v1/expenses/splits (paidBy, splitType: EQUAL/EXACT/PERCENTAGE, participants: Array<{userId, shareAmount, sharePercentage}>).
   - GET /api/v1/expenses/splits/balances (who owes whom in the workspace)
   - POST /api/v1/expenses/splits/settle/:settlementId (records payment settlement)

2. Create UI Components:
   - ExpenseList.tsx: Beautiful grid/table with status badges (DRAFT, SUBMITTED, APPROVED, REJECTED, REIMBURSED). Features multi-filters, sorting, and pagination.
   - ExpenseForm.tsx: Dialog to create/edit expenses. Dropdowns for category, payment method, tags. File uploader for attachments.
   - CategoryManager.tsx: Modal to define categories with colors (HEX picker) and icons.
   - ExpenseSplitter.tsx: Component built into the Expense details sidebar. Allows selecting participants in the workspace and splitting the cost using equal, percentage, or exact values. Displays visual balance breakdowns.
   - SettlementLedger.tsx: Dashboard widget detailing outstanding balances with a "Settle Balance" button.
```

---

### 📊 Prompt 3: Budgets Tracker & Spending Limits (Expense Budgeting Service)
```markdown
Context: Next.js App Router workspace.
Target Directory: apps/web/features/budget-management/

Build the Budgeting, Allocations, Alerts, and Spending Limits dashboard.

1. Implement budget.api.ts:
   - GET /api/v1/budgets (lists active/draft budgets).
   - POST /api/v1/budgets (name, totalAmount, periodType: MONTHLY/QUARTERLY/YEARLY, startDate, endDate, isRecurring).
   - GET /api/v1/budgets/:id/allocations & POST /api/v1/budgets/:id/allocations (categoryId, allocatedAmount).
   - GET /api/v1/budgets/alerts/unread (lists warnings where spending is close to/over thresholds).
   - GET /api/v1/budgets/spending-limits & POST /api/v1/budgets/spending-limits (userId, categoryId, limitAmount, periodType).

2. Create UI Components:
   - BudgetTracker.tsx: Financial overview panel. Progress bars comparing actual spent vs. total budget. 
   - AllocationGrid.tsx: Table listing all categories, their allocated budget, and spent-to-date percentages. Visual bars color-coded from Green (0-75%) to Yellow (75-99%) to Red (100%+).
   - BudgetAlertsPanel.tsx: Toast alerts and dashboard feed showing critical warnings (e.g. "Software budget exceeded 120%").
   - SpendingLimitsManager.tsx: Form to configure corporate spending policies (e.g. "Limit user John to $500 monthly on Meals").
```

---

### 🔮 Prompt 4: Budget Forecasting & Scenarios (Expense Budgeting Service)
```markdown
Context: Next.js App Router workspace.
Target Directory: apps/web/features/budget-planning/

Build the Budget Planning, Forecasting, and What-if Scenario features.

1. Implement budget-planning.api.ts:
   - GET /api/v1/budget-plans (lists all plans).
   - POST /api/v1/budget-plans (name, description, periodType, startDate, endDate).
   - GET /api/v1/budget-plans/:id/forecasts & POST /api/v1/budget-plans/:id/forecasts (type: BASELINE/OPTIMISTIC/PESSIMISTIC, items: Array<{categoryId, amount}>).
   - GET /api/v1/budget-plans/:id/scenarios & POST /api/v1/budget-plans/:id/scenarios (name, assumptions: Json).

2. Create UI Components:
   - BudgetPlanningBoard.tsx: Interface to view and edit long-term plans.
   - ForecastChart.tsx: Line/Bar chart (using Recharts) overlaying baseline, optimistic, and pessimistic projections against actual spending curves.
   - ScenarioEvaluator.tsx: Form to construct scenarios. Allows inputting percentages (e.g. "Assume Travel costs rise 25%" or "Assume Cloud bills drop 10%") and instantly renders projected expense changes.
```

---

### 🏢 Prompt 5: Cost Allocations (Expense Budgeting Service)
```markdown
Context: Next.js App Router workspace.
Target Directory: apps/web/features/cost-allocation/

Build corporate structure mapping (Departments, Cost Centers, Projects) and cost splitting.

1. Implement cost-allocation.api.ts:
   - GET/POST /api/v1/departments (id, name, code, parentDepartmentId).
   - GET/POST /api/v1/cost-centers (id, name, code).
   - GET/POST /api/v1/projects (id, name, code, budget, startDate, endDate).
   - GET /api/v1/expenses/:id/allocations & POST /api/v1/expenses/:id/allocations (allocations: Array<{departmentId, costCenterId, projectId, amount, percentage}>).

2. Create UI Components:
   - CorporateStructure.tsx: Interactive organizational chart displaying nested departments and active managers.
   - CostCenterTable.tsx: Grid showing active cost centers, project links, and total accumulated charges.
   - AllocationSplitter.tsx: Dropdown panel in the expense-entry wizard. Allows allocating a single bill (e.g. a $10,000 server bill) across multiple departments (e.g. 70% to R&D, 30% to Marketing) by entering percentage or cash allocations.
```

---

### 📦 Prompt 6: Inventory Stock & Suppliers (Expense Budgeting Service)
```markdown
Context: Next.js App Router workspace.
Target Directory: apps/web/features/inventory-management/

Build the warehouse, stock boards, and supplier purchase orders portal.

1. Implement inventory.api.ts:
   - GET /api/v1/inventory/locations (lists warehouses, stores).
   - GET /api/v1/inventory/stock (lists stocks: variantId, quantity, reservedQuantity, reorderLevel).
   - GET /api/v1/inventory/suppliers (lists active suppliers).
   - POST /api/v1/inventory/purchase-orders (supplierId, orderDate, expectedDate, notes, items: Array<{variantId, variantName, quantity, unitPrice}>).
   - GET /api/v1/inventory/purchase-orders/:id
   - POST /api/v1/inventory/purchase-orders/:id/receive (receivedQuantity updates).

2. Create UI Components:
   - StockBoard.tsx: Inventory grid. Highlights items where `quantity <= reorderLevel` with amber indicators. Shows reserved vs. available quantities.
   - SupplierPortal.tsx: Tab directory managing supplier contact profiles, active catalog pricing, and historical purchase orders.
   - PurchaseOrderWizard.tsx: Dynamic step-form to construct lines of purchase orders. Displays calculated sums and sends orders.
   - POReceiptForm.tsx: Form to check off delivered quantities when a shipment arrives at the warehouse, updating physical stock levels.
```

---

### 🧠 Prompt 7: Categorization Rules (Categorization Service)
```markdown
Context: Next.js App Router workspace.
Target Directory: apps/web/features/categorization-rules/

Build the smart rules engine builder and AI category suggestions panel.

1. Implement category-rules.api.ts:
   - GET /api/v1/category-rules (lists active categorization rules).
   - POST /api/v1/category-rules (name, conditionType: MERCHANT_CONTAINS/AMOUNT_GREATER_THAN/etc, conditionValue, targetCategoryId, priority).
   - DELETE /api/v1/category-rules/:id
   - GET /api/v1/category-rules/suggestions (lists AI-driven recommendations: expenseId, suggestedCategoryId, confidence, reason).
   - POST /api/v1/category-rules/suggestions/respond (expenseId, suggestedCategoryId, isAccepted).

2. Create UI Components:
   - RulesBuilder.tsx: Form to define rules using dynamic sentences (e.g. "When [Merchant] [Contains] [AWS], allocate to category [Software]").
   - SuggestionBanner.tsx: Alert banner shown on the dashboard or single expense page prompting the user: "We detected this is a Software purchase (95% confidence). [Accept Category] / [Ignore]".
   - RulesExecutionHistory.tsx: Log table showing executed rule actions on incoming transactions.
```

---

### 🚦 Prompt 8: Approval Workflows & Policies (Approval Policy Service)
```markdown
Context: Next.js App Router workspace.
Target Directory: apps/web/features/approval-workflow/ & apps/web/features/policy-controls/

Build the Manager Approvals Portal, approval chain configurations, and Policy compliance desk.

1. Implement approvals.api.ts:
   - GET /api/v1/approval-chains (lists active chains).
   - POST /api/v1/approval-chains (name, minAmount, maxAmount, categoryIds, requiresReceipt, approverSequence: string[]).
   - GET /api/v1/approval-chains/inbox (lists pending approval steps for the current manager user).
   - POST /api/v1/approval-chains/steps/:id/process (status: APPROVED/REJECTED/DELEGATED, comments, delegatedTo).
   - GET /api/v1/approval-chains/policies/violations/:expenseId (lists violations found).
   - POST /api/v1/approval-chains/policies/exemptions (policyId, userId, reason, validFrom, validUntil).

2. Create UI Components:
   - ApprovalsInbox.tsx: A dedicated portal for team managers. Lists expenses awaiting their signature. Shows expense receipt preview, title, amount, and policy violation details.
   - ApprovalDetailsPanel.tsx: Side sheet enabling quick action: Approve, Reject (with required comment), or Delegate to another teammate. Shows historical steps of the chain.
   - ChainConfigurator.tsx: Drag-and-drop approver card builder. Set conditional thresholds (e.g. "Requires VP Approval if amount > $5,000").
   - PolicyViolationIndicator.tsx: Warning widget highlighting violations (e.g. "No Receipt attached! Violation of Policy standard 10"). Link to open the Exemption Request form.
```

---

### 🏦 Prompt 9: Bank Feed Sync (Bank Feed Service)
```markdown
Context: Next.js App Router workspace.
Target Directory: apps/web/features/bank-feed-sync/

Build the bank connection manager and transaction reconciliation workspace.

1. Implement bank-feed.api.ts:
   - GET /api/v1/bank-feeds/connections (lists connected banks/accounts).
   - POST /api/v1/bank-feeds/connections (institutionId, institutionName, accessToken, etc.).
   - DELETE /api/v1/bank-feeds/connections/:id
   - POST /api/v1/bank-feeds/connections/:id/sync (manually starts sync).
   - GET /api/v1/bank-feeds/transactions (lists imported statements: externalId, amount, description, status: PENDING/MATCHED/IMPORTED).
   - POST /api/v1/bank-feeds/transactions/:id/match (expenseId) -> matches statement with expense.

2. Create UI Components:
   - BankConnectionManager.tsx: Grid displaying connected accounts, masks (e.g. Chase ****1234), last sync timestamp, and current health status. Link to trigger OAuth/Plaid login.
   - ReconciliationBoard.tsx: Split-pane workspace. 
     - Left side: List of imported bank transactions.
     - Right side: Matching suggestion cards (e.g. "We found a matching cash expense of $42.50 on 2026-06-20. [Match Transaction] / [Create New Expense]").
```

---

### 📂 Prompt 10: Receipt Vault (Receipt Vault Service)
```markdown
Context: Next.js App Router workspace.
Target Directory: apps/web/features/receipt-vault/

Build the secure receipt uploader, file list, and OCR data reviewer.

1. Implement receipts.api.ts:
   - GET /api/v1/receipts (lists uploads, status: PENDING/PROCESSING/PROCESSED/FAILED).
   - POST /api/v1/receipts/upload (FormData upload: file).
   - GET /api/v1/receipts/:id/metadata (returns OCR results).
   - PUT /api/v1/receipts/:id/metadata (manually overrides/saves metadata details).
   - DELETE /api/v1/receipts/:id

2. Create UI Components:
   - ReceiptGrid.tsx: Gallery view of receipts with thumbnails, processing loading spinners, and error alerts.
   - DragAndDropUploader.tsx: Drop zone area that triggers bulk uploads with status bars.
   - OCRReviewForm.tsx: Split screen workspace:
     - Left pane: Interactive PDF/Image viewer with zoom.
     - Right pane: Structured form containing extracted fields (merchant, total, subtotal, date, line items). Extracted values are highlighted; editable input fields let the user confirm or correct OCR details.
```

---

### 🔔 Prompt 11: Notification Dispatch (Notification Service)
```markdown
Context: Next.js App Router workspace.
Target Directory: apps/web/features/notification-dispatch/

Build the In-app notification bell inbox and personal alert preferences manager.

1. Implement notifications.api.ts:
   - GET /api/v1/notifications (lists in-app notifications).
   - POST /api/v1/notifications/:id/read (marks notification read).
   - POST /api/v1/notifications/read-all
   - GET /api/v1/notifications/preferences & PUT /api/v1/notifications/preferences (emailEnabled, inAppEnabled, pushEnabled).

2. Create UI Components:
   - NotificationBell.tsx: Bell icon with red notification bubble showing count. Opens an overlay card listing recent items. Direct links to corresponding pages (e.g. click "Approval Request" opens the approvals detail view).
   - PreferenceCenter.tsx: Matrix layout of toggles where users can choose channels for each notification type (e.g. receive "Budget Alert" via both email and in-app, but only "Expense Approved" via in-app).
```

---

### 🕵️ Prompt 12: Audit logs (Audit Service)
```markdown
Context: Next.js App Router workspace.
Target Directory: apps/web/features/audit-compliance/

Build the compliance auditing panel for administrators.

1. Implement audit.api.ts:
   - GET /api/v1/audit-logs (lists logs with filters: action, userId, entityType, startDate, endDate).
   - GET /api/v1/audit-logs/export (triggers CSV export download).

2. Create UI Components:
   - AuditLogTable.tsx: Admin page displaying event lists, timestamps, actions (e.g. "USER_LOGIN", "EXPENSE_APPROVED"), IP addresses, and browsers. Columns are filterable and searchable.
   - LogDetailsModal.tsx: Dialog presenting the JSON payload before/after state diffs (e.g. what fields were updated in a budget).
```

---

## Reconstruction Steps

### Step 1: Foundation Setup
1. Define unified axios/fetch config in [lib/api-client.ts](file:///c:/Users/TASHEEN/Desktop/Projects/Expense-Tracker-Application/apps/web/lib/api-client.ts) attaching auth headers and mapping gateway base URL.
2. Initialize Zustand globally for user state and workspace selection.
3. Build the core layout with Sidebar (navigation, workspace switcher) and Header (notification bell, user profile).

### Step 2: Feature Rebuilding
Execute prompts **1 through 12** sequentially. Rebuild the folder structures strictly under the `features/` directory following modular boundaries.

### Step 3: Route Integration
Update App Router pages (under `apps/web/app/`) to consume feature exports, keeping route logic lightweight:
- `/login`, `/register` $\rightarrow$ Render public forms wrapped in `PublicRoute`.
- `/workspaces` $\rightarrow$ Lists user workspaces.
- `/workspaces/[workspaceId]` $\rightarrow$ Dashboard layout wrapped in `ProtectedRoute`, showing financial charts, inbox alerts, and sub-module router links.

---

## Verification Plan

### Automated Checks
* Clean build and type compilation checks:
  ```bash
  pnpm --filter @expense-tracker/web type-check
  pnpm --filter @expense-tracker/web build
  ```

### Manual Visual Checks
* Log in, create a workspace, switch active workspace, and verify context headers populate Gateway requests.
* Upload a receipt file, verify progress status shifts from PENDING to PROCESSING to PROCESSED, and check OCR field rendering.
* Create a budget allocation, submit a test expense exceeding that category, and verify a real-time Budget Alert notification renders.
