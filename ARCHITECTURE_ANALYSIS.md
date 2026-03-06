# Expense Tracker - Complete Architecture Analysis

## Executive Summary

This document provides a comprehensive analysis of both **backend** and **frontend** implementations for the Expense Tracker application, identifying gaps, integration points, and development priorities.

---

## Backend Architecture

### Technology Stack
- **Framework**: Fastify (Node.js)
- **Architecture**: Domain-Driven Design (DDD) with Event Sourcing
- **Database**: PostgreSQL with Prisma ORM
- **Pattern**: Modular Monolith with 13 bounded contexts
- **Authentication**: JWT-based session management

### 13 Backend Modules

| # | Module | Purpose | Key Entities | Status |
|---|--------|---------|--------------|--------|
| 1 | **Identity-Workspace** | Authentication & Multi-tenancy | UserAccount, Workspace, Membership | ✅ Core |
| 2 | **Expense-Ledger** | Core expense tracking | Expense, Category, Tag, Attachment | ✅ Core |
| 3 | **Budget-Management** | Budget tracking & alerts | Budget, Allocation, Alert, SpendingLimit | ✅ Core |
| 4 | **Approval-Workflow** | Multi-step approvals | ApprovalChain, Workflow, Step | ✅ Core |
| 5 | **Receipt-Vault** | Document storage & OCR | Receipt, Metadata, Tags | 🔧 Enhanced |
| 6 | **Categorization-Rules** | Auto-categorization | CategoryRule, Suggestion | 🔧 Enhanced |
| 7 | **Cost-Allocation** | Org structure & allocation | Department, CostCenter, Project | 🔧 Enhanced |
| 8 | **Budget-Planning** | Strategic planning | BudgetPlan, Forecast, Scenario | 🔧 Enhanced |
| 9 | **Notification-Dispatch** | Multi-channel notifications | Notification, Template, Preference | 🔧 Cross-cutting |
| 10 | **Policy-Controls** | Compliance enforcement | Policy, Violation, Exemption | 🔧 Enhanced |
| 11 | **Bank-Feed-Sync** | Bank integration | BankConnection, SyncSession | 🔧 Enhanced |
| 12 | **Audit-Compliance** | Audit logging | AuditLog | 🔧 Cross-cutting |
| 13 | **Event-Outbox** | Event sourcing | OutboxEvent | 🔧 Infrastructure |

### Key API Endpoints

#### Authentication (`/api/v1`)
```
POST   /auth/register         - User registration
POST   /auth/login            - User login (returns JWT)
GET    /auth/me               - Current user info
```

#### Workspaces (`/api/v1`)
```
POST   /workspaces            - Create workspace
GET    /workspaces            - List user's workspaces
GET    /workspaces/:id        - Get workspace details
PUT    /workspaces/:id        - Update workspace
DELETE /workspaces/:id        - Delete workspace
```

#### Expenses (`/api/v1/:workspaceId`)
```
POST   /expenses              - Create expense
GET    /expenses              - List expenses (paginated)
GET    /expenses/:id          - Get expense details
PUT    /expenses/:id          - Update expense
DELETE /expenses/:id          - Delete expense
GET    /expenses/filter       - Advanced filtering
GET    /expenses/statistics   - Dashboard stats
POST   /expenses/:id/submit   - Submit for approval
POST   /expenses/:id/approve  - Approve expense
POST   /expenses/:id/reject   - Reject expense
```

#### Approvals (`/api/v1/:workspaceId`)
```
GET    /workflows/pending-approvals  - List pending approvals
POST   /workflows/:id/approve        - Approve expense
POST   /workflows/:id/reject         - Reject expense
GET    /workflows/:id                - Get workflow details
```

#### Categories (`/api/v1/:workspaceId`)
```
POST   /categories            - Create category
GET    /categories            - List categories
PUT    /categories/:id        - Update category
DELETE /categories/:id        - Delete category
```

### Database Schema Highlights

**Expense Entity:**
```typescript
{
  id: string (UUID)
  workspaceId: string (UUID)
  userId: string (UUID)
  title: string              // ⚠️ Frontend uses "subject"
  description: string | null
  amount: Decimal(12,2)
  currency: string (3 chars)
  expenseDate: Date          // ⚠️ Frontend uses "date"
  categoryId: string | null
  merchant: string | null
  paymentMethod: PaymentMethod
  isReimbursable: boolean
  status: ExpenseStatus      // ⚠️ Frontend has different values
  createdAt: DateTime
  updatedAt: DateTime
}
```

