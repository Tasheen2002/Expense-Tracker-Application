# Identity Access Service — Architecture Review

Reviewed on 5 September 2026 against the current working tree, including uncommitted changes.

**Overall assessment**

This is a credible architectural foundation for a software engineering portfolio. It demonstrates modular organization, dependency inversion, behavioral domain entities, explicit use cases, persistence mapping, and attention to operational concerns. Its main weakness is that several architectural guarantees are incomplete: workspace isolation, ownership consistency, atomic writes, and durable event delivery.

I would describe it as a modular service with a layered, DDD-inspired domain model and lightweight command/query separation. I would not yet present it as a production-ready identity service or a completed transactional-outbox implementation. Improving the guarantees below will strengthen the portfolio more than adding more patterns or services.

**Scope and verification**

- Read all 78 files under this service's `src`, including its five test files, plus Prisma schema, package manifest, TypeScript configuration, test configuration, Dockerfile, and example environment configuration: 84 files in total. Secret-bearing `.env` contents, dependencies, and generated output are not part of that count.
- Followed relevant shared core, middleware, correlation, outbox, gateway, Compose, and CI code where needed to understand this service's actual behavior. This is not a complete review of those other services or packages.
- TypeScript checking passed using the locally installed compiler.
- Both existing database-free unit suites passed: 9 tests in 2 files.
- Fresh compilation into a temporary directory confirmed the emitted entry is `apps/identity-access-service/src/index.js` beneath the output directory, not the `index.js` expected by the Docker command. Emitted imports retain aliases such as `@core` and `@shared`.
- The normal package-manager command attempted an automatic dependency reinstall and aborted; direct local tools allowed verification without replacing dependencies. The unit runner required execution outside the sandbox after configuration loading was denied.
- Database-backed suites were read but not executed against the user's configured database. No claim is made that end-to-end flows, Docker startup, or CI pass. Defects below are established by code tracing unless explicitly identified as compilation evidence.
- No application source was changed for this review.

**The implemented pattern**

The service contains one module, `identity-workspace`. Its three layers are a reasonable arrangement:

| Boundary | Responsibility in this service | Assessment |
| --- | --- | --- |
| Domain | Users, workspaces, memberships, invitations, value objects, business errors, repository contracts | Meaningful behavior exists, but invariants are incomplete. |
| Application | Nine command handlers, nine query handlers, four orchestration services | Use cases are discoverable; most handlers are wrappers around broad services. |
| Infrastructure | Fastify routes/controllers, validation, authorization adapters, Prisma repositories | Appropriate home for HTTP and persistence, but policies and error handling are duplicated. |
| Service composition | App factory, container, plugins, process startup, outbox worker | Explicit wiring is good; global lifetime and production packaging need work. |

The normal request path is HTTP route → validation/authentication → controller → command/query handler → application service → domain entity/repository interface → Prisma implementation. Responses return through DTO conversion and `ResponseHelper`.

Two exceptions matter: profile updates call `UserManagementService` directly, and workspace authorization middleware directly accesses Prisma before controllers repeat membership checks through services.

A service may contain several modules. Three layers per module is defensible; a separate presentation layer is not mandatory when HTTP is an infrastructure adapter. Identity, membership, and invitations can reasonably stay together because they share access-control rules. Splitting them further should follow independent business responsibilities, ownership, and consistency needs, rather than a target number of modules.

CQRS does not require separate databases, a message bus, or event sourcing. This implementation separates handler interfaces but uses the same domain repositories and broad services for reads and writes. That is a lightweight approach; a read repository returning projections would make the separation more useful for list endpoints. Microsoft's [CQRS guidance](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs) explicitly supports a shared underlying database with distinct read/write logic.

**Priority findings**

**1. High — Invitation cancellation is not scoped to the authorized workspace.**

