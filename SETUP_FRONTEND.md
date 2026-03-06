# Frontend Setup Guide

This guide will help you set up and run the Next.js frontend for the Expense Tracker application.

## Prerequisites

- ✅ Node.js 20+ installed
- ✅ pnpm 8+ installed
- ✅ Backend API running on `http://localhost:3001`

## Step 1: Install Dependencies

From the **project root directory**:

```bash
pnpm install
```

This will install dependencies for all workspaces (web app, API client, validation packages, etc.).

## Step 2: Environment Configuration

The `.env.local` file has already been created for you at `apps/web/.env.local` with the following defaults:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
```

**Important**: Change `NEXTAUTH_SECRET` to a secure random string for production!

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 3: Generate API Client (Optional but Recommended)

The API client can be auto-generated from your Fastify backend's OpenAPI schema:

```bash
# Make sure backend is running first!
cd packages/api-client
pnpm generate
```

This creates type-safe API client methods based on your backend routes.

## Step 4: Start Development Server

From the **project root**:

```bash
pnpm dev:web
```

Or from `apps/web/`:

```bash
pnpm dev
```

The app will be available at **http://localhost:3000**

## Step 5: Verify Setup

1. Open http://localhost:3000 in your browser
2. You should see the landing page
3. Try navigating to `/login` - should work
4. Try accessing `/workspaces` without auth - should redirect to login

## Project Structure Overview

```
apps/web/
├── app/                          # Next.js App Router
│   ├── (public)/                # Public routes
│   │   ├── page.tsx            # Landing page (/)
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration
│   │   └── pricing/            # Pricing page
│   ├── (dashboard)/            # Protected routes
│   │   └── workspaces/[workspaceId]/
│   │       ├── expenses/       # Expense management
│   │       ├── receipts/       # Receipt vault
│   │       ├── budgets/        # Budget tracking
│   │       └── ...             # Other modules
│   └── layout.tsx              # Root layout
├── features/                    # Feature modules (13 domains)
│   ├── expense-ledger/
│   │   ├── components/         # Feature-specific components
│   │   ├── hooks/              # Custom hooks
│   │   ├── api.ts              # API methods
│   │   ├── queries.ts          # React Query hooks
│   │   ├── schemas.ts          # Zod validation
│   │   └── types.ts            # TypeScript types
│   └── ...                     # Other 12 modules
├── components/                  # Shared UI components
│   └── ui/                     # shadcn/ui components
├── lib/                        # Utilities (cn, formatCurrency, etc.)
└── providers/                  # React Query, Theme providers
```

## Available Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm dev:web          # From root: start web dev server

# Building
pnpm build            # Production build
pnpm start            # Start production server

# Quality
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript check
```

## Next Steps

1. **Create UI Components** - Set up shadcn/ui components
2. **Build Landing Page** - Create marketing pages
3. **Implement Auth** - Connect to backend auth endpoints
4. **Add Feature Modules** - Build out expense, receipt, budget features
5. **Setup Tests** - Add Vitest or Jest for testing

## Common Issues

### Port 3000 already in use
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
pnpm dev -- -p 3002
```

### Module resolution errors
```bash
# Clear Next.js cache
rm -rf .next
pnpm dev
```

### Workspace package not found
```bash
# Reinstall all dependencies
pnpm install --force
```

## Technology Decisions

### Why Next.js 14 App Router?
- Server Components for better performance
- Built-in routing with file-based system
- Excellent TypeScript support
- SEO-friendly with SSR/SSG

### Why React Query?
- Declarative data fetching
- Built-in caching and background refetching
- Optimistic updates
- Perfect for complex server state

### Why Zustand?
- Lightweight (1kb)
- No boilerplate
- Great TypeScript support
- Perfect for UI state (modals, filters, etc.)

### Why shadcn/ui?
- Copy-paste components (no package bloat)
- Full control and customization
- Built on Radix UI (accessible)
- Tailwind-based styling

## Development Workflow

1. **Start Backend** (`pnpm dev` in root)
2. **Start Frontend** (`pnpm dev:web` in root)
3. **Make Changes** - Hot reload enabled
4. **Check Types** - `pnpm type-check`
5. **Commit** - Follow conventional commits

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

---

**Happy Coding! 🚀**