**ExpenseStatus Enum:**
```
DRAFT | SUBMITTED | APPROVED | REJECTED | REIMBURSED
```

**PaymentMethod Enum:**
```
CASH | CREDIT_CARD | DEBIT_CARD | BANK_TRANSFER | CHECK | DIGITAL_WALLET | OTHER
```

---

## Frontend Architecture

### Technology Stack
- **Framework**: Next.js 14.2 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + CSS Variables
- **UI Library**: shadcn/ui (Radix UI primitives)
- **State Management**: React Query v5.28 (TanStack Query)
- **HTTP Client**: ky (via @expense-tracker/api-client)
- **Icons**: lucide-react
- **Charts**: Recharts

### Current Pages

| Route | Status | Data Source | Integration Level |
|-------|--------|-------------|-------------------|
| `/` | ✅ Complete | Static | N/A |
| `/(public)/login` | ❌ Stub | None | **0%** |
| `/(public)/register` | ❌ Stub | None | **0%** |
| `/(dashboard)/workspaces/[id]` | ✅ Built | Mock | **0%** |
| `/(dashboard)/workspaces/[id]/expenses` | ✅ Built | Mock | **0%** |
| `/(dashboard)/workspaces/[id]/approvals` | ✅ Built | Mock | **0%** |
| `/(dashboard)/workspaces/[id]/trips` | ❌ Missing | None | **0%** |
| `/(dashboard)/workspaces/[id]/settings` | ❌ Missing | None | **0%** |

### Component Inventory

**UI Components (shadcn/ui):**
- ✅ Button, Card, Badge, Input, Label
- ✅ Select, Dialog, Checkbox, Avatar
- ✅ Toaster (configured, not used)

**Custom Components:**
- ✅ AppLayout - Dashboard wrapper with sidebar
- ✅ Sidebar - Navigation (workspaceId hardcoded to "demo-workspace")
- ✅ MetricCard - Dashboard metrics display
- ✅ SpendingChart - Area chart (Recharts)
- ✅ CategoryChart - Pie chart (Recharts)
- ✅ RecentExpenses - Recent expenses table
- ✅ ExpenseForm - Create/edit expense modal with file upload
- ✅ ApprovalModal - Approval details and actions

### State Management

**React Query Setup:**
```typescript
// providers/index.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,  // 60 seconds
      retry: 1,
    },
  },
});
```

**Zustand:**
- Installed but not configured
- Store directory is empty (.gitkeep only)

**Current State Handling:**
- ✅ React Query provider configured
- ❌ No API queries implemented
- ❌ No authentication state
- ❌ No workspace context
- ✅ Local component state only

### Environment Configuration

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

---

## Critical Gaps & Mismatches

### 1. Field Name Mismatches

| Frontend | Backend | Action Required |
|----------|---------|-----------------|
| `subject` | `title` | Rename to `title` |
| `date` | `expenseDate` | Rename to `expenseDate` |
| Status: `"not-submitted"` | `"DRAFT"` | Use backend enum values |
| Status: `"submitted"` | `"SUBMITTED"` | Already matches |

### 2. Missing Type Definitions

**Need to Create:**
```typescript
// types/expense.ts
export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REIMBURSED = 'REIMBURSED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  OTHER = 'OTHER'
}

export interface Expense {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  expenseDate: string; // ISO date
  categoryId: string | null;
  merchant: string | null;
  paymentMethod: PaymentMethod;
  isReimbursable: boolean;
  status: ExpenseStatus;
  createdAt: string;
  updatedAt: string;
}
```

### 3. Authentication Flow (CRITICAL)

**Current State:** ❌ **NOT IMPLEMENTED**

**Backend Ready:**
- ✅ `/auth/register` endpoint
- ✅ `/auth/login` endpoint (returns JWT)
- ✅ JWT validation middleware
- ✅ AuthSession storage

**Frontend Missing:**
- ❌ Login form component
- ❌ Register form component
- ❌ Token storage (localStorage/cookies)
- ❌ Auth context provider
- ❌ Protected route middleware
- ❌ Session management

**Middleware Status:**
```typescript
// middleware.ts - Currently DISABLED
export default async function middleware(request: NextRequest) {
  // TODO: Temporarily disabled for development
  return NextResponse.next();
}
```

