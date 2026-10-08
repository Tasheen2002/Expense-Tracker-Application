# Backend final-verification baseline

Scope update on 2026-10-08: the user requested removal of the entire frontend.
`apps/web`, the unused frontend API-client/types/validation packages, the Next.js
TypeScript preset and frontend-only setup/API-report scripts were removed.
Root scripts, Compose, CI, shared test coverage scope and the workspace lockfile
were updated for a backend-only repository. Earlier inventories and shared
coverage percentages below describe the pre-removal scope; they must not be
presented as newly measured coverage for the reduced package set. The Step 8
manifest is historical after these configuration/package changes.

Captured on 2026-10-07 (Asia/Colombo). Machine capture: 2026-10-07T15:42:44.995Z.

This document defines the scope for the new final-verification pass. It does not claim that previous reviews or test results establish current correctness. Production application code and databases were not changed during Step 1.

## Version and evidence

- Branch: `feature/update-backend`
- HEAD: `b508300dfab3c72e82a9ad1d52da17c1612362e8`
- Uncommitted status entries at capture: **343**. This includes existing work; no attribution or reset is implied.
- Hashed backend/shared source, configuration, test, and migration files: **1529**.
- Private baseline manifest: `C:\Users\TASHEEN\AppData\Local\Temp\backend-baseline-1791387764997.json`
- Private static route catalog: `C:\Users\TASHEEN\AppData\Local\Temp\backend-routes-1791387766104.json`
- Secret environment contents, generated build/coverage files, uploads and frontend are excluded from the file hashes. The manifests contain paths and hashes, not source contents or credentials.
- Changes after this capture invalidate affected evidence; rerun the relevant checks and refresh their hashes.

## Application and module inventory

