# Standard Microservice Architecture Blueprint

This rule defines the mandatory multi-layer architectural pattern for all backend microservices in the Expense Tracker monorepo (`apps/*-service`).

---

## 1. Directory & Layer Organization

```text
apps/<service-name>/
├── prisma/
│   ├── schema.prisma              # Bounded-context schema isolated to service database
│   └── migrations/                # Idempotent, clean Prisma migrations
├── src/
│   ├── composition-root.ts        # Pure, strongly-typed factory (NO singletons, NO string maps)
│   ├── app.ts                     # Fastify app factory accepting compositionRootFactory
│   ├── index.ts                   # Process entry point (loads env, listens on port)
│   ├── plugins/                   # Fastify infrastructure plugins
│   │   ├── auth.ts                # Injected session/token verification (no container fallback)
│   │   ├── db.ts                  # Prisma lifecycle management
│   │   ├── error.ts               # Global error handler (sanitizes 5xx in production)
│   │   └── security.ts            # Helmet & rate limiting
│   ├── outbox/                    # Outbox implementation
│   │   └── prisma-outbox.repository.ts # Unconditional `FOR UPDATE SKIP LOCKED` (fail-fast)
│   └── modules/<bounded-context>/
│       ├── domain/                # PURE BUSINESS LOGIC (Zero external framework imports)
│       │   ├── entities/          # Rich aggregates with encapsulation and invariant rules
│       │   ├── value-objects/     # Immutable, self-validating value types
│       │   ├── errors/            # Explicit, typed domain errors with HTTP status codes
│       │   └── repositories/      # Abstract repository interfaces (pure domain contracts)
│       ├── application/           # USE-CASE ORCHESTRATION
│       │   ├── commands/          # Write use-cases (1 file = 1 command = 1 handler)
│       │   ├── queries/           # Read use-cases (authorization + read DTO projections)
│       │   ├── ports/             # Outbound interfaces (hashers, event emitters, mailers)
│       │   └── services/          # Multi-aggregate coordinators & unit-of-work transactions
│       ├── infrastructure/        # ADAPTERS (Database, HTTP, External APIs)
│       │   ├── persistence/       # Repository implementations using Prisma / Context
│       │   └── http/
│       │       ├── controllers/   # Unpacks request, invokes handler, returns ResponseHelper
│       │       ├── routes/        # Fastify route registrations with middleware
│       │       └── validation/    # Zod input schemas attached to routes
│       └── tests/                 # COMPREHENSIVE TEST SUITE
│           ├── *.unit.test.ts     # Domain, handler, and controller unit tests
│           ├── *.endpoints.test.ts# Fastify `.inject()` HTTP routing tests
│           └── *.integration.test.ts # Real PostgreSQL concurrency & transaction tests
```

---

## 2. Layer Constraints & Rules

### Domain Layer
- **Entities & Aggregates**: Private constructors with static factory methods (`create`, `reconstitute`). Domain business rules stay inside the entity—never leak invariants into controllers or services. Must provide `toDTO()` for serialization.
- **Value Objects**: Immutable and self-validating (e.g. `UserId`, `Email`, `Money`, `Currency`).
- **Repositories**: Pure TypeScript interfaces (e.g. `IUserRepository`). Methods take and return domain entities/value objects—never raw Prisma models.
- **Domain Errors**: Extend base domain error and declare an explicit HTTP `statusCode` (e.g., `400 Bad Request`, `404 Not Found`, `409 Conflict`).

### Application Layer
- **Commands & Handlers (`commands/`)**: One use-case per handler (`ICommandHandler<TCommand, CommandResult<TResult>>`). Coordinates domain entities, repositories, and ports.
- **Queries & Handlers (`queries/`)**: Dedicated read queries with caller authorization and direct DTO projections.
- **Application Services (`services/`)**: **Only** introduced when a workflow genuinely requires coordinating multiple repositories, transaction units-of-work (`OperationService`), or cross-aggregate workflows. **No redundant pass-through services.**
- **Ports (`ports/`)**: Abstractions for any external or infrastructure dependency (e.g., `IPasswordHasher`, `IReceiptStoragePort`).

### Infrastructure Layer
- **Persistence (`infrastructure/persistence/`)**: Implements domain repository interfaces using `IdentityPersistenceContext` / Prisma. Reconstitutes domain entities from relational rows.
- **Controllers (`infrastructure/http/controllers/`)**: Extremely thin. Responsible only for unpacking validated input, invoking the command/query handler, and formatting the response via `ResponseHelper`. No database calls, no business rules.
- **Validation (`infrastructure/http/validation/`)**: Zod schemas for `body`, `params`, and `querystring`. Attached directly to Fastify route definitions.
- **Routes (`infrastructure/http/routes/`)**: Plain Fastify plugins grouping related endpoints, applying `authenticate` middleware, and binding controller methods.

---

## 3. Composition Root & Dependency Injection
- **Factory Pattern**: Must use a pure factory function:
  ```typescript
  export function createCompositionRoot(prisma: PrismaClient): CompositionRoot
  ```
- **Zero Singletons**: Never use global mutable singleton containers or string-based lookup maps.
- **Frozen Public Surface**: Return an `Object.freeze` structure.
- **Application Factory Injection**: `buildApp(options)` must accept `compositionRootFactory?: (prisma: PrismaClient) => CompositionRoot`, guaranteeing that Fastify's database plugin lifecycle and the dependency graph share the identical Prisma client instance and allow isolated testing.

---

## 4. Outbox & Concurrency Rules
- **Atomic Writes**: Business state mutation and outbox event persistence must be written within the same database transaction.
- **Fail-Fast `FOR UPDATE SKIP LOCKED`**: Concurrency queries use native PostgreSQL `FOR UPDATE SKIP LOCKED` unconditionally:
  - Fail-fast: never catch raw SQL errors to silently degrade to a non-locking query.
  - Test mocks must implement `$queryRaw` so unit tests do not compromise production concurrency behaviour.

---

## 5. Security & Error Handling
- **Auth Plugin**: Injected `sessionService` via plugin options with fatal startup check (zero global container coupling).
- **5xx Sanitization**: Unhandled 5xx errors return sanitized `"Internal server error"` in production (`NODE_ENV === 'production'`). Domain errors (`< 500`) preserve status codes and messages.
- **Deep Health Check**: `/health` checks database connectivity with `SELECT 1`. In production, errors return 503 with generic `"Database service unavailable"`, leaking no hostnames or database connection details.

---

## 6. Testing & CI Standards
- **Pinned Dependencies**: Pin exact Vitest runtime and coverage packages (e.g. `1.6.1`).
- **Enforceable Coverage**: Configure `all: true` and establish measured thresholds (Lines, Branches, Statements, Functions).
- **Migration Idempotency**: Verified against clean, unpopulated databases with `prisma migrate deploy`.
- **Zero Build Artifacts in Git**: `dist/` and `coverage/` must remain gitignored and excluded from version control.