### 4. API Integration (CRITICAL)

**Current State:** ❌ **0% INTEGRATION**

All pages use hardcoded mock data:
```typescript
// ❌ Current: Mock data
const mockExpenses: Expense[] = [
  { id: '1', date: '09/11/2022', subject: 'Food Catering', ... }
];

// ✅ Should be: API integration
const { data: expenses } = useQuery({
  queryKey: ['expenses', workspaceId],
  queryFn: () => api.get(`/${workspaceId}/expenses`)
});
```

### 5. Missing Backend Features in Frontend

**Not Implemented:**
- ❌ Budget Management (13 backend endpoints available)
- ❌ Receipt Vault (document upload/OCR)
- ❌ Categorization Rules (auto-categorization)
- ❌ Cost Allocation (departments, projects, cost centers)
- ❌ Budget Planning (forecasts, scenarios)
- ❌ Notifications (in-app, email, push)
- ❌ Policy Controls (policy violations, exemptions)
- ❌ Bank Feed Sync (bank integration)
- ❌ Audit Logs (compliance tracking)

---

## Development Priorities

### Phase 1: Foundation (Week 1-2) ⚡ HIGH PRIORITY

#### 1.1 TypeScript Types
- [ ] Create types from Prisma schema
- [ ] Define API response interfaces
- [ ] Create shared validation schemas
- [ ] Set up type generation from OpenAPI

**Deliverables:**
- `types/expense.ts`
- `types/approval.ts`
- `types/user.ts`
- `types/workspace.ts`
- `types/api.ts`

#### 1.2 Authentication Implementation
- [ ] Build login page with form validation
- [ ] Build register page with form validation
- [ ] Create auth context provider
- [ ] Implement JWT token storage
- [ ] Enable protected route middleware
- [ ] Add token refresh logic

**Deliverables:**
- `features/auth/components/LoginForm.tsx`
- `features/auth/components/RegisterForm.tsx`
- `features/auth/hooks/useAuth.ts`
- `features/auth/context/AuthContext.tsx`
- `middleware.ts` (enabled)

#### 1.3 API Client Enhancement
- [ ] Generate types from OpenAPI schema
- [ ] Create typed API methods
- [ ] Add error handling
- [ ] Add request/response interceptors
- [ ] Create React Query hooks

**Deliverables:**
- `packages/api-client/src/types.ts` (generated)
- `packages/api-client/src/expenses.ts`
- `packages/api-client/src/approvals.ts`
- `packages/api-client/src/auth.ts`

### Phase 2: Core Features (Week 3-4) 📊 HIGH PRIORITY

#### 2.1 Expenses Feature Integration
- [ ] Create expense queries (list, get, filter, stats)
- [ ] Create expense mutations (create, update, delete, submit)
- [ ] Update ExpensesPage with real API data
- [ ] Update ExpenseForm to submit to API
- [ ] Add error handling and loading states
- [ ] Implement pagination
- [ ] Add optimistic updates

**Deliverables:**
- `features/expenses/hooks/useExpenses.ts`
- `features/expenses/hooks/useCreateExpense.ts`
- `features/expenses/hooks/useUpdateExpense.ts`
- Updated `apps/web/app/(dashboard)/workspaces/[workspaceId]/expenses/page.tsx`

#### 2.2 Approvals Feature Integration
- [ ] Create approval queries (pending, workflow details)
- [ ] Create approval mutations (approve, reject, delegate)
- [ ] Update ApprovalsPage with real API data
- [ ] Update ApprovalModal with API actions
- [ ] Add workflow step visualization
- [ ] Add approval history timeline

**Deliverables:**
- `features/approvals/hooks/useApprovals.ts`
- `features/approvals/hooks/useApproveExpense.ts`
- Updated `apps/web/app/(dashboard)/workspaces/[workspaceId]/approvals/page.tsx`

#### 2.3 Dashboard Integration
- [ ] Create dashboard statistics query
- [ ] Integrate spending chart with real data
- [ ] Integrate category chart with real data
- [ ] Integrate recent expenses with real data
- [ ] Add date range selector
- [ ] Add currency selector

**Deliverables:**
- `features/dashboard/hooks/useDashboardStats.ts`
- Updated `apps/web/app/(dashboard)/workspaces/[workspaceId]/page.tsx`

