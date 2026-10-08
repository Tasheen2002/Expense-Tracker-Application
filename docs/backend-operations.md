# Backend verification and recovery

Local development and the `expense-smoke` Docker project use different databases.
Do not copy event records or credentials between them to make a check pass.

Docker Compose requires explicit `POSTGRES_PASSWORD` and `REDIS_PASSWORD` values;
there are no default passwords. For an existing PostgreSQL volume, use its current
password until performing a coordinated credential rotation. Do not replace that
value merely by editing `.env`: PostgreSQL initialization variables do not change
an existing database user's password. The isolated smoke environment has its own
configured credentials. Use URL-safe hexadecimal passwords for new environments.

## Reproducible local startup

Run `pnpm dev:api:prepare`, then `pnpm dev:api`. Preparation creates missing local
service databases, deploys migrations, checks drift, and aligns development
configuration without resetting application data.

Warnings and failures remain visible. Set `BACKEND_HTTP_SUMMARY=true` to enable
30-second success summaries, or `BACKEND_VERBOSE_HTTP=true` for individual requests.

## Inspect historical delivery failures

Run `pnpm outbox:verify` to compare every stored Expense event type to its actual
routing table; it fails if any type is unmapped. Run `pnpm outbox:inspect` to read
each service's own `.env` database configuration and write a redacted report to the
operating system temporary directory. Counts
cover the full outbox; detailed assessment is a bounded sample. Use
`pnpm outbox:inspect --service expense-budgeting --limit 500` for a larger sample.
When `nextCursor` is present, continue with `--after <nextCursor>` to inspect or
recover later pages. Quarantined rows are retained and must not prevent reaching
later recoverable records.
Audit is an event consumer and has no outbound outbox to inspect.

Inspect an event before replaying it. Supported automatic repair requires:

- A historical audit-only planning or cost-allocation contract.
- A dead-letter reason involving a missing route or workspace scope.
- A surviving aggregate whose ID and workspace prove the event's ownership.
- No contradictory workspace or unexpected subscriber acknowledgement.

Use `pnpm outbox:replay --ids <event-id,...>` for selected records. Recovery is
local-only, uses a row lock and lease, preserves the original event ID and type,
and records successful Audit delivery. A repeated run does not resend processed
records. It does not create notifications or send emails. Other service contracts,
missing owners, and unrelated failures require a separate investigation.

Do not invent recipients, infer ownership from a display name, or clear the entire
queue to hide a failure. Historical deleted aggregates may be unrecoverable.
Retain their records with a documented reason. Temporary recovery reports contain
IDs and outcomes, never API keys or full event payloads.

For an explicitly approved development cleanup, `node scripts/archive-dead-letters.cjs`
previews the existing dead-letter snapshot. Add `--apply` to write and checksum full
private archives before deleting only those selected IDs under row locks. This does
not reset business data or delete pending, processing, failed, or processed events.
Keep the archive if restoration may be needed; it contains full historical payloads.

For an explicitly approved fresh start of local development delivery queues, add
`--undelivered` to preview pending, failed, and dead-letter records. Combine with
`--apply` to archive and delete that snapshot. Processing events are excluded;
check the queues again after any active deliveries complete. Processed history and
business records are preserved. This intentionally abandons old queued deliveries.

Permanent HTTP payload rejections (such as 400 or 422) enter dead letters after one
delivery attempt. Transient outages and rate limits remain retryable. Invalid payloads
do not open the subscriber availability circuit or suppress valid subsequent events.

## Verification before release

Run `pnpm lint:backend` and `pnpm type-check` before integration verification.
Backend ESLint checks every service and shared package. Response and pagination
helpers reject explicit `any`; repository pagination uses typed query callbacks
so Prisma retains row and relation inference.

All nine backends now enforce complete-source coverage in CI. The new minimums
are 75% for Audit, 80% for Bank and Receipt, 90% for Notification, and 95% for
Gateway lines/statements/functions with 80% branches. These gates were set after
measuring the existing suites; generated declarations, test files, and process
entry points are excluded, not business logic or adapters.

Set `BACKEND_VERIFY_COVERAGE=true` when running the isolated regression script to
check coverage locally. Reports go to a run-specific temporary directory.
PostgreSQL integration services run in a single fork to avoid shared-database
interference and native Prisma clients in worker threads. Do not turn a native
crash into success merely because the assertions finished; the runner records
the child exit status and fails on unsuccessful exits.

`node scripts/verify-backend-regression.cjs` uses fresh temporary databases in the
local smoke PostgreSQL instance and removes only those created by that run.
Reports go to the operating system temporary directory. The GitHub Actions
workflow also runs historical HTTP contract tests, operational tooling tests,
all backend container workflows through Gateway, workspace isolation checks,
replay checks, and downstream outage recovery using a bank fixture and Mailpit.

Deployment still needs target-specific evidence: HTTPS termination, exact trusted
proxy IPs, target migration status, private downstream connectivity, secret
configuration, and a successful backup restore. Verify a real bank provider in its
sandbox before advertising live integration. Fixture tests do not prove provider
compatibility. Production email uses verified sender configuration; Mailpit is
for local tests only.

`node scripts/verify-database-backup.cjs` performs a local smoke-stack restore
drill for all eight databases and local receipt files. It uploads one synthetic
receipt, gracefully stops all nine backend smoke containers, checks exit code 0,
and captures the quiesced database/file state. Dumps and source fingerprints share
a PostgreSQL snapshot; restores use fresh uniquely named databases. It compares
row counts and content digests, constraint definitions reparsed by PostgreSQL,
and indexes. Receipt files are restored into a fresh volume and read using the
application user; hashes and sizes must match every active local receipt reference.
Only drill databases and the drill volume are removed, and stopped services are
restarted in cleanup. This is a brief planned outage of the smoke stack; do not run
it against an active deployment.
Backups are retained privately in the temporary directory and can contain sensitive
application data. This verifies local restore mechanics, not a production retention
schedule or offsite backup policy. Check application readiness after the drill.