Counts represent files, not test cases or coverage. Production counts include service-level code; tests count *.test.ts/*.spec.ts. Migration counts are migration.sql files, not proof that migrations apply. Gateway is an edge application, not a business module.

| Application | Modules | Production TS files | Test files | Migrations |
|---|---|---:|---:|---:|
| identity-access-service | identity-workspace | 96 | 24 | 1 |
| approval-policy-service | approval-workflow, policy-controls | 158 | 29 | 5 |
| expense-budgeting-service | budget-management, budget-planning, cost-allocation, expense-ledger, inventory-management | 418 | 100 | 16 |
| categorization-service | categorization-rules | 91 | 13 | 5 |
| bank-feed-service | bank-feed-sync | 68 | 12 | 3 |
| receipt-vault-service | receipt-vault | 81 | 12 | 4 |
| audit-compliance-service | audit-compliance | 51 | 13 | 3 |
| notification-service | notification-dispatch | 110 | 31 | 5 |
| gateway | Gateway/proxy | 3 | 4 | 0 |

Total: **9 applications**, **13 modules**. Shared packages and operational scripts are additional verification scope.

## Verification checklist

| Step | Scope | Status in this pass |
|---|---|---|
| 1 | Baseline and scope | Complete: inventories, hashes, routing sources, isolated test strategy |
| 2 | Static checks | Complete: 28 initial checks passed; two production-auth guards fixed and affected checks rerun |
| 3 | Database foundation | Complete for isolated PostgreSQL checks: 360 tests passed; Approval workspace foreign keys hardened |
| 4 | Service suites and coverage | Complete: 3497 full-suite tests passed across latest runs; skipped Mailpit test passed separately; shared coverage limitation recorded |
| 5 | Gateway security | Complete for source review, controlled HTTP upstreams and focused downstream tests; deployed workflows remain Steps 6–8 |
| 6 | Business workflows | Complete for the representative local Docker flows: 13 groups passed, 102 Gateway requests; external provider/deployment limits remain |
| 7 | Failure recovery | Complete for the defined local matrix: worker crash, Identity/Audit/PostgreSQL outages, guarded replay and recovery suites passed; limits recorded |
| 8 | Deployment/operations | Complete for local smoke operations: Step 6 images, clean shutdown/readiness, eight database restores and receipt-file restore; deployment configuration and external limits recorded |
| 9 | Assessment | Complete: current hashes verified; per-service evidence and remaining local/deployment limits recorded below |

For every result record: exact command, baseline/hash, environment, exit status, test assertions, skipped checks, failures and report path. Fix confirmed failures, rerun affected checks and record the new evidence. A passing suite does not establish complete behavioral coverage.

## Step 2 evidence — static checks and startup wiring

Completed on 2026-10-07. All 28 initial commands exited with status 0:

- TypeScript: all nine applications, nine shared packages (api-client, contracts, core, correlation, middleware, outbox-kit, resilience, types, validation), and `packages/tsconfig.check.json`.
- Commands: `node node_modules/typescript/bin/tsc --noEmit -p apps/<app>/tsconfig.json`, the equivalent package config commands, and the shared check config command.
- Backend lint: `node scripts/lint-backend.cjs` — 1358 files, zero findings.
- Prisma: `node node_modules/prisma/build/index.js validate --schema apps/<service>/prisma/schema.prisma` for all eight database services. A dummy DATABASE_URL was supplied; schema validation did not connect to or change databases. Migration application and drift remain Step 3.
- Initial command results: `C:\Users\TASHEEN\AppData\Local\Temp\backend-static-1791387998244.json`; detailed command output: the matching `.log` file.
- TypeScript-resolved production import scan: 4579 imports, zero detected cross-application imports, domain-to-application/infrastructure/framework imports, or application-to-infrastructure imports. Report: `C:\Users\TASHEEN\AppData\Local\Temp\backend-import-check-1791387998244.json`. This scans static import declarations; it is not proof against dynamic loading or every architectural coupling.

Startup source inspection traced app-owned Prisma clients into composition roots, plugin registration, internal-auth configuration and shutdown ownership. Different file layouts are legitimate: Notification explicitly drains its workers before disconnecting; Receipt constructs its client in the app; Gateway has no business composition root or database client. Runtime lifecycle assertions across the backend remain part of subsequent verification.

Two confirmed configuration gaps were fixed: Categorization and Receipt Vault accepted `enableInternalAuth: false` in production. Both now reject that option and missing/whitespace-only internal keys before database initialization. Regression tests exercise these conditions and assert the Prisma factory is never called. Categorization's existing production error-sanitization test now uses actual internal authentication.

Post-fix verification:

- `node ../../node_modules/vitest/vitest.mjs run src/bootstrap.unit.test.ts`, from each affected service: Categorization **33 passed**, Receipt **7 passed**; both exit 0. Database operations were mocked; no emails or migrations were executed.
- Both affected application TypeScript commands passed again. Backend lint was rerun after these changes.
- Only four hashed baseline files changed: both apps and their bootstrap tests. Updated hashes: `C:\Users\TASHEEN\AppData\Local\Temp\backend-baseline-step2.json`. Original baseline is retained for comparison.

These results establish static validity and the tested configuration guards. Full service suites, deployed configuration, authorization workflows, migration drift and recovery behavior remain pending in Steps 3–8.

## Step 3 evidence — PostgreSQL foundation

Verified on 2026-10-07 against the local Docker PostgreSQL test server at `127.0.0.1:15432`. Ten uniquely named `codex_test_*_step3_<runId>` databases were created: eight service databases and separate Expense cross-service and Bank outbox fixtures. Application databases were not reset or migrated. Credentials were read privately from the Docker smoke configuration and were not written into reports.

For every fresh database, the runner executed:

1. `node node_modules/prisma/build/index.js migrate deploy --schema apps/<service>/prisma/schema.prisma`
2. `node node_modules/prisma/build/index.js migrate status --schema apps/<service>/prisma/schema.prisma`
3. `node node_modules/prisma/build/index.js migrate diff --from-schema-datasource apps/<service>/prisma/schema.prisma --to-schema-datamodel apps/<service>/prisma/schema.prisma --exit-code`
4. For each service: `node node_modules/vitest/vitest.mjs run --root apps/<service> --config vitest.config.ts <all selected .integration.test.ts files>` with isolated DATABASE_URL and the suite-specific database variables.

All **38 commands** in the final all-service run exited 0. The PostgreSQL catalog of constraints and indexes is included in the report. Custom SQL checks and expression indexes were assessed through migrations, catalogs and database tests; Prisma drift alone does not cover every custom database object.

| Service | Integration files | Tests passed | Principal database checks exercised |
|---|---:|---:|---|
| Identity Access | 2 | 5 | Membership uniqueness, foreign keys/cascades, owner deletion restriction, nested rollback, outbox failure/retry, parallel outbox claims |
| Approval Policy | 4 | 9 | Workspace-scoped parent references, policy name uniqueness, workflow/step/outbox rollback, competing workflow decisions, parallel outbox claims, expiration workers |
| Expense Budgeting | 22 | 131 | Budget/allocation and inventory constraints, cost-allocation tenancy, planning/expense concurrency, settlement/recurring claims, atomic outbox rollback and receipt of category suggestions |
| Audit Compliance | 3 | 19 | Event idempotency/conflicts, account/workspace scoping, retention purge rollback, publisher recovery |
| Bank Feed | 4 | 23 | Workspace relationships, uniqueness, transaction/outbox rollback, session completion, independent outbox leases, cross-service import |
| Notification | 11 | 135 | Persistence scoping, request deduplication, commands/queries, outbox leases, durable email recovery, account notification requests |
| Categorization | 2 | 25 | Scoped rule references, numeric/state constraints, stale writes, competing responses, atomic evaluation/acceptance/outbox persistence |
| Receipt Vault | 1 | 13 | Scoped tags, uniqueness, persisted value constraints, metadata/receipt outbox rollback, stale writes, deletion cleanup events and leases |
| **Total** | **49** | **360** | No skipped tests in these selected files |

Confirmed fix: Approval workflows could reference another workspace's chain at the database boundary; policy violations and exemptions could similarly reference another workspace's policy. Application checks existed, but the database did not enforce these relationships. Added compound unique keys and workspace-scoped foreign keys in Prisma and `20261007000000_enforce_workspace_relationships`. The migration is transactional, preserves records, restricts parent deletion, and fails validation if existing relationships are inconsistent. It was applied only to disposable verification databases. Target environments still need this migration deployed.

Added eight PostgreSQL regression cases: three Identity integrity/rollback tests and five Approval relationship/rollback/concurrency tests. Outbox failures are caused by an actual duplicate event primary key, not a mocked transaction. Failed writes retain aggregate events for retry; competing workflow decisions are checked for one committed winner. Both affected TypeScript checks passed; backend lint passed with **1360 files, zero findings**.

Evidence: `C:\Users\TASHEEN\AppData\Local\Temp\backend-database-1791388982720.json` and matching `.log`. The report records all command arguments, catalog objects and ten cleaned database names. Updated source hashes: `C:\Users\TASHEEN\AppData\Local\Temp\backend-baseline-step3.json`. The temporary runner is `backend-database-step3.cjs` in the same directory.

The strengthened Approval concurrency assertion requires `ConcurrencyConflictError`, preventing unrelated timeouts from being counted as correct rejection. All nine Approval database tests passed again, with migrations/status/drift and fixture cleanup: `C:\Users\TASHEEN\AppData\Local\Temp\backend-database-1791389173470.json` and matching `.log`.

Earlier attempts were not counted as passing evidence: the temporary runner initially used names rejected by test safety checks, and its cleanup regex initially rejected the `e2e` fixture name. Those runner errors were corrected and the leftover runner-owned fixtures removed. The final all-service run completed cleanup successfully. Prisma generation encountered an engine DLL held by a running process; client declarations/JavaScript were generated in staging while retaining the matching native engine. Unexpected Prisma auto-install artifacts from that staging operation were verified and removed from the home directory.

Scope limits: Mailpit delivery was deliberately excluded from this database step; external email was disabled. Files with other test suffixes and the complete service suites remain Step 4. Fresh database migration success does not establish that all existing deployment data will migrate successfully. No production database, live bank account, or email provider was exercised. Cross-workspace references to records owned by other services are application/service contracts, not cross-database foreign keys.

## Step 4 evidence — complete suites and coverage assessment

Verified on 2026-10-07. Command: `BACKEND_VERIFY_COVERAGE=true node scripts/verify-backend-regression.cjs` (environment assigned using PowerShell). The runner creates isolated databases, applies migrations, checks status/drift, runs all nine backend application suites and shared tests, then removes its own databases. Live Resend delivery was disabled. Reports and coverage artifacts were written to the system temporary directory.

The initial all-service run detected one environment-dependent Notification unit test and a Receipt coverage-gate failure. All other suites and application coverage gates passed. The affected complete suites were rerun after fixes; the latest results below combine unchanged successful initial suites with successful affected reruns. They are not a claim that the initial all-service process exited successfully.

| Application/suite | Tests passed | Skipped in general run | Lines/statements | Branches | Functions |
|---|---:|---:|---:|---:|---:|
| Identity Access | 272 | 0 | 80.52% | 81.64% | 70.98% |
| Approval Policy | 690 | 0 | 89.55% | 81.97% | 90.46% |
| Expense Budgeting | 994 | 0 | 89.31% | 82.77% | 86.70% |
| Audit Compliance | 133 | 0 | 76.69% | 80.44% | 76.66% |
| Bank Feed | 106 | 0 | 83.77% | 82.63% | 86.22% |
| Notification | 427 | 1 | 90.40% | 91.94% | 93.82% |
| Categorization | 487 | 0 | 87.00% | 89.38% | 91.13% |
| Receipt Vault | 238 | 0 | 81.82% | 83.05% | 81.86% |
| Gateway | 51 | 0 | 96.41% | 82.38% | 100.00% |
| Shared packages, standalone | 99 | 0 | 61.09% | 71.16% | 48.14% |
| **Full-suite total** | **3497** | **1** | | | |

All nine application suites meet their existing configured coverage thresholds. No thresholds were lowered and no source was excluded to make a gate pass. Service coverage excludes entry-point/type files and other exclusions documented in each Vitest config; these percentages do not measure deployment coverage or guarantee correctness.

The one general-run skip is the opt-in PostgreSQL/Mailpit delivery test. It passed separately using `node scripts/verify-mailpit-regression.cjs`: one queued email was captured locally, marked delivered, and deduplicated on replay. No live email was sent. Evidence: `C:\Users\TASHEEN\AppData\Local\Temp\codex_test_notification_mailpit_1791389479111.log`. The general suite still records its skip honestly; the separate test closes that particular verification gap.

Changes and confirmed gaps addressed:

- Notification's development Mailpit wiring unit test inherited an ambient blank MAILPIT_URL and failed with Invalid URL. The test now supplies its own valid URL, making the intended wiring assertion independent of external environment settings.
- Receipt's 237 existing tests passed, but line/statement coverage was 79.95%, below its 80% gate. Added a real PostgreSQL test for failed-event retry backoff, preservation/idempotency of subscriber receipts, stale lease rejection and completion by the current lease. The final Receipt suite has 238 passing tests and meets the gate. An initial draft of the new test used the pending-event claim API; it was corrected to the failed-event retry API. TypeScript's nullable timestamp diagnostic was also fixed in the test assertion.
- Shared coverage was missing from the verification runner. Added V8 collection for the nine backend-relevant shared packages and enabled it in the runner. Added five internal-auth boundary cases covering production fail-closed behavior, explicit development bypass, configured-key precedence and health-path matching. These tests pass; they do not establish complete shared-package coverage.
- The general runner explicitly disables the opt-in Mailpit integration test, which is run separately under controlled local configuration. The Mailpit verification script now writes its log to the temporary directory instead of adding a generated root log.

Evidence paths:

- Initial all-service run: `C:\Users\TASHEEN\AppData\Local\Temp\expense-backend-regression-1791389326380.json` and matching `.log`; coverage under `expense-coverage-1791389326380` in the same directory.
- Successful full Notification rerun: `expense-backend-regression-1791389564551.json` and matching `.log`; coverage under `expense-coverage-1791389564551/notification-service`.
- Successful full Receipt rerun: `expense-backend-regression-1791389742021.json` and matching `.log`; coverage under `expense-coverage-1791389742021/receipt-vault-service`.
- Shared coverage rerun: `backend-step4-shared-tests.log`, with `backend-step4-shared-coverage/coverage-summary.json`. Exact command: `node node_modules/vitest/vitest.mjs run --config packages/vitest.config.ts --coverage --coverage.reportsDirectory <temporary coverage directory>`.
- Updated hashes: `backend-baseline-step4.json` in the temporary directory. Changed files are the two service test files, shared boundary tests/config, and two verification scripts. No application business implementation was changed in this step.

Affected TypeScript checks (Notification, Receipt, shared tests) passed. Backend lint: **1360 files, zero findings**. Both modified verification scripts passed `node --check`. All verification-created databases were removed by the runners.

Remaining assessment limitations: standalone shared coverage is substantially lower than service coverage. Core is 16.18%, middleware 67.16%, and API-client/validation packages have no measured coverage in this standalone suite. Service tests may exercise shared code, but these reports are not merged across projects; do not equate low standalone coverage with proof of a runtime defect or count it as full shared-code assurance. Production authentication, deployed workflows, failures/recovery and operations remain Steps 5–8. External bank/provider and hosting checks remain unverified.

## Step 5 evidence — Gateway security and authorization boundaries

Verified on 2026-10-07. One confirmed production configuration gap was reproduced and fixed: whitespace-only secrets and short secrets padded with spaces passed the Gateway's minimum-length guards. Both JWT_SECRET and INTERNAL_API_KEY now require at least 32 characters after trimming padding. This validates configured length, not cryptographic entropy. Two parameterized regression cases failed before the change and pass after it.

Verification results (all final commands exited 0):

- Gateway: `node node_modules/vitest/vitest.mjs run --root apps/gateway --config vitest.config.ts --coverage --coverage.reportsDirectory <TEMP>/backend-step5-gateway-coverage` — **58 passed**. Statement/line coverage **97.93%**, branch **89.32%**, function **100%**; configured gates passed. Log: `backend-step5-gateway-tests.log` in the OS temporary directory.
- Identity: the same Vitest command with its service root and `src/modules/identity-workspace/tests/auth.plugin.unit.test.ts src/modules/identity-workspace/tests/auth-error-boundary.test.ts` — **15 passed**. Log: `backend-step5-identity-auth.log`.
- Receipt: its service root and `src/modules/receipt-vault/tests/authorization.routes.unit.test.ts` — **6 passed**. Log: `backend-step5-receipt-auth.log`.
- Receipt upload/storage: its service root and `src/modules/receipt-vault/tests/receipt.service.test.ts src/modules/receipt-vault/tests/local-file-storage.unit.test.ts` — **14 passed**. Log: `backend-step5-receipt-upload.log`.
- Gateway TypeScript: `node node_modules/typescript/bin/tsc --noEmit -p apps/gateway/tsconfig.json` — passed.
- Gateway lint: `node scripts/lint-backend.cjs gateway` — seven files, zero findings. A test-call formatting finding was corrected before this final run.

Gateway tests exercise actual HTTP proxy connections to controlled upstream servers. They cover missing/invalid/expired tokens, revoked sessions, forged identity/internal/forwarded headers, route ownership, bounded proxy failures, throttling and trusted client-IP handling. Added cases verify sanitized 503 responses for malformed or mismatched Identity profiles and 404 responses for three service-only paths, even with supplied internal credentials. Gateway authenticates callers; authoritative workspace and operation permissions remain downstream. Focused Receipt tests exercise actual route middleware with mocked Identity membership responses and Prisma, rejecting insufficient roles, workspace mismatches and denied membership before business calls. Identity session tests also use mocks; these results are not a live database revocation workflow.

Upload source review traced the Receipt route's bounded JSON body, base64 length bounds, allowed MIME types and storage checks. Focused tests verify malformed base64 rejection before storage, large canonical base64 handling, actor ownership, MIME spoofing, path traversal rejection and removal of uploaded bytes after persistence failure. The complete Gateway-to-Receipt upload workflow and an oversized HTTP request through both running services remain Step 6; these focused results do not establish that deployment behavior.

No application databases, external email or bank providers were modified or contacted. Updated source hashes are recorded in `backend-baseline-step5.json` in the temporary directory; only Gateway app and boundary-test hashes changed from Step 4. Real Docker business workflows, outage recovery and production proxy configuration remain Steps 6–8.

## Step 6 evidence — running cross-service business workflows

Completed on **2026-10-08, Asia/Colombo**. The final report uses UTC machine timestamps. Verification used the dedicated `expense-smoke` Docker project: Gateway on 127.0.0.1:13001, eight business services on 13002–13009, PostgreSQL on 15432 and local Mailpit. It created uniquely identified users and workspaces in smoke databases; fixture records are retained there. Developer application databases were not reset or migrated, and no live bank or email provider was contacted.

Preparation and final commands all exited 0:

1. `node scripts/prepare-gateway-workflow.cjs` — migration deploy/status/diff passed for all eight smoke databases. The new Approval workspace foreign-key migration was applied to this smoke environment. Log: `gateway-workflow-migrations-1791401495621.log` in the OS temporary directory.
2. `docker compose -p expense-smoke --env-file .env.docker-smoke -f docker-compose.yml -f docker-compose.mailpit.yml -f docker-compose.smoke.yml build gateway identity-access-service expense-budgeting-service categorization-service approval-policy-service bank-feed-service receipt-vault-service notification-service audit-compliance-service` — nine images built. Log: `backend-step6-docker-build.log`.
3. The same Compose configuration with `up -d --no-build --pull never --wait --wait-timeout 180` and those nine services — healthy startup; reconciled after all image exports completed. Log: `backend-step6-docker-start.log`.
4. `node scripts/gateway-workflow-smoke.cjs` — **13 workflow groups passed**, **102 Gateway HTTP requests**, final exit 0. Log: `backend-step6-workflows-verified.log`; JSON report: `gateway-workflow-results-1791402481993.json`.
5. `node --check scripts/gateway-workflow-smoke.cjs` — passed. No application TypeScript implementation changed in this step.

Verified workflows:

- Registration, login, workspace creation, invitation acceptance, outsider rejection across all eight service contexts, forged-header rejection and insufficient-role denial.
- Expense approval updates persisted expense status and budget spending; requester approval and budget-creator alerts reach the correct notification records. Completion replay preserves the expense version.
- Category suggestion acceptance updates the expense through the outbox; both destinations acknowledge delivery, audit records are readable and replay preserves the expense version.
- Cost allocation rejects a foreign-workspace department without writing rows, then persists the correct target and amount. Budget plans create, activate and archive, with foreign-workspace record access rejected.
- Purchase-order create/item/submit/approve/receive persists five stock units and one inventory movement. A second receive is rejected without changing stock or movement count.
- Receipt upload/download uses private storage; MIME spoofing and an oversized HTTP upload are rejected through Gateway. Duplicate content, another actor's download and a foreign expense link are rejected. Bytes survive a service restart; permanent deletion removes the file and its download route returns 404.
- Bank sync uses a controlled local HTTP provider fixture. Duplicate rows are deduplicated, immediate repeat sync is throttled, foreign expense import is rejected without changing transaction state, and same-workspace import succeeds.
- Manual workflow rejection propagates to expense status and requester notification. Active spending-policy dry-run detects a violation without persisting violations; foreign-workspace policy access is rejected.
- Audit outage produces sanitized proxy errors and degraded readiness while an expense commits and its durable event retries; after recovery the event and audit record complete. Identity outage fails closed, restored Identity permits access, and logout invalidates subsequent Expense access through Gateway.

The script was expanded with those missing workflow assertions, request pacing, explicit failure reporting and unique report filenames. Preparatory failures were corrected test assumptions: a foreign allocation uses the existing 400 contract, plan transitions use PATCH, MIME spoofing needs distinct bytes to avoid hash deduplication, rejection uses `comments`, and its amount must exceed automatic approval. Fast repeated fixtures also reached legitimate registration/session-check quotas. Isolated Identity was restarted between preparatory runs, and final requests were paced without increasing production quotas, disabling limits or retrying writes. These failures are not counted as successful evidence; only the final complete run is counted above. No new production defect was confirmed by this step.

Running image identities are recorded in `backend-step6-images.txt`. Compose retained cached Identity and Bank containers with different image identifiers; their compiled application and shared source hashes were compared with the newly built images using network-disabled, entrypoint-overridden containers and matched exactly. Identity hash: `b718f75310f1c82527de6861ad4c398ac2940829a3862a89cbb43d29e2711166`; Bank hash: `798b9a9c11f5698cb9d95221942e946bbaed854996ab9a11adcb0bc0630632b2`. This comparison establishes matching tested source, not byte-for-byte identity of every image layer. All nine backend containers were healthy after the final run and controlled outages were restored.

Updated manifest: `backend-baseline-step6.json` in the temporary directory, with 1532 hashes. Only `scripts/gateway-workflow-smoke.cjs` changed from Step 5. These are representative business-path assertions across actual services and databases, not exhaustive execution of every endpoint, forecast variant or policy rule. Notification uses development mode because production deliberately forbids Mailpit. Real bank sandbox behavior, production email/provider deployment and public HTTPS remain externally unverified. Step 7 still requires the broader failure/recovery matrix; Step 8 still requires operations and restoration checks.

## Step 7 evidence — failures, durable retries and recovery

Completed on **2026-10-08, Asia/Colombo**, using the Step 6 smoke services and newly created verification databases. Application implementation hashes did not change. The verification runners created fixture users/workspaces and audit rows in smoke databases, briefly stopped only smoke containers, and restored them. No developer application database was reset, no historical event was deleted or requeued, and no live bank/email provider was used.

Final checks and evidence:

| Check | Result | Evidence in OS temporary directory |
|---|---|---|
| Real publishing-worker crash after receiver commit, before acknowledgement | Worker killed with PROCESSING event and no delivery marker; real 60-second lease elapsed; replacement worker delivered again; event PROCESSED, two deliveries, one Audit row | `backend-load-recovery-1791402693231.json` and matching `.log`; launcher log `backend-step7-crash.log` |
| Sustained Identity outage | Six protected requests returned 503, Gateway stayed live, and the same session worked after restoration | Same recovery report; duration through recovery 46912 ms |
| Sustained Audit outage | Expense committed, readiness degraded, event remained FAILED rather than PROCESSED or DEAD_LETTER, then recovered to PROCESSED with one audit row | `backend-downstream-outage-1791402879555.json`; `backend-step7-audit-outage-final.log` |
| PostgreSQL outage | Gateway stayed live and readiness returned 503; protected write rejected with 503; zero rows for rejected title after recovery; same session created exactly one new expense without restarting application services | `backend-database-outage-1791402998540.json`; `backend-step7-database-outage.log` |
| Guarded dead-letter recovery | 11 tests passed, including real PostgreSQL replay, proven-owner repair, refusal of missing/conflicting ownership, failure retention and idempotent rerun | `backend-step7-maintenance.log` |
| Expense full suite | 994 passed | `expense-backend-regression-1791402694256.json` and matching `.log` |
| Notification full suite | 427 passed; one live Mailpit test intentionally skipped | Same regression report |
| Shared package suite | 99 passed | Same regression report |

This step's automated suites total **1531 passing tests** and **one explicitly skipped Mailpit test**, plus four real process/service outage scenarios. All final commands exited 0:

- `node scripts/backend-load-recovery.cjs --recovery-only`
- `node --test scripts/outbox-recovery-policy.test.cjs scripts/outbox-maintenance.integration.test.cjs`
- `BACKEND_VERIFY_SERVICES=expense-budgeting-service,notification-service,shared-packages node scripts/verify-backend-regression.cjs` (environment variable supplied using PowerShell on this host)
- `node scripts/backend-downstream-outage.cjs`
- `node scripts/backend-downstream-outage.cjs --database`
- `node --check scripts/backend-load-recovery.cjs` and `node --check scripts/backend-downstream-outage.cjs`

The suite evidence covers transactional business/outbox rollback, expired-lease recovery and stale-owner fencing, subscriber progress retained across retries, HTTP 429/503 retryability, permanent rejection/dead-letter handling, retry exhaustion, graceful batch draining and replay identity conflicts. Notification recovery tests use real PostgreSQL and controlled provider implementations to test provider-acceptance ambiguity, preserved idempotency keys/content, prepared attempts, provider-window limits, terminal failures and concurrent deduplication. These are not live Resend guarantees. The worker crash uses the actual Expense repository and shared worker/publisher with a local relay forwarding to running Audit; the first committed acknowledgement is deliberately withheld. Transport is at least once; the single Audit row proves idempotent effects for this case, not universally exactly-once delivery.

Verification-runner fixes: recovery-only previously depended on a historical root report and copied old results; it now reports only this run and uses the actual smoke Gateway with quotas enabled. Bundling uses the esbuild API, with compiled fixtures, logs and unique reports in the temporary directory. Child helpers are hidden on Windows. The outage runner likewise stores reports in the temporary directory and now supports the PostgreSQL availability scenario. An initial Audit setup request returned 503 because the concurrent Identity scenario had deliberately stopped Identity; the Audit scenario was rerun sequentially after Identity restoration and passed. That initial overlapping fixture failure is excluded from successful evidence.

All test-created recovery/regression databases were removed; a read-only PostgreSQL catalog check found no crash/recovery fixtures or databases with the regression run suffix. All nine backend smoke containers, PostgreSQL and Mailpit were healthy after restoration. Smoke business/audit fixtures remain for review. Updated manifest: `backend-baseline-step7.json` (1532 hashes); only the two recovery scripts changed from Step 6. No application bug was confirmed in the tested recovery paths.

Limits: this is a bounded local failure matrix, not arbitrary-duration fault injection or a distributed failover test. A real publishing-process crash was exercised for Expense/Audit; other services' claim/recovery implementations retain the unchanged Step 3 database evidence rather than each receiving a new process-kill test here. PostgreSQL availability recovery did not test host/volume loss, backup restoration or corruption. Email ambiguity tests use controlled providers; the previously verified Mailpit delivery was not rerun here. Long-term retention, backup restoration, production topology and external providers remain Step 8/external verification scope.

## Step 8 evidence — local operations and coordinated restoration

Completed on **2026-10-08, Asia/Colombo**. The existing `scripts/verify-database-backup.cjs` now uploads a real fixture receipt through Gateway, stops all nine smoke backend containers, backs up the eight smoke databases and Receipt upload volume, restores into newly created disposable databases/volume, compares results, cleans up only those restore targets and restarts the services. All nine shutdown exit codes were **0**. Developer application databases and the original upload volume were not reset or replaced.

Successful commands (exit 0):

- `node --check scripts/verify-database-backup.cjs`
- `node scripts/verify-database-backup.cjs`
- `docker compose -p expense-smoke --env-file .env.docker-smoke -f docker-compose.yml -f docker-compose.mailpit.yml -f docker-compose.smoke.yml config --quiet`
- The same Compose invocation with `up -d --no-build --pull never --wait --wait-timeout 180 gateway identity-access-service expense-budgeting-service categorization-service approval-policy-service bank-feed-service receipt-vault-service notification-service audit-compliance-service`.

All **74 tables** restored with matching row counts and content fingerprints: Identity 7, Expense 30, Approval 8, Audit 3, Bank 5, Notification 10, Categorization 5 and Receipt 6. Constraint definitions and indexes matched after PostgreSQL reparsing of CHECK expressions. Each database's dump and source comparison share an exported repeatable-read snapshot; stopped application processes provide coordination across the separate database/file backups. Content fingerprints establish equality for this drill, not encrypted backup authenticity.

The upload-volume backup restored **3 files**, with identical SHA-256 hashes and sizes. All **3 active local receipt references**, including the new fixture, matched the restored bytes. Verification ran as the Receipt image's default application user, proving those files were readable after ownership restoration. Restore helpers had network access disabled; original uploads were mounted read-only. This verified database contents/catalogs and file restoration, rather than rerouting all eight running services to restored databases for another workflow suite.

Private artifacts, which include database contents and must not be committed:

- `C:\Users\TASHEEN\AppData\Local\Temp\expense-backup-1791403524898_3ae4c7d8a2b441b29e59ce1a58ffd3f9`: eight dumps, receipt bytes, `receipt-files-manifest.json` and `restore-results.json`.
- `backend-step8-restore-final.log`, `backend-step8-readiness.log` and `backend-step8-compose-guards.json` in the same OS temporary directory.

An earlier drill failed because restored PostgreSQL CHECK text flattened associative AND parentheses. The verifier now reparses CHECK definitions in temporary tables before comparison, preserving operators and precedence. That failed run is excluded from the successful evidence. Final cleanup checks found no databases or restore volume belonging to the successful run. All nine backend containers, PostgreSQL and Mailpit returned healthy; Gateway `/health` returned 200.

One confirmed deployment gap was fixed: Compose no longer supplies known fallback PostgreSQL/Redis passwords. Both must be explicitly configured; `.env.example` and the operations guide explain this. Three real Compose CLI checks passed: missing PostgreSQL password rejected, missing Redis password rejected, explicit secrets accepted. The ignored smoke configuration received a generated Redis password, without changing its existing database password. **Root `.env` still lacks both Compose password variables**: configure the existing database password and a Redis password before using root Compose. Changing an environment variable does not rotate an existing PostgreSQL role password.

The CI workflow's artifact upload now matches timestamped Gateway reports with `gateway-workflow-results-*.json`. This is a configuration correction; a hosted GitHub CI run was not executed here. Step 6 images were reused because production application hashes were unchanged in Steps 7–8; no fresh Step 8 application rebuild is claimed. Updated private manifest: `backend-baseline-step8.json`, 1532 hashes.

Limits: this planned-outage drill does not establish online backups, point-in-time recovery, host-loss recovery, encrypted/offsite retention, production restore time objectives or multi-instance failover. Public hosting, HTTPS/trusted-proxy deployment and live bank-provider behavior remain externally unverified. Notification uses the local Mailpit configuration; no live emails were sent during this step. See [backend operations](backend-operations.md) for operational instructions.

## Step 9 assessment — final evidence-based review

Completed on **2026-10-08, Asia/Colombo**. Recomputed all **1532** Step 8 manifest hashes: no changed or missing files. The cited static, database, suite, Gateway workflow, failure-recovery and restoration reports remain present. This step assesses that evidence; it did not rerun every suite or perform a fresh file-by-file review. No application implementation changed during this assessment.

**Overall judgement:** a strong, locally verified portfolio backend, with meaningful authorization, transactional persistence and recovery evidence. It is ready to support frontend integration in the tested local setup. Production deployment approval remains separate. Scores would be subjective engineering judgements, not measured percentages of correctness; no exact correctness score is assigned.

The architecture is coherent for demonstrating distributed-system skills: service-owned databases, domain/application/infrastructure boundaries, injected composition, command/query use cases and transactional outboxes. Its operational cost is substantial for an expense tracker: nine applications, eight databases and at-least-once integration require migrations, credentials, deduplication and recovery procedures. This is a tradeoff to explain in interviews, not proof the architecture is invalid. Identical folders and additional abstractions are not goals in themselves.

| Application | Evidence-based judgement | Verified strengths | Remaining service-specific limits |
|---|---|---|---|
| Identity Access / identity-workspace | Strong local foundation | 272 suite tests; membership/owner integrity and rollback; actual registration, invitation acceptance, logout revocation and outage fail-closed behavior | 80.52% line and 70.98% function coverage leave unexecuted paths; no public identity deployment or sustained capacity test |
| Approval Policy / approval-workflow and policy-controls | Strong local implementation | 690 suite tests; workspace-scoped foreign keys; competing decisions and atomic events; real approval/rejection propagation and policy dry-run isolation | New relationship migration is verified on disposable and smoke databases, not developer/target application databases; not every policy/workflow combination exercised through Gateway |
| Expense Budgeting / five modules | Strongest breadth of local business evidence | 994 suite tests; expense/budget propagation, plan lifecycle, cost-allocation tenancy, inventory receiving, bank/category imports; real publisher crash, outage recovery and atomic rollback | Complex multi-module interactions merit continuing regression coverage; representative flows do not exhaust every forecast, settlement, recurrence or concurrent business scenario |
| Categorization / categorization-rules | Strong local implementation | 487 suite tests; competing responses/stale writes; reliable accepted-suggestion delivery changes the expense and deduplicates replay; production auth bypass rejected | Not every rule combination or suggestion volume exercised in deployed flows; full route-catalog reconciliation remains open |
| Bank Feed / bank-feed-sync | Sound locally, provider readiness unverified | 106 suite tests; scoped persistence, deduplication, sessions and leases; controlled HTTP sync, throttling and expense import | Real bank-provider sandbox credentials and compatibility evidence are absent; do not advertise tested live banking integration |
| Receipt Vault / receipt-vault | Strong local storage and isolation evidence | 238 suite tests; private download authorization, MIME/size checks, durable cleanup; bytes survive restart and restore with matching active references | Local filesystem backend was exercised; target object storage, retention, offsite protection and production storage topology remain unverified |
| Notification / notification-dispatch | Strong local durability evidence | 427 suite tests; persistent request/email deduplication and recovery; correct requester/budget-creator audiences; separately passing Mailpit delivery test | Smoke deployment uses development Mailpit configuration; controlled providers do not establish live-provider idempotency guarantees or target production sender configuration |
| Audit Compliance / audit-compliance | Sound local consumer foundation | 133 suite tests; workspace reads, event identity/conflict checks, retention rollback; actual replay produces one Audit row and downstream outage recovers | 76.69% line coverage; no production retention schedule, external compliance certification or tamper-resistant archive evidence |
| Gateway | Strong local edge security evidence | 58 latest focused suite tests, 97.93% lines; real HTTP proxy boundaries, forged-header/internal-path rejection, logout and fail-closed outages | Exact public HTTPS/proxy trust configuration is not deployed; current in-process quotas need reassessment before multiple replicas |

Test counts above are not independent module scores. Step 4 recorded **3497 passing full-suite tests** across the latest successful service runs, with one general-run Mailpit skip that passed separately. Gateway subsequently increased from 51 to 58 tests in Step 5. Step 7 reruns overlap earlier suites and must not be added as unique tests. PostgreSQL and deployed workflow counts likewise measure different overlapping evidence, not a single correctness percentage.

### Remaining actions, separated by what is actually known

**Required configuration before using root Compose:** root `.env` needs explicit PostgreSQL and Redis passwords. Preserve the existing database credential until deliberately rotating it. The smoke configuration passes the new guards. Do not paste credentials into reports or commit secret environment files.

**Before deploying an existing target:** deploy pending migrations after inspecting its current data, including Approval workspace relationship constraints; validate migration status/drift there. Configure private service connectivity, HTTPS, precise trusted-proxy addresses and production secrets. Verify the production email sender/provider. A hosted GitHub CI run following the artifact-path fix has not been demonstrated in this pass.

**Known verification gaps:** shared standalone coverage remains **61.09% lines and 48.14% functions**, with Core at 16.18% lines and no measured standalone API-client/validation coverage. Service reports are not merged shared-code coverage. The 273 static route declarations are an inventory, not a completed reconciliation of every live route or meaningful test coverage for every endpoint. Representative end-to-end flows passed; exhaustive route and use-case mapping remains unfinished. The real publisher-process kill was tested for Expense/Audit, not independently for every producer. No sustained high-volume capacity or multi-replica failover result is claimed.

**Operational limits before real users:** local database/file restoration passed, but scheduled encrypted/offsite backups, retention, point-in-time recovery and host-loss recovery are not established. Choose target recovery objectives and exercise the restored application against that topology. Root/developer historical queues were not re-inspected in this final pass; smoke success cannot establish that every developer historical record is deliverable.

**External integration limits:** real bank sandbox and public hosting remain unavailable. The local Mailpit and controlled-provider tests are sufficient for frontend development, not proof of live bank/provider behavior. Earlier live email receipt in the conversation is historical evidence, not a revalidated current production configuration.

No unresolved failing assertion is recorded in the final successful checks. That is narrower than a claim that all backend bugs have been found. Continue with frontend integration against the local backend, retain these regression checks, and resolve target-dependent requirements before a public release.

## Endpoint inventory

The following **273 source route declarations** were extracted with the TypeScript parser from production Fastify-style get/post/patch/put/delete/head/options/all calls. These are not a count of unique live endpoints. Plugin registration, nested prefixes, aliases, conditional registration and Gateway proxy expansion must be verified against running apps in Steps 5–6. Hook hints and path labels are inventory aids, not authorization proof. Runtime printRoutes/OpenAPI and endpoint tests must reconcile this catalog, including any dynamically constructed routes the scan cannot resolve.

Most module registration roots use /api/v1; paths below are deliberately shown exactly as declared. Expense's consumer also has a direct root registration. Gateway proxy prefixes are listed separately.

### identity-access-service

| Method | Declared path | Source | Initial scope hint |
|---|---|---|---|
| GET | `/health` | [service root:69](../apps/identity-access-service/src/app.ts) | operations |
| POST | `/auth/register` | [identity-workspace:32](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/auth.routes.ts) | user/API candidate |
| POST | `/auth/login` | [identity-workspace:48](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/auth.routes.ts) | user/API candidate |
| GET | `/auth/me` | [identity-workspace:64](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/auth.routes.ts) | user/API candidate |
| POST | `/auth/logout` | [identity-workspace:78](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/auth.routes.ts) | user/API candidate |
| GET | `/users/:userId` | [identity-workspace:95](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/auth.routes.ts) | user/API candidate |
| PATCH | `/users/:userId` | [identity-workspace:110](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/auth.routes.ts) | user/API candidate |
| GET | `/invitations/:token` | [identity-workspace:29](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/invitation.routes.ts) | user/API candidate |
| POST | `/invitations/:token/accept` | [identity-workspace:48](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/invitation.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/invitations` | [identity-workspace:69](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/invitation.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/invitations` | [identity-workspace:87](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/invitation.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/invitations/:invitationId` | [identity-workspace:104](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/invitation.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/members` | [identity-workspace:26](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/member.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/members/:userId` | [identity-workspace:43](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/member.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/members/:userId` | [identity-workspace:58](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/member.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/members/:userId/role` | [identity-workspace:77](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/member.routes.ts) | user/API candidate |
| POST | `/workspaces` | [identity-workspace:30](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/workspace.routes.ts) | user/API candidate |
| GET | `/workspaces` | [identity-workspace:47](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/workspace.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId` | [identity-workspace:68](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/workspace.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId` | [identity-workspace:83](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/workspace.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId` | [identity-workspace:101](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/workspace.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/ownership/transfer` | [identity-workspace:120](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/workspace.routes.ts) | user/API candidate |

### approval-policy-service

| Method | Declared path | Source | Initial scope hint |
|---|---|---|---|
| GET | `/health` | [service root:72](../apps/approval-policy-service/src/app.ts) | operations |
| POST | `/workspaces/:workspaceId/approval-chains` | [approval-workflow:41](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/approval-chain.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/approval-chains` | [approval-workflow:64](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/approval-chain.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/approval-chains/:chainId` | [approval-workflow:84](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/approval-chain.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/approval-chains/:chainId` | [approval-workflow:102](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/approval-chain.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/approval-chains/:chainId/activate` | [approval-workflow:125](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/approval-chain.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/approval-chains/:chainId/deactivate` | [approval-workflow:144](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/approval-chain.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/approval-chains/:chainId` | [approval-workflow:163](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/approval-chain.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/workflows` | [approval-workflow:51](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/workflow.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/workflows/pending-approvals` | [approval-workflow:74](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/workflow.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/workflows/user-workflows` | [approval-workflow:94](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/workflow.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/workflows/:expenseId` | [approval-workflow:114](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/workflow.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/workflows/:expenseId/approve` | [approval-workflow:132](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/workflow.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/workflows/:expenseId/reject` | [approval-workflow:155](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/workflow.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/workflows/:expenseId/delegate` | [approval-workflow:178](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/workflow.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/workflows/:expenseId/cancel` | [approval-workflow:201](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/workflow.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/exemptions` | [policy-controls:35](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/exemption.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/exemptions` | [policy-controls:58](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/exemption.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/exemptions/active` | [policy-controls:81](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/exemption.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/exemptions/:exemptionId` | [policy-controls:104](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/exemption.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/exemptions/:exemptionId/approve` | [policy-controls:123](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/exemption.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/exemptions/:exemptionId/reject` | [policy-controls:146](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/exemption.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/exemptions/expire` | [policy-controls:169](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/exemption.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/policies` | [policy-controls:34](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/policy.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/policies/evaluate` | [policy-controls:57](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/policy.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/policies/check` | [policy-controls:80](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/policy.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/policies` | [policy-controls:103](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/policy.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/policies/:policyId` | [policy-controls:126](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/policy.routes.ts) | user/API candidate |
| PUT | `/workspaces/:workspaceId/policies/:policyId` | [policy-controls:145](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/policy.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/policies/:policyId` | [policy-controls:168](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/policy.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/policies/:policyId/activate` | [policy-controls:187](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/policy.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/policies/:policyId/deactivate` | [policy-controls:206](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/policy.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/violations` | [policy-controls:37](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/violation.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/violations/stats` | [policy-controls:60](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/violation.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/violations/:violationId` | [policy-controls:83](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/violation.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/violations` | [policy-controls:102](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/violation.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/violations/:violationId/acknowledge` | [policy-controls:125](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/violation.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/violations/:violationId/resolve` | [policy-controls:148](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/violation.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/violations/:violationId/exempt` | [policy-controls:171](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/violation.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/violations/:violationId/override` | [policy-controls:194](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/violation.routes.ts) | user/API candidate |

### expense-budgeting-service

| Method | Declared path | Source | Initial scope hint |
|---|---|---|---|
| GET | `/health` | [service root:76](../apps/expense-budgeting-service/src/app.ts) | operations |
| POST | `/workspaces/:workspaceId/budgets` | [budget-management:54](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/budgets` | [budget-management:79](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/budgets/:budgetId` | [budget-management:103](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/budgets/:budgetId` | [budget-management:125](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/budgets/:budgetId/activate` | [budget-management:150](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/budgets/:budgetId/archive` | [budget-management:173](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/budgets/:budgetId` | [budget-management:196](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/budgets/:budgetId/allocations` | [budget-management:222](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/budgets/:budgetId/allocations` | [budget-management:247](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/budgets/:budgetId/allocations/:allocationId` | [budget-management:271](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/budgets/:budgetId/allocations/:allocationId` | [budget-management:296](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/budgets/alerts/unread` | [budget-management:322](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/budgets/alerts/:alertId/read` | [budget-management:345](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/budget.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/spending-limits` | [budget-management:42](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/spending-limit.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/spending-limits` | [budget-management:67](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/spending-limit.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/spending-limits/:limitId` | [budget-management:91](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/spending-limit.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/spending-limits/:limitId` | [budget-management:113](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/spending-limit.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/spending-limits/:limitId` | [budget-management:138](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/spending-limit.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/budget-plans` | [budget-planning:45](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/budget-plan.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/budget-plans` | [budget-planning:71](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/budget-plan.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/budget-plans/:id` | [budget-planning:96](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/budget-plan.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/budget-plans/:id` | [budget-planning:119](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/budget-plan.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/budget-plans/:id` | [budget-planning:145](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/budget-plan.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/budget-plans/:id/activate` | [budget-planning:172](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/budget-plan.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/budget-plans/:id/archive` | [budget-planning:196](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/budget-plan.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/budget-plans/:planId/forecasts` | [budget-planning:55](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/forecast.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/budget-plans/:planId/forecasts` | [budget-planning:81](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/forecast.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/forecasts/:id` | [budget-planning:104](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/forecast.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/forecasts/:id` | [budget-planning:127](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/forecast.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/forecasts/:forecastId/items` | [budget-planning:158](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/forecast.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/forecasts/:forecastId/items` | [budget-planning:184](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/forecast.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/forecast-items/:itemId` | [budget-planning:209](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/forecast.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/budget-plans/:planId/scenarios` | [budget-planning:42](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/scenario.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/budget-plans/:planId/scenarios` | [budget-planning:68](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/scenario.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/scenarios/:id` | [budget-planning:91](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/scenario.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/scenarios/:id` | [budget-planning:114](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/scenario.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/scenarios/:id` | [budget-planning:140](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/scenario.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/departments` | [cost-allocation:53](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/departments` | [cost-allocation:76](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/departments/:departmentId` | [cost-allocation:99](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| PUT | `/workspaces/:workspaceId/departments/:departmentId` | [cost-allocation:118](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/departments/:departmentId` | [cost-allocation:141](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/departments/:departmentId/activate` | [cost-allocation:163](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/cost-centers` | [cost-allocation:186](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/cost-centers` | [cost-allocation:209](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/cost-centers/:costCenterId` | [cost-allocation:232](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| PUT | `/workspaces/:workspaceId/cost-centers/:costCenterId` | [cost-allocation:251](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/cost-centers/:costCenterId` | [cost-allocation:274](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/cost-centers/:costCenterId/activate` | [cost-allocation:296](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/projects` | [cost-allocation:319](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/projects` | [cost-allocation:342](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/projects/:projectId` | [cost-allocation:365](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| PUT | `/workspaces/:workspaceId/projects/:projectId` | [cost-allocation:384](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/projects/:projectId` | [cost-allocation:407](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/projects/:projectId/activate` | [cost-allocation:429](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/allocation-management.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/expenses/:expenseId/allocations` | [cost-allocation:30](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/expense-allocation.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/expenses/:expenseId/allocations` | [cost-allocation:53](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/expense-allocation.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/expenses/:expenseId/allocations` | [cost-allocation:72](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/expense-allocation.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/allocations/summary` | [cost-allocation:94](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/expense-allocation.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/expenses/:expenseId/attachments` | [expense-ledger:52](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/attachment.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/expenses/:expenseId/attachments/:attachmentId` | [expense-ledger:76](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/attachment.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/expenses/:expenseId/attachments/:attachmentId` | [expense-ledger:98](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/attachment.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/expenses/:expenseId/attachments` | [expense-ledger:120](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/attachment.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/categories` | [expense-ledger:55](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/category.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/categories/:categoryId` | [expense-ledger:80](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/category.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/categories/:categoryId` | [expense-ledger:105](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/category.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/categories/:categoryId` | [expense-ledger:128](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/category.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/categories` | [expense-ledger:150](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/category.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/expenses/:expenseId/split` | [expense-ledger:63](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense-split.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/splits/:splitId` | [expense-ledger:87](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense-split.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/expenses/:expenseId/split` | [expense-ledger:109](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense-split.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/splits` | [expense-ledger:131](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense-split.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/splits/:splitId` | [expense-ledger:155](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense-split.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/settlements/:settlementId/payment` | [expense-ledger:177](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense-split.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/settlements` | [expense-ledger:201](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense-split.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/splits/:splitId/settlements` | [expense-ledger:225](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense-split.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/expenses` | [expense-ledger:62](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/expenses` | [expense-ledger:86](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/expenses/filter` | [expense-ledger:110](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/expenses/statistics` | [expense-ledger:134](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/expenses/:expenseId` | [expense-ledger:158](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/expenses/:expenseId` | [expense-ledger:180](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/expenses/:expenseId` | [expense-ledger:204](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/expenses/:expenseId/submit` | [expense-ledger:226](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/expenses/:expenseId/approve` | [expense-ledger:248](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/expenses/:expenseId/reject` | [expense-ledger:271](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/expenses/:expenseId/reimburse` | [expense-ledger:296](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/expense.routes.ts) | user/API candidate |
| POST | `/event-outbox/events` | [expense-ledger:122](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/outbox-event.routes.ts) | internal candidate |
| POST | `/workspaces/:workspaceId/recurring` | [expense-ledger:50](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/recurring-expense.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/recurring/:id/pause` | [expense-ledger:73](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/recurring-expense.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/recurring/:id/resume` | [expense-ledger:94](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/recurring-expense.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/recurring/:id/stop` | [expense-ledger:115](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/recurring-expense.routes.ts) | user/API candidate |
| POST | `/recurring/trigger` | [expense-ledger:136](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/recurring-expense.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/tags` | [expense-ledger:55](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/tag.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/tags/:tagId` | [expense-ledger:80](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/tag.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/tags/:tagId` | [expense-ledger:105](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/tag.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/tags/:tagId` | [expense-ledger:128](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/tag.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/tags` | [expense-ledger:150](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/tag.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/locations` | [inventory-management:37](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/location.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/locations` | [inventory-management:62](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/location.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/locations/:locationId` | [inventory-management:86](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/location.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/locations/:locationId` | [inventory-management:106](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/location.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/locations/:locationId` | [inventory-management:131](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/location.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/purchase-orders` | [inventory-management:44](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/purchase-order.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/purchase-orders` | [inventory-management:69](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/purchase-order.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/purchase-orders/:purchaseOrderId` | [inventory-management:93](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/purchase-order.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/purchase-orders/:purchaseOrderId` | [inventory-management:113](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/purchase-order.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/purchase-orders/:purchaseOrderId` | [inventory-management:138](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/purchase-order.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/purchase-orders/:purchaseOrderId/submit` | [inventory-management:161](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/purchase-order.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/purchase-orders/:purchaseOrderId/approve` | [inventory-management:181](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/purchase-order.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/purchase-orders/:purchaseOrderId/receive` | [inventory-management:204](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/purchase-order.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/purchase-orders/:purchaseOrderId/cancel` | [inventory-management:225](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/purchase-order.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/purchase-orders/:purchaseOrderId/items` | [inventory-management:245](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/purchase-order.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/purchase-orders/:purchaseOrderId/items/:itemId` | [inventory-management:270](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/purchase-order.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/stock/adjust` | [inventory-management:40](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/stock.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/stock/:stockId/settings` | [inventory-management:64](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/stock.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/stock` | [inventory-management:87](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/stock.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/stock/transactions` | [inventory-management:111](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/stock.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/suppliers` | [inventory-management:37](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/supplier.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/suppliers` | [inventory-management:62](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/supplier.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/suppliers/:supplierId` | [inventory-management:86](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/supplier.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/suppliers/:supplierId` | [inventory-management:106](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/supplier.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/suppliers/:supplierId` | [inventory-management:131](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/supplier.routes.ts) | user/API candidate |

### categorization-service

| Method | Declared path | Source | Initial scope hint |
|---|---|---|---|
| GET | `/health` | [service root:56](../apps/categorization-service/src/app.ts) | operations |
| POST | `/workspaces/:workspaceId/rules` | [categorization-rules:40](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-rule.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/rules` | [categorization-rules:63](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-rule.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/rules/:ruleId` | [categorization-rules:86](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-rule.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/rules/:ruleId` | [categorization-rules:105](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-rule.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/rules/:ruleId` | [categorization-rules:128](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-rule.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/rules/:ruleId/activate` | [categorization-rules:150](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-rule.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/rules/:ruleId/deactivate` | [categorization-rules:169](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-rule.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/rules/:ruleId/executions` | [categorization-rules:188](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-rule.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/suggestions` | [categorization-rules:39](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-suggestion.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/suggestions` | [categorization-rules:62](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-suggestion.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/suggestions/:suggestionId` | [categorization-rules:85](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-suggestion.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/suggestions/expense/:expenseId` | [categorization-rules:104](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-suggestion.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/suggestions/:suggestionId/accept` | [categorization-rules:125](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-suggestion.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/suggestions/:suggestionId/reject` | [categorization-rules:144](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-suggestion.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/suggestions/:suggestionId` | [categorization-rules:163](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/category-suggestion.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/evaluate` | [categorization-rules:35](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/rule-execution.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/executions/expense/:expenseId` | [categorization-rules:58](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/rule-execution.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/executions` | [categorization-rules:79](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/rule-execution.routes.ts) | user/API candidate |

### bank-feed-service

| Method | Declared path | Source | Initial scope hint |
|---|---|---|---|
| GET | `/health` | [service root:63](../apps/bank-feed-service/src/app.ts) | operations |
| POST | `/workspaces/:workspaceId/bank-feed-sync/connections` | [bank-feed-sync:46](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/bank-connection.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/bank-feed-sync/connections` | [bank-feed-sync:71](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/bank-connection.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId` | [bank-feed-sync:92](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/bank-connection.routes.ts) | user/API candidate |
| PUT | `/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId/token` | [bank-feed-sync:112](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/bank-connection.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId/disconnect` | [bank-feed-sync:137](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/bank-connection.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId` | [bank-feed-sync:160](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/bank-connection.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/bank-feed-sync/transactions/pending` | [bank-feed-sync:47](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/bank-transaction.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/bank-feed-sync/transactions/:transactionId` | [bank-feed-sync:68](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/bank-transaction.routes.ts) | user/API candidate |
| PUT | `/workspaces/:workspaceId/bank-feed-sync/transactions/:transactionId/process` | [bank-feed-sync:88](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/bank-transaction.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/bank-feed-sync/transactions/connection/:connectionId` | [bank-feed-sync:109](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/bank-transaction.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId/sync` | [bank-feed-sync:46](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/transaction-sync.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/bank-feed-sync/connections/:connectionId/sync/history` | [bank-feed-sync:71](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/transaction-sync.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/bank-feed-sync/sync/:sessionId` | [bank-feed-sync:92](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/transaction-sync.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/bank-feed-sync/sync/active` | [bank-feed-sync:112](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/transaction-sync.routes.ts) | user/API candidate |

### receipt-vault-service

| Method | Declared path | Source | Initial scope hint |
|---|---|---|---|
| GET | `/health` | [service root:51](../apps/receipt-vault-service/src/app.ts) | operations |
| GET | `/workspaces/:workspaceId/receipts/:receiptId/download` | [receipt-vault:73](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/receipts/upload` | [receipt-vault:79](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/receipts/:receiptId` | [receipt-vault:104](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/receipts` | [receipt-vault:124](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/expenses/:expenseId/receipts` | [receipt-vault:148](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/receipts/:receiptId/link-expense` | [receipt-vault:169](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/receipts/:receiptId/unlink-expense` | [receipt-vault:193](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/receipts/:receiptId/process` | [receipt-vault:213](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/receipts/:receiptId/verify` | [receipt-vault:237](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/receipts/:receiptId/reject` | [receipt-vault:260](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/receipts/:receiptId` | [receipt-vault:285](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/receipts/:receiptId/metadata` | [receipt-vault:309](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/receipts/:receiptId/metadata` | [receipt-vault:333](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/receipts/:receiptId/metadata` | [receipt-vault:357](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/receipts/:receiptId/tags` | [receipt-vault:377](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/receipts/:receiptId/tags/:tagId` | [receipt-vault:401](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/receipts/stats` | [receipt-vault:421](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/receipt.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/receipt-tags` | [receipt-vault:50](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/tag.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/receipt-tags` | [receipt-vault:74](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/tag.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/receipt-tags/:tagId` | [receipt-vault:99](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/tag.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/receipt-tags/:tagId` | [receipt-vault:124](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/tag.routes.ts) | user/API candidate |

### audit-compliance-service

| Method | Declared path | Source | Initial scope hint |
|---|---|---|---|
| GET | `/health` | [service root:51](../apps/audit-compliance-service/src/app.ts) | operations |
| GET | `/account/audit-logs` | [audit-compliance:14](../apps/audit-compliance-service/src/modules/audit-compliance/infrastructure/http/routes/account-audit.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/audit-logs/summary` | [audit-compliance:49](../apps/audit-compliance-service/src/modules/audit-compliance/infrastructure/http/routes/audit-log.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/audit-logs/entity-history` | [audit-compliance:70](../apps/audit-compliance-service/src/modules/audit-compliance/infrastructure/http/routes/audit-log.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/audit-logs` | [audit-compliance:91](../apps/audit-compliance-service/src/modules/audit-compliance/infrastructure/http/routes/audit-log.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/audit-logs/:auditLogId` | [audit-compliance:112](../apps/audit-compliance-service/src/modules/audit-compliance/infrastructure/http/routes/audit-log.routes.ts) | user/API candidate |
| POST | `/workspaces/:workspaceId/audit-logs` | [audit-compliance:132](../apps/audit-compliance-service/src/modules/audit-compliance/infrastructure/http/routes/audit-log.routes.ts) | user/API candidate |
| DELETE | `/workspaces/:workspaceId/audit-logs` | [audit-compliance:157](../apps/audit-compliance-service/src/modules/audit-compliance/infrastructure/http/routes/audit-log.routes.ts) | user/API candidate |
| POST | `/event-outbox/events` | [audit-compliance:33](../apps/audit-compliance-service/src/modules/audit-compliance/infrastructure/http/routes/outbox-event.routes.ts) | internal candidate |

### notification-service

| Method | Declared path | Source | Initial scope hint |
|---|---|---|---|
| GET | `/health` | [service root:52](../apps/notification-service/src/app.ts) | operations |
| GET | `/account/notifications` | [notification-dispatch:29](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/account-notification.routes.ts) | user/API candidate |
| PATCH | `/account/notifications/:notificationId/read` | [notification-dispatch:50](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/account-notification.routes.ts) | user/API candidate |
| GET | `/account/notification-preferences` | [notification-dispatch:69](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/account-notification.routes.ts) | user/API candidate |
| PUT | `/account/notification-preferences` | [notification-dispatch:83](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/account-notification.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/notifications` | [notification-dispatch:31](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/notification.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/notifications/unread` | [notification-dispatch:54](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/notification.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/notifications/:notificationId/read` | [notification-dispatch:77](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/notification.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/notifications/read-all` | [notification-dispatch:99](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/notification.routes.ts) | user/API candidate |
| POST | `/event-outbox/events` | [notification-dispatch:47](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/outbox-event.routes.ts) | internal candidate |
| GET | `/workspaces/:workspaceId/notification-preferences` | [notification-dispatch:33](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/preference.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/notification-preferences` | [notification-dispatch:54](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/preference.routes.ts) | user/API candidate |
| PATCH | `/workspaces/:workspaceId/notification-preferences/:type` | [notification-dispatch:76](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/preference.routes.ts) | user/API candidate |
| GET | `/workspaces/:workspaceId/notification-preferences/check` | [notification-dispatch:98](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/preference.routes.ts) | user/API candidate |
| POST | `/admin/notification-templates` | [notification-dispatch:52](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/template.routes.ts) | user/API candidate |
| GET | `/admin/notification-templates/:templateId` | [notification-dispatch:73](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/template.routes.ts) | user/API candidate |
| GET | `/admin/notification-templates/active` | [notification-dispatch:94](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/template.routes.ts) | user/API candidate |
| PATCH | `/admin/notification-templates/:templateId` | [notification-dispatch:115](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/template.routes.ts) | user/API candidate |
| PATCH | `/admin/notification-templates/:templateId/activate` | [notification-dispatch:137](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/template.routes.ts) | user/API candidate |
| PATCH | `/admin/notification-templates/:templateId/deactivate` | [notification-dispatch:158](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/template.routes.ts) | user/API candidate |

### gateway

| Method | Declared path | Source | Initial scope hint |
|---|---|---|---|
| GET | `/live` | [service root:628](../apps/gateway/src/app.ts) | operations |
| GET | `/health` | [service root:632](../apps/gateway/src/app.ts) | operations |

## Registration and Gateway proxy sources

This lists static register() options with a prefix. Prefix variables are intentionally retained as expressions; Gateway arrays and inherited scopes require tracing.

| Application | Source | Prefix | Upstream/rewrite |
|---|---|---|---|
| identity-access-service | [source:35](../apps/identity-access-service/src/modules/identity-workspace/infrastructure/http/routes/index.ts) | `prefix: '/api/v1'` | `` |
| approval-policy-service | [source:14](../apps/approval-policy-service/src/modules/approval-workflow/infrastructure/http/routes/index.ts) | `prefix: '/api/v1'` | `` |
| approval-policy-service | [source:17](../apps/approval-policy-service/src/modules/policy-controls/infrastructure/http/routes/index.ts) | `prefix: '/api/v1'` | `` |
| expense-budgeting-service | [source:14](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/http/routes/index.ts) | `prefix: '/api/v1'` | `` |
| expense-budgeting-service | [source:19](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/http/routes/index.ts) | `prefix: '/api/v1'` | `` |
| expense-budgeting-service | [source:19](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/http/routes/index.ts) | `prefix: '/api/v1'` | `` |
| expense-budgeting-service | [source:31](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/http/routes/index.ts) | `prefix: "/api/v1"` | `` |
| expense-budgeting-service | [source:32](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/http/routes/index.ts) | `prefix: '/api/v1'` | `` |
| categorization-service | [source:22](../apps/categorization-service/src/modules/categorization-rules/infrastructure/http/routes/index.ts) | `prefix: '/api/v1'` | `` |
| bank-feed-service | [source:16](../apps/bank-feed-service/src/modules/bank-feed-sync/infrastructure/http/routes/index.ts) | `prefix: '/api/v1'` | `` |
| receipt-vault-service | [source:14](../apps/receipt-vault-service/src/modules/receipt-vault/infrastructure/http/routes/index.ts) | `prefix: '/api/v1'` | `` |
| audit-compliance-service | [source:11](../apps/audit-compliance-service/src/modules/audit-compliance/infrastructure/http/routes/index.ts) | `prefix: '/api/v1'` | `` |
| notification-service | [source:22](../apps/notification-service/src/modules/notification-dispatch/infrastructure/http/routes/index.ts) | `prefix: '/api/v1'` | `` |
| gateway | [source:417](../apps/gateway/src/app.ts) | `prefix: '/api/v1/auth'` | `upstream: IDENTITY_SERVICE_URL; rewritePrefix: '/api/v1/auth'` |
| gateway | [source:430](../apps/gateway/src/app.ts) | `prefix: '/api/v1/invitations/:token/accept'` | `upstream: IDENTITY_SERVICE_URL; rewritePrefix: '/api/v1/invitations/:token/accept'` |
| gateway | [source:439](../apps/gateway/src/app.ts) | `prefix: '/api/v1/invitations/:token'` | `upstream: IDENTITY_SERVICE_URL; rewritePrefix: '/api/v1/invitations/:token'` |
| gateway | [source:457](../apps/gateway/src/app.ts) | `prefix` | `upstream; rewritePrefix: prefix` |
| gateway | [source:486](../apps/gateway/src/app.ts) | `prefix` | `upstream: EXPENSE_SERVICE_URL; rewritePrefix: prefix` |
| gateway | [source:503](../apps/gateway/src/app.ts) | `prefix` | `upstream: CATEGORIZATION_SERVICE_URL; rewritePrefix: prefix` |
| gateway | [source:521](../apps/gateway/src/app.ts) | `prefix` | `upstream: APPROVAL_SERVICE_URL; rewritePrefix: prefix` |
| gateway | [source:535](../apps/gateway/src/app.ts) | `prefix` | `upstream: BANK_FEED_SERVICE_URL; rewritePrefix: prefix` |
| gateway | [source:551](../apps/gateway/src/app.ts) | `prefix` | `upstream: RECEIPT_SERVICE_URL; rewritePrefix: prefix` |
| gateway | [source:560](../apps/gateway/src/app.ts) | `prefix: '/api/v1/workspaces/:workspaceId/notifications'` | `upstream: NOTIFICATION_SERVICE_URL; rewritePrefix: '/api/v1/workspaces/:workspaceId/notifications'` |
| gateway | [source:568](../apps/gateway/src/app.ts) | `prefix: '/api/v1/workspaces/:workspaceId/notification-preferences'` | `upstream: NOTIFICATION_SERVICE_URL; rewritePrefix: '/api/v1/workspaces/:workspaceId/notification-preferences'` |
| gateway | [source:577](../apps/gateway/src/app.ts) | `prefix: '/api/v1/admin/notification-templates'` | `upstream: NOTIFICATION_SERVICE_URL; rewritePrefix: '/api/v1/admin/notification-templates'` |
| gateway | [source:585](../apps/gateway/src/app.ts) | `prefix: '/api/v1/workspaces/:workspaceId/audit-logs'` | `upstream: AUDIT_SERVICE_URL; rewritePrefix: '/api/v1/workspaces/:workspaceId/audit-logs'` |
| gateway | [source:593](../apps/gateway/src/app.ts) | `prefix: '/api/v1/workspaces'` | `upstream: IDENTITY_SERVICE_URL; rewritePrefix: '/api/v1/workspaces'` |
| gateway | [source:601](../apps/gateway/src/app.ts) | `prefix: '/api/v1/users'` | `upstream: IDENTITY_SERVICE_URL; rewritePrefix: '/api/v1/users'` |
| gateway | [source:610](../apps/gateway/src/app.ts) | `prefix: '/api/v1/expenses'` | `upstream: EXPENSE_SERVICE_URL; rewritePrefix: '/api/v1/expenses'` |
| gateway | [source:618](../apps/gateway/src/app.ts) | `prefix: '/api/v1/budgets'` | `upstream: EXPENSE_SERVICE_URL; rewritePrefix: '/api/v1/budgets'` |

Gateway workspace-prefix arrays in [app.ts](../apps/gateway/src/app.ts) cover Expense (20 prefixes), Categorization (4), Approval (5), Bank Feed, and Receipt; additional explicit registrations cover Identity, Notification, Audit and account endpoints. Public authentication/invitation paths have distinct handling. This is configuration inventory; effective access and path rewrites remain pending verification.

## Event producers and consumers

Intended audience boundaries to verify:

| Surface | Intended audience | Required verification |
|---|---|---|
| Identity registration/login | Unauthenticated clients | Input validation, abuse limits, credential handling |
| Invitation token lookup/acceptance | Token-based flow; acceptance has its own authentication requirements | Token expiry, intended recipient, replay, route-specific protection |
| Workspace business routes | Authenticated workspace members with operation-specific permissions | Verified session, workspace ownership, role/record visibility |
| Account audit/notification routes | Verified session actor, independent of workspace scope | Caller cannot select another account owner |
| Notification template administration | Authorized administrators | Exact role policy and template ownership |
| Outbox consumers and internal lookups | Authorized service principals | Internal credentials, supported payload contracts, Gateway exclusion |
| Bank integration | Connection and synchronization API; no incoming provider-webhook declaration found in this scan | Verify provider contract and credential handling; assess callbacks only if the selected provider requires them |
| Health/readiness and documentation | Deployment-specific operational audience | Exposure policy, sanitized errors, dependency readiness |

These are intended boundaries drawn from routing and wiring. Their enforcement is pending Steps 5–7; no source-path label counts as a security test.

Delivery uses transactional outboxes and HTTP webhooks. The source maps below establish intended subscribers, not proven delivery or completeness against every event emitted by entities. Step 3 must compare emitted event types to routing tables and transactional persistence; Steps 6–7 must prove consumption and replay behavior.

| Producer/module | Intended consumers or local effect | Routing source |
|---|---|---|
| Identity Workspace | Audit for lifecycle events; Notification for selected account/invitation/member events; historical naming aliases included | [identity map](../apps/identity-access-service/src/shared/infrastructure/webhooks/webhook-routing.ts) |
| Approval Workflow | Audit; Notification for workflow progress/outcomes; Expense for completed/rejected/cancelled outcomes when configured | [approval map](../apps/approval-policy-service/src/shared/infrastructure/webhooks/webhook-routing.ts) |
| Policy Controls | Audit; Notification for violation detection and exemption lifecycle events | [same approval map](../apps/approval-policy-service/src/shared/infrastructure/webhooks/webhook-routing.ts) |
| Expense Ledger | Audit; Notification for expense status changes; historical aliases handled by service map | [expense map](../apps/expense-budgeting-service/src/modules/expense-ledger/infrastructure/outbox/expense-webhook-routes.ts) |
| Budget Management | Audit; Notification for budget.threshold_exceeded | [budget map](../apps/expense-budgeting-service/src/modules/budget-management/infrastructure/outbox/budget-webhook-routes.ts) |
| Budget Planning | Audit | [planning map](../apps/expense-budgeting-service/src/modules/budget-planning/infrastructure/outbox/planning-webhook-routes.ts) |
| Cost Allocation | Audit | [allocation map](../apps/expense-budgeting-service/src/modules/cost-allocation/infrastructure/outbox/allocation-webhook-routes.ts) |
| Inventory Management | Audit | [inventory map](../apps/expense-budgeting-service/src/modules/inventory-management/infrastructure/outbox/inventory-webhook-routes.ts) |
| Categorization Rules | Audit; Notification for suggestions created; Expense for accepted suggestions | [categorization map](../apps/categorization-service/src/shared/infrastructure/webhooks/webhook-routing.ts) |
| Bank Feed Sync | Audit; Notification for SyncSessionFailed | [runtime table](../apps/bank-feed-service/src/runtime.ts) |
| Receipt Vault | Audit for receipt/metadata/tag events; ReceiptFileDeletionRequested is consumed locally for storage cleanup | [receipt runtime](../apps/receipt-vault-service/src/runtime.ts) |
| Notification Dispatch | Audit for notification lifecycle/account events; email worker uses configured provider | [composition root](../apps/notification-service/src/composition-root.ts) |
| Audit Compliance | Consumes webhook events; no outbound outbox | [consumer routes](../apps/audit-compliance-service/src/modules/audit-compliance/infrastructure/http/routes/outbox-event.routes.ts) |

Internal callback declarations: Audit and Notification POST /event-outbox/events inside /api/v1 module registration; Expense has POST /event-outbox/events directly and an optional /api/v1 registration. Verify actual production registrations, internal authentication, payloads, workspace/recipient ownership, and Gateway exclusion. Service-to-service lookup routes must also be checked from the route catalog; path names alone do not establish protection. No incoming bank-provider webhook was found in this static scan; that is not automatically a missing feature for a polling-based integration.

## Safe test environment

Use [verify-backend-regression.cjs](../scripts/verify-backend-regression.cjs), which creates fresh codex_test_*_<runId> PostgreSQL databases on the smoke instance at 127.0.0.1:15432. It deploys each service's migrations, supplies explicit per-suite database URLs, records child exit statuses and removes only databases created by that run in finally. It reads local .env.docker-smoke privately; never print its credentials.

Do not run destructive integration tests with implicit service-local/root .env fallbacks. Before running, check every integration suite's database variable and setup/cleanup behavior; the existence of the runner is not proof all tests honor its environment. This check is still pending. Avoid migrations/reset/queue cleanup against developer data. No test databases were created in Step 1.

The [Gateway workflow script](../scripts/gateway-workflow-smoke.cjs) uses dedicated expense-smoke containers and persistent smoke databases, not the temporary regression databases. It creates fixture records and temporarily stops/restores selected smoke services. Do not represent it as a read-only check or run it against a deployment.

Use Mailpit for email assertions; RESEND_API_KEY is cleared by the isolated runner. Enable Mailpit only with its explicit local URL and matching notification test database. Bank tests use controlled fixtures; live provider credentials and target hosting are unavailable.

## Evidence carried forward, not rerun here

The previous targeted verification reported 2,474 passing tests across five affected services and one skipped Mailpit test, with TypeScript checks for those five and backend lint. Private report: expense-backend-regression-1791387025905 in the OS temporary directory. These are historical results, not completion evidence for this new pass; all-service results and fresh images must be tied to the current baseline.

## Current outstanding checks and limits

Step 9 above is the current assessment. The earlier sections retain their chronological scope and pending statements as they stood at each step. Docker builds, representative live workflows, revocation, concurrency/rollback checks, bounded failure recovery and local database/file restoration were subsequently completed. Full live-route/use-case coverage reconciliation, shared coverage expansion, target deployment configuration, external providers and production backup/retention evidence remain open. No percentage-of-correctness claim is made.