In `invitation.controller.ts:166`, authorization uses the workspace ID from the URL. The controller then passes only `invitationId` into `CancelInvitationHandler`. In `workspace-invitation.service.ts:179`, the invitation is loaded and deleted by ID without comparing its actual workspace.

An administrator of workspace A who obtains an invitation ID belonging to B can submit that ID under A's cancellation URL. The request passes A's authorization and affects B's invitation. UUID unpredictability does not provide tenant authorization. Carry actor ID and workspace ID into the use case, scope the lookup to both IDs, and authorize against the actual resource. Add a two-workspace negative test asserting that B's invitation remains unchanged.

**2. High — Normal domain writes do not populate the outbox.**

`container.ts:53` supplies an in-memory event bus to repositories. Repository saves call `dispatchEvents` after their database write; the base repository publishes and clears the entity's events. No subscriber registration or call to the outbox repository's `save` connects this path to durable storage in the reviewed service. `index.ts:38` starts a worker that reads a separate outbox table.

Consequently, normal user/workspace/member creation does not enqueue the integration events expected by that worker. The existence of an outbox table and worker alone does not implement the pattern. Persist the business change and integration-event record in the same database transaction. Adding an asynchronous subscriber after the commit still leaves a crash window. This atomicity is the defining property of the [transactional outbox pattern](https://microservices.io/patterns/data/transactional-outbox).

**3. High — Workspace and owner membership creation are separate commits.**

`workspace-management.service.ts:73` saves the workspace before saving its owner membership at line 82. A failure on the second write leaves a workspace without the membership required by the authorization path. Retrying creation can then fail because the slug already exists.

Use one transaction for workspace, initial owner membership, and their outbox records. An application-facing transaction/unit-of-work port or a focused repository operation can achieve this without exposing Prisma in the application layer. Invitation acceptance already demonstrates awareness of atomic multi-record writes; apply that consistency elsewhere.

**4. High — Ownership has two representations that can disagree.**

The workspace stores one `ownerId`, while memberships independently store an `owner` role. The role-change endpoint allows an owner to promote another member to owner. `WorkspaceMembership.changeRole` permits promotion, but no code updates `Workspace.ownerId` or demotes the existing owner. Owner demotion/removal is subsequently blocked by other rules.

The result can be multiple permanent owner memberships while the workspace continues naming one owner. If co-ownership is intended, model it explicitly. Otherwise, prohibit ordinary role changes to owner and add an atomic ownership-transfer use case that keeps both representations consistent.

**5. High — Production startup does not match the compiler output.**

`Dockerfile:53` runs `node dist/index.js`. Fresh compilation showed that file is not emitted: shared source imports expand the output tree, placing the service entry at `dist/apps/identity-access-service/src/index.js`. The output also retains development aliases and extensionless imports; the configuration uses ESNext/bundler resolution while the source bootstrap uses `__dirname`.

Fix the complete production build/runtime contract, not only the entry path. Bundle the service or establish compatible Node module settings and resolvable built workspace packages. Generate Prisma before compilation on a clean checkout. Then run the built image and assert readiness; successfully building an image does not prove its command starts.

**6. High for integration reliability — Shared event delivery can lose subscriber deliveries and strand work.**

`packages/outbox-kit/src/outbox-publisher.ts:59` throws only when every destination fails. If audit succeeds and notification fails, publication resolves successfully and the worker marks the event processed. The failed destination receives no durable retry. Track delivery per subscriber, or retry with consumer deduplication and explicit all-required-subscriber semantics.

The worker marks records `PROCESSING`, but the repository only retrieves `PENDING` and `FAILED`. A crash after the status change strands the record. Multiple workers can also select the same pending row before either claims it. Introduce atomic claims, expiring leases/recovery, and idempotent consumers. The immediate prerequisite remains connecting business writes to the outbox.

**7. Medium — Internal lookup routes lack user/resource authorization.**

`auth.routes.ts:83` and `member.routes.ts:74` declare bearer authentication in documentation but attach no bearer or workspace authorization hook. Their controllers return the requested user's details or membership directly. The service-wide internal-key guard protects these calls when configured, and gateway routes require a valid JWT. Therefore these are not universally anonymous public endpoints in the supplied deployment.

However, the gateway exposes these paths to authenticated users without checking whether the caller may inspect the target member/workspace. If they are internal-only APIs, put them behind an explicit internal boundary that the gateway does not proxy as a public user API. If public, define and enforce resource-level policy. The internal-key plugin also bypasses protection when its secret is absent, which deserves fail-fast production configuration.

The shared middleware's remote membership lookup sends the bearer header but omits the internal API key (`packages/middleware/src/workspace-authorization.middleware.ts`). For consumers taking that branch, a configured identity service rejects the request and legitimate membership checks become 403 responses. Use a configured internal client and distinguish dependency failure from genuine lack of permission.

**8. Medium — Error handling bypasses the central mapper.**

Commands catch every error into `CommandResult`, while controllers also catch errors and call `ResponseHelper.error`. That helper returns raw exception messages; command conversion defaults unknown errors to 500 and loses their stable domain code. The Prisma error mapping and production-safe fallback in `plugins/error.ts` are bypassed by these catches.

A concurrent duplicate registration can pass both pre-checks, encounter a unique constraint, and become a 500 rather than the expected 409. Centralize HTTP mapping and logging; let unexpected failures reach it. If keeping result objects for expected failures, preserve typed error codes and explicitly map repository conflicts. Do not return raw infrastructure exception messages to callers.

**9. Medium — List pagination is advertised but dropped.**

The member-list route validates `page` and `limit`, but `MemberController.listMembers` passes only `workspaceId`. Neither its query nor service forwards pagination options, so the repository repeatedly returns its default first page. Propagate options or use a read adapter that accepts pagination. Test page two against a dataset larger than one page.

`getWorkspacesByMembership` also issues one membership query followed by one workspace lookup per item. Parallel promises reduce latency but do not remove the N+1 database workload. A joined projection is a practical place to demonstrate CQRS's value.

**10. Medium — Domain invariants and lifecycle states are inconsistent.**

`Workspace.create` does not reject blank/whitespace names; the HTTP schema checks length before trimming, so whitespace can produce an empty slug. Name updates validate emptiness but not all declared length/slug constraints. `User.create` accepts an empty hash even though `updatePassword` rejects it. Invitation construction lowercases an email instead of consistently using the Email value object and does not itself constrain role/expiry.

Cancellation and member removal emit events without changing entity lifecycle state, then save and delete in separate operations. Once event delivery is connected, an event can describe a deletion that subsequently fails. Persist deletion and its event atomically, or model an explicit cancelled/removed state. Workspace deletion cascades memberships but has no invitation relation/cascade; orphan invitations remain.

Authentication checks JWT validity, not current user activation/session state. `AuthSession` is unused. A previously issued token remains valid after deactivation or password change unless another boundary rejects it. Define revocation and inactive-user/workspace behavior and implement the required checks; don't present unused session tables or error classes as working features.

**11. Medium — Rate limiting and caching have hidden lifetime/order problems.**

Several route-registration functions add write-limit hooks to the same Fastify scope, because the root registration calls these functions directly. Hooks accumulate; their user-based keys are evaluated before route-level authentication supplies `request.user`. Requests can consume an anonymous shared bucket and be counted repeatedly. The limiter is disabled under `NODE_ENV=test`, so the current endpoint suites do not exercise this behavior. Register one correctly scoped policy after authentication for per-user limits, with a separate trusted-IP policy for public auth routes.

Membership cache invalidation happens before writes, allowing concurrent reads to repopulate old state. The cache is process-local, and invitation acceptance bypasses that invalidation. The present database authorization prehandler mitigates stale-positive cache access on protected routes, so this is not a claim that all removed users retain access for ten minutes. It is inconsistent authorization state that adds complexity and can cause stale denials. Prefer one authoritative check before adding distributed caching.

The container and Prisma client are global singletons. Each app build creates another cache interval, and shutdown does not destroy it. Prefer app-scoped dependency construction and explicit cleanup.

**12. Medium — Tests and delivery configuration do not substantiate all architectural claims.**

There are useful authentication/endpoint tests and nine passing isolated tests. However, the broad endpoint suite allows `[400, 403, 404, 500]` for one failure, silently returns when invitation setup is unavailable, and includes a summary test that only asserts true. Test cases depend on prior test cases' state. No dedicated entity/value-object suites or database rollback/outbox recovery tests were found in this service.

`vitest.config.ts` loads the root environment rather than selecting a dedicated identity test database. CI supplies database variables only to the schema-push step, not the test step. Moreover, this Prisma schema reads `DATABASE_URL`; the per-service `IDENTITY_DATABASE_URL` variable declared in CI is not what that schema uses. On a clean runner, the current workflow does not provide the intended database configuration to tests. Use an isolated test database, explicit per-step configuration, migrations, exact assertions, and a built-service smoke test.

**File-by-file assessment**

Paths in the following inventory are relative to `apps/identity-access-service`. Each source/configuration file is listed once. Repeated concerns are deliberately brief here; the findings above explain impact and fixes.

| File | Role and feedback |
| --- | --- |
| `src/index.ts` | Environment/bootstrap, worker, signals. Clear separation from factory; outbox production is missing, event routing covers only some events, and emitted-runtime/environment path handling needs correction. |
| `src/app.ts` | App factory, plugin order, routes, health. Good test seam; global dependencies weaken isolation. Test helper disables internal auth; health exposes exception text on failure. |
| `src/container.ts` | Explicit dependency construction. Constructor injection is positive. Replace singleton/string lookup with a typed per-app composition factory; connect outbox writes and cleanup. |
| `src/types/fastify.d.ts` | Framework augmentation. Useful, but JWT shape is duplicated and unsafe casts remain at call sites. |
| `src/plugins/auth.ts` | JWT signing/verification. Requires JWT secret; lacks current-account/session validation and runtime claim-shape validation. |
| `src/plugins/db.ts` | Prisma lifecycle adapter. Disconnect hook is good; module-level client is shared across app instances. |
| `src/plugins/error.ts` | Global mapper and logging. Good intention, bypassed by controller/command catches; local DomainError definition is redundant. |
| `src/plugins/security.ts` | HTTP security headers. Appropriate infrastructure concern; declare the imported Helmet dependency in the service manifest. |
| `src/outbox/prisma-outbox.repository.ts` | Worker persistence adapter. Has a save method without a producer caller; add transactional enqueue, atomic claims, and lease recovery. |
| `src/shared/response.helper.ts` | Response formatting. Consistent success shape; error mapping duplicates plugin behavior, leaks unexpected messages, and mislabels 422 as internal error. |
| `src/shared/domain/errors/domain-validation.errors.ts` | Duplicate validation hierarchy. Module domain code uses core errors instead; includes unrelated money errors. Remove unused duplication. |
| `src/shared/http/response-schemas.ts` | Reusable response builders. Useful idea, but module schemas independently rebuild envelopes and comments reference an old service path. |
| `src/shared/http/validation.ts` | Zod request adapters and JSON-schema conversion. Useful centralization; separate page/offset conventions and redundant validation need consistent policy. |
| `src/shared/infrastructure/cache/cache.service.ts` | In-memory cache. Reasonable local adapter, not a distributed consistency mechanism. Cleanup is unused by composition; unrelated expense/budget keys dilute service scope. |
| `src/shared/infrastructure/cache/index.ts` | Cache exports. Small and clear; keep only needed public symbols. |
| `src/shared/infrastructure/persistence/prisma-repository.base.ts` | Shared post-save event dispatch. Small abstraction, but does not make events durable or atomic with state. |
| `src/shared/infrastructure/persistence/prisma-repository.helper.ts` | Pagination helper. Bounded page size is good; concurrent count/list are not snapshot-consistent and callers must actually forward options. |
| `src/modules/identity-workspace/index.ts` | Public module API. Good intent; composition deep-imports internals. A module factory would make the public boundary useful. |
| `src/modules/identity-workspace/application/index.ts` | Application barrel. Improves controller imports; exports all broad services as well as use cases. |
| `src/modules/identity-workspace/domain/constants/identity.constants.ts` | Rule constants. Central location is good; expiry defaults and email rules disagree with implementations; session/password-policy/max-invitation constants are partly unused. |
| `src/modules/identity-workspace/domain/errors/identity.errors.ts` | Named domain failures. Expressive codes; HTTP statuses couple the domain to transport and some lifecycle errors lack implemented flows. |
| `src/modules/identity-workspace/domain/entities/user.entity.ts` | User aggregate and events. Behavioral methods and safe DTO excluding hash are good. Creation validation is weaker than mutation validation; DTO interface appears twice. |
| `src/modules/identity-workspace/domain/entities/workspace.entity.ts` | Workspace aggregate and events. Useful rename/activation behavior; incomplete name/slug invariants and inconsistent owner representation. DTO interface appears twice. |
| `src/modules/identity-workspace/domain/entities/workspace-membership.entity.ts` | Membership aggregate/role policies. Real domain behavior; promotion permits ownership drift, removal emits without state change, and DTO interface is duplicated. |
| `src/modules/identity-workspace/domain/entities/workspace-invitation.entity.ts` | Invitation/token/acceptance lifecycle. Random token and guarded acceptance are positives. Cancellation has no state, validation is incomplete, raw token is in general DTO, and DTO interface is duplicated. |
| `src/modules/identity-workspace/domain/value-objects/email.vo.ts` | Normalized email. Good value-object use; align its 254-character limit/format with HTTP's 255-character constant and separate regex. |
| `src/modules/identity-workspace/domain/value-objects/user-id.vo.ts` | User UUID wrapper. Clear semantics and validation via base; inherited structural typing/equality do not strongly distinguish all ID kinds. |
| `src/modules/identity-workspace/domain/value-objects/workspace-id.vo.ts` | Workspace UUID wrapper. Consistent implementation; consider distinct type branding if compile-time cross-ID safety is intended. |
| `src/modules/identity-workspace/domain/value-objects/membership-id.vo.ts` | Membership UUID wrapper. Same useful pattern and cross-ID typing limitation. |
| `src/modules/identity-workspace/domain/value-objects/invitation-id.vo.ts` | Invitation UUID wrapper. Same useful pattern and cross-ID typing limitation. |
| `src/modules/identity-workspace/domain/repositories/user.repository.ts` | User persistence port. Correct dependency direction; broad generic CRUD surface exceeds exposed use cases. |
| `src/modules/identity-workspace/domain/repositories/workspace.repository.ts` | Workspace persistence port. ORM-free contract is good; needs a strategy for atomic creation with owner membership. |
| `src/modules/identity-workspace/domain/repositories/workspace-membership.repository.ts` | Membership persistence port. Useful composite lookup and pagination contract; scope mutations consistently. |
| `src/modules/identity-workspace/domain/repositories/workspace-invitation.repository.ts` | Invitation persistence port. Explicit atomic acceptance is a positive; transaction responsibility spanning aggregates is embedded in one repository. |
| `src/modules/identity-workspace/application/commands/register-user.command.ts` | Registration entry point. Concrete bcrypt/environment dependency and blanket catch; inject a password-hashing port and validated configuration. |
| `src/modules/identity-workspace/application/commands/create-workspace.command.ts` | Workspace creation entry point. Clear request type; mostly a wrapper, with transaction correctness delegated to service. |
| `src/modules/identity-workspace/application/commands/update-workspace.command.ts` | Rename/update entry point. No actor context; boundary authorization is external. HTTP accepts isActive but command does not implement it. |
| `src/modules/identity-workspace/application/commands/delete-workspace.command.ts` | Deletion entry point. Correct missing-resource conversion; lacks actor context and deletion integration event flow. |
| `src/modules/identity-workspace/application/commands/create-invitation.command.ts` | Invite use case. `invitedBy` is accepted but discarded; expiry duplicated as 168 hours. |
| `src/modules/identity-workspace/application/commands/accept-invitation.command.ts` | Acceptance entry point. Carries authenticated user ID; underlying atomic write is good, outbox atomicity absent. |
| `src/modules/identity-workspace/application/commands/cancel-invitation.command.ts` | Cancellation entry point. Critical missing workspace and actor scope. |
| `src/modules/identity-workspace/application/commands/change-member-role.command.ts` | Role change. Correct user/workspace lookup; repeated load in service, no actor policy, ownership transfer absent. |
| `src/modules/identity-workspace/application/commands/remove-member.command.ts` | Removal. Correct target composite lookup; repeated load and no actor policy at use-case boundary. |
| `src/modules/identity-workspace/application/queries/login-user.query.ts` | Credential verification. Currently reads only; classification is defensible for that narrow behavior. Token issuance is outside it; session creation would make login a command. |
| `src/modules/identity-workspace/application/queries/get-user.query.ts` | Lookup by ID/email. Clear missing-resource behavior; optional fields permit ambiguous input, and caller policy is external. |
| `src/modules/identity-workspace/application/queries/get-user-workspaces.query.ts` | Paginated workspace query. Forwards options properly; service implementation causes N+1 lookups. |
| `src/modules/identity-workspace/application/queries/get-workspace-by-id.query.ts` | Workspace lookup. Simple and readable; nullable result handling should be consistent at HTTP boundary. |
| `src/modules/identity-workspace/application/queries/list-workspace-members.query.ts` | Member listing. Omits pagination despite route contract. |
| `src/modules/identity-workspace/application/queries/get-invitation-by-token.query.ts` | Token lookup. Simple; public response projection could expose fewer details. |
| `src/modules/identity-workspace/application/queries/get-pending-invitations.query.ts` | Pending invitation list. Correctly forwards pagination options. |
| `src/modules/identity-workspace/application/queries/get-workspace-invitations.query.ts` | General invitation list. Injected controller parameter is unused; array result hides repository pagination. |
| `src/modules/identity-workspace/application/queries/get-user-invitations.query.ts` | User email invitation list. Exported but not wired into container/routes; array result hides default pagination. |
| `src/modules/identity-workspace/application/services/user-management.service.ts` | Broad user orchestration. Normalization and duplicate checks are good; hashing/config concerns repeat, conflicts race, and many methods have no exposed use case. |
| `src/modules/identity-workspace/application/services/workspace-management.service.ts` | Workspace orchestration. Non-atomic initial writes and N+1 reads; deletion leaves invitations and produces no deletion integration event. |
| `src/modules/identity-workspace/application/services/workspace-membership.service.ts` | Membership operations and permissions. Owner removal guard is good; actor rules are elsewhere, cache invalidation is premature, deletion is split. |
| `src/modules/identity-workspace/application/services/workspace-invitation.service.ts` | Invitation orchestration. Email match and atomic acceptance are positives; cancellation is unscoped, duplicate checks race, active workspace/account state is unchecked. |
| `src/modules/identity-workspace/infrastructure/persistence/user.repository.impl.ts` | Prisma user mapper. Domain/persistence separation is good; save then publish has durability gap, full upsert has no version check. |
| `src/modules/identity-workspace/infrastructure/persistence/workspace.repository.impl.ts` | Prisma workspace mapper. Clear mapping; no coordinated creation/deletion event transaction or concurrent update protection. |
| `src/modules/identity-workspace/infrastructure/persistence/workspace-membership.repository.impl.ts` | Prisma membership mapper. Composite uniqueness supports integrity; string-to-enum cast assumes persisted validity, events dispatch after writes. |
| `src/modules/identity-workspace/infrastructure/persistence/workspace-invitation.repository.impl.ts` | Prisma invitation mapper. Atomic acceptance protects two state changes; events are outside transaction, acceptance update is not conditional on current pending state, mapping uses any. |
| `src/modules/identity-workspace/infrastructure/http/controllers/auth.controller.ts` | Auth/profile adapter. Self-update check is good; direct service mutation breaks handler consistency, lookup lacks caller policy. |
| `src/modules/identity-workspace/infrastructure/http/controllers/workspace.controller.ts` | Workspace HTTP adapter. Permission checks exist but repeat route work; nullable workspace can become a success response; exceptions handled locally. |
| `src/modules/identity-workspace/infrastructure/http/controllers/member.controller.ts` | Member HTTP adapter. Self-removal/self-role protections exist; pagination dropped, owner promotion inconsistent, getMember lacks caller check. |
| `src/modules/identity-workspace/infrastructure/http/controllers/invitation.controller.ts` | Invitation HTTP adapter. Checks management permissions; cancellation loses authorized scope and unused injected handler signals stale wiring. |
| `src/modules/identity-workspace/infrastructure/http/middleware/workspace-auth.helper.ts` | HTTP permission helper. Reuses domain/service predicates, but duplicates route authorization and sends independent response shapes. |
| `src/modules/identity-workspace/infrastructure/http/routes/index.ts` | Module route registration. Clear URL prefix; flat scope causes hooks to accumulate and Prisma argument is unused. |
| `src/modules/identity-workspace/infrastructure/http/routes/auth.routes.ts` | Auth/user routes. Protected me/profile paths and auth limits are positives; get-user lacks bearer hook and profile schema diverges from domain/schema definitions. |
| `src/modules/identity-workspace/infrastructure/http/routes/workspace.routes.ts` | Workspace routes. Explicit auth/role checks; repeated write-limit scope hooks and database authorization in HTTP. |
| `src/modules/identity-workspace/infrastructure/http/routes/member.routes.ts` | Member routes. Explicit mutation protection; get-member lacks user/resource hook and advertised pagination is not used. |
| `src/modules/identity-workspace/infrastructure/http/routes/invitation.routes.ts` | Invitation routes. Public token view/protected acceptance are reasonable; cancellation checks workspace path but not target invitation ownership. |
| `src/modules/identity-workspace/infrastructure/http/validation/validator.ts` | Re-export of shared validation. Reasonable small facade. |
| `src/modules/identity-workspace/infrastructure/http/validation/user.schema.ts` | User HTTP schemas. Derives JSON schemas from Zod; me response only contains userId/email/optional workspaceId, omitting the full profile returned by handler. |
| `src/modules/identity-workspace/infrastructure/http/validation/workspace.schema.ts` | Workspace/member/invitation schemas. Useful bounded pagination; trim before validating names, reconcile owner changes, remove or implement accepted isActive input. |
| `src/modules/identity-workspace/tests/auth.test.ts` | Database-backed auth flow. Useful positive/negative coverage; stale middleware mock path, shared sequential state, non-isolated database config. |
| `src/modules/identity-workspace/tests/member.controller.test.ts` | Database-backed member changes. Tests working target lookup/removal; setup bypasses invite flow with direct insert and assertions are incomplete. |
| `src/modules/identity-workspace/tests/member.controller.unit.test.ts` | Controller unit coverage. Two passing cases; lacks authorization denials, ownership behavior, and pagination. |
| `src/modules/identity-workspace/tests/workspace-invitation.service.unit.test.ts` | Invitation unit coverage. Seven passing cases; transaction is mocked, so rollback/durable events are not proven. No mismatch/cancellation isolation cases. |
| `src/modules/identity-workspace/tests/identity-workspace.endpoints.test.ts` | Broad endpoint smoke suite. Useful surface coverage; permissive 500 assertion, silent setup-dependent return, test ordering, and summary-only assertion weaken confidence. |
| `prisma/schema.prisma` | Service-owned schema with email/slug/membership uniqueness and indexes. Good baseline. Missing invitation-workspace/owner-user relations, unconstrained role strings, unused sessions, no checked-in migration history in service. |
| `package.json` | Service dependencies/scripts. Clear service identity; build generates Prisma after compiling, imported Helmet/schema conversion rely on root dependencies, no service lint script. |
| `tsconfig.json` | Strict inherited compiler settings and aliases. Type check passes; direct shared-source paths expand emitted tree and aliases are not rewritten for production. |
| `vitest.config.ts` | Test discovery/aliases. Works for isolated suites; root environment loading does not establish a dedicated service test database. |
| `Dockerfile` | Multi-stage non-root image with health check. Good intent; startup path is wrong, production Prisma generation relies on development tooling, dependency/runtime build needs a smoke test. |
| `.env.example` | Local service database and port example. Useful start; link shared required secret/configuration documentation and provide explicit test configuration separately. |

**Changes that would make the architecture stronger**

Keep the current three layers and service boundary. Move actor-sensitive policy into the use-case boundary so that an HTTP controller, background job, or future message consumer invokes the same authorization rules. Keep HTTP token parsing and response mapping in infrastructure.

Choose whether handlers themselves orchestrate use cases or intentionally delegate to focused application services. The present combination of tiny wrappers plus broad CRUD-oriented management services adds navigation without consistently adding a policy/transaction boundary. A handler such as `TransferWorkspaceOwnership` or `AcceptInvitation` should make its business guarantees easy to inspect.

Keep domain entities independent of Fastify and Prisma, as they largely are today. Strengthen creation/mutation invariants and distinguish DTO projections from domain state. Move HTTP status mapping to infrastructure. Inject a clock where expiry tests need precision and a password-hasher port where implementation substitution improves testability; avoid introducing interfaces for every trivial operation.

Make transaction boundaries explicit. Separate an internal domain event from the stable integration message consumed by other services. Store the integration envelope, stable event ID, version, actor/correlation context as appropriate, and business changes together. Test rollback, retry, duplicate delivery, and worker crash recovery. Preserve consumer compatibility deliberately instead of maintaining unexplained parallel event names.

Use read projections where they remove real overhead: member lists and user workspaces are enough to demonstrate the idea. Separate read databases, event sourcing, Kafka, Redis, or sagas are not prerequisites to improving this service. Keep the shared core small; shared middleware that knows identity storage layout, multiple services' roles, and remote deployment configuration creates broader coupling than a simple generic utility.

**Portfolio improvement order**

1. Fix workspace-scoped cancellation, define ownership semantics, and clarify internal versus public lookup authorization. Prove each with negative tests.
2. Implement atomic workspace creation and a working transactional outbox. Prove that a failed transaction leaves neither state nor events, and a successful one leaves both.
3. Correct event delivery retries/claims, production compilation/startup, and explicit CI/test database configuration. Demonstrate the service starting from a clean checkout/image.
4. Centralize errors and authorization, strengthen domain validation, fix member pagination and response schema drift, and remove unused duplication.
5. Document one successful flow and one failure/recovery flow, plus short architecture decisions explaining why the service boundary, CQRS scope, transaction boundary, and delivery semantics fit this application.

For an interview, the strongest demonstration would be: create a workspace; invite and accept a member; reject an operation crossing workspace boundaries; transfer ownership safely; temporarily fail an event destination and show eventual recovery without duplicate side effects. Explain what is guaranteed, what is eventually consistent, and why you chose that tradeoff. That demonstrates engineering judgment beyond naming architectural patterns.
