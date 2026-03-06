# Expense Tracker - Web Application

Modern expense tracking application built with Next.js 14, React Query, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**:
  - Server State: TanStack React Query
  - UI State: Zustand
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: ky (via @expense-tracker/api-client)
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Backend API running on port 3001

### Installation

```bash
# From project root
pnpm install

# Or from this directory
pnpm install
```

### Environment Setup

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Update environment variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

### Development

```bash
# Start dev server
pnpm dev

# Or from project root
pnpm dev:web
```

Visit [http://localhost:3000](http://localhost:3000)

### Build

```bash
# Production build
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
apps/web/
├── app/                      # Next.js App Router
│   ├── (public)/            # Public routes (landing, login)
│   ├── (dashboard)/         # Protected workspace routes
│   └── account/             # User account routes
├── components/              # Shared UI components
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Layout components
│   └── forms/               # Form components
├── features/                # Feature modules (13 domains)
│   ├── expense-ledger/
│   ├── receipt-vault/
│   ├── approval-workflow/
│   └── ...
├── lib/                     # Core utilities
├── providers/               # React context providers
├── stores/                  # Zustand stores
└── styles/                  # Global styles
```

## Features

- 🔐 **Authentication & Authorization** - JWT-based auth with workspace support
- 💰 **Expense Management** - Create, track, and manage expenses
- 📝 **Receipt Vault** - Upload and OCR receipt scanning
- ✅ **Approval Workflows** - Multi-step approval chains
- 📊 **Budget Planning** - Budget allocation and forecasting
- 🏦 **Bank Feed Sync** - Automated transaction import
- 📋 **Policy Controls** - Expense policy enforcement
- 💸 **Cost Allocation** - Split expenses across projects/departments
- 📈 **Reports & Analytics** - Interactive charts and insights
- 🔔 **Notifications** - Real-time updates and alerts

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Create production build
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript compiler check

## API Client

The app uses a typed API client generated from the Fastify backend OpenAPI schema:

```bash
# Generate API client (requires backend running)
cd ../../packages/api-client
pnpm generate
```

## Contributing

See the main project [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.