### Phase 3: Enhanced Features (Week 5-6) 🔧 MEDIUM PRIORITY

#### 3.1 Categories Management
- [ ] Build categories management page
- [ ] Create category CRUD operations
- [ ] Add category color picker
- [ ] Add category icon selector

#### 3.2 Tags Management
- [ ] Build tags management page
- [ ] Create tag CRUD operations
- [ ] Add tag assignment UI

#### 3.3 Budget Management
- [ ] Build budget overview page
- [ ] Build budget creation form
- [ ] Add allocation management
- [ ] Add budget alerts display
- [ ] Add spending limits UI

### Phase 4: Advanced Features (Week 7-8) 🚀 LOW PRIORITY

#### 4.1 Receipt Vault
- [ ] Build receipt upload component
- [ ] Add receipt preview modal
- [ ] Display OCR extracted data
- [ ] Link receipts to expenses

#### 4.2 Settings & Profile
- [ ] Build user profile page
- [ ] Build workspace settings page
- [ ] Add notification preferences
- [ ] Add theme customization

#### 4.3 Reports & Analytics
- [ ] Build expense reports page
- [ ] Add export functionality (CSV, PDF)
- [ ] Create custom report builder

---

## Recommended Feature-Based Structure

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (dashboard)/
│       └── workspaces/[workspaceId]/
│           ├── page.tsx                    # Dashboard
│           ├── expenses/page.tsx
│           ├── approvals/page.tsx
│           ├── budgets/page.tsx            # NEW
│           ├── categories/page.tsx         # NEW
│           ├── receipts/page.tsx           # NEW
│           └── settings/page.tsx           # NEW
│
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── expenses/
│   │   ├── components/
│   │   │   ├── ExpenseList.tsx
│   │   │   ├── ExpenseForm.tsx
│   │   │   └── ExpenseFilters.tsx
│   │   ├── hooks/
│   │   │   ├── useExpenses.ts
│   │   │   ├── useCreateExpense.ts
│   │   │   └── useUpdateExpense.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── approvals/
│   │   ├── components/
│   │   │   ├── ApprovalList.tsx
│   │   │   ├── ApprovalModal.tsx
│   │   │   └── WorkflowTimeline.tsx
│   │   ├── hooks/
│   │   │   ├── useApprovals.ts
│   │   │   └── useApproveExpense.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── MetricCard.tsx
│   │   │   ├── SpendingChart.tsx
│   │   │   └── CategoryChart.tsx
│   │   ├── hooks/
│   │   │   └── useDashboardStats.ts
│   │   └── types/
│   │       └── index.ts
│   │
│   └── budgets/                            # NEW
│       ├── components/
│       ├── hooks/
│       └── types/
│
├── types/
│   ├── api.ts                              # API response types
│   ├── expense.ts                          # Expense domain types
│   ├── approval.ts                         # Approval domain types
│   ├── user.ts                             # User domain types
│   └── workspace.ts                        # Workspace domain types
│
└── lib/
    ├── api/
    │   ├── client.ts                       # API client instance
    │   ├── expenses.ts                     # Expense API methods
    │   ├── approvals.ts                    # Approval API methods
    │   └── auth.ts                         # Auth API methods
    └── utils.ts
```

---

## Next Steps

### Immediate Actions (This Week)

1. **Create Type Definitions**
   - Generate types from Prisma schema
   - Create API response interfaces
   - Set up validation schemas

2. **Build Authentication**
   - Implement login page
   - Implement register page
   - Set up auth context
   - Enable middleware

3. **API Client Enhancement**
   - Generate OpenAPI types
   - Create typed API methods
   - Set up React Query hooks

### Success Metrics

- [ ] Authentication working end-to-end
- [ ] Expenses page fetching real data
- [ ] Approvals page fetching real data
- [ ] Dashboard showing real statistics
- [ ] All type definitions in place
- [ ] 0 TypeScript errors
- [ ] API client fully typed

---

## Appendix

### Backend API Base URL
```
Development: http://localhost:3001
Production: TBD
```

### OpenAPI Documentation
```
http://localhost:3001/documentation
```

### Key Commands

```bash
# Backend
pnpm dev:api          # Start backend server

# Frontend
pnpm dev:web          # Start Next.js dev server

# Type Generation
pnpm generate         # Generate API types from OpenAPI
```

---

**Last Updated:** 2026-02-13
**Version:** 1.0.0
