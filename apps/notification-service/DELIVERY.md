# Durable notification delivery

## Composition and lifecycle

`createCompositionRoot(prisma)` constructs frozen, typed wiring for one app;
there is no mutable singleton container. Each default app owns an independent
Prisma client and event bus. An injected client is also owned and disconnected
by that app; do not inject the same client into independently closing apps.

`buildNotificationApp` constructs routes without starting polling workers.
`startNotificationService` checks database/schema readiness, binds HTTP, then
starts outbox and configured email workers. Production requires INTERNAL_API_KEY
and rejects authentication bypass. Deployment environment values, including
explicit empty strings, precede service-local .env values and root fallbacks.

On close, both workers stop polling and drain active work before Prisma
disconnects. Cleanup also runs after composition, readiness, listen or worker
startup failure. The production entrypoint installs SIGTERM/SIGINT handlers
before listening; repeated signals share one close operation and handlers are
removed on close. Shutdown sets exit status after errors instead of forcing an
early process.exit while asynchronous cleanup is pending.

`/health` checks required notification, preference, template, receipt, email job
and outbox tables/critical columns, even on empty databases. It returns 503 with
a sanitized message for missing migrations or database failures. Email status
is `configured` or `paused`; this does not assert external provider availability.
Graceful shutdown is complemented by durable lease recovery after abrupt exits.

## Internal commands

Use `SendNotificationHandler` with a UUID `requestId`. Generate it for the business
operation, persist it with the caller's operation, and reuse it on retries. Do not
generate another ID each time a failed HTTP/message delivery is retried.

The service keeps a permanent receipt with a canonical input fingerprint. Matching
retries return the existing notifications; changed recipient, workspace or input
under the same ID throws `NOTIFICATION_REQUEST_CONFLICT` (409). JSON object key
order and omitted/default MEDIUM priority do not change request identity. A new
business notification, even with identical text, needs a new request ID.

Receipt, notifications, outbox events and eligible email jobs commit together.
Suppressed requests also keep receipts. In-app records are SENT once committed;
email records are initially PENDING. Command success means durable acceptance,
not that an email has reached an inbox. Replays return current notification state.

Both the command and `NotificationService.send` require a request ID. The older
synchronous provider-call path has been removed, so a direct service caller cannot
bypass durable deduplication or recovery.

## Persistence concurrency

Notification, preference and template rows have an internal revision counter.
Repository `save` methods create new aggregates or save snapshots returned by a
repository. A stale snapshot throws `NOTIFICATION_CONCURRENT_UPDATE` (409), and a
batch failure rolls back its other records and events. Reload before retrying a
snapshot update. Prefer the scoped, locked `mutate` methods for normal use cases.
Revision tracking stays in adapters and is not serialized into domain objects or
public DTOs; an externally reconstructed object is not an authorized update token.
All production mutation paths increment the counter, including bulk reads and
email completion. Direct administrative SQL must preserve this concurrency rule.

Email and outbox lease clocks use PostgreSQL wall-clock time. Ownership is checked
after lock acquisition, and email completion checks again after waiting on the
notification lock. Scheduled pending outbox jobs are not claimed before their due
time. A reclaimed eleventh email claim enters reconciliation without sending.

## Email configuration and recovery

To repeat the smoke test against the real local Identity service, configure matching
INTERNAL_API_KEY values in Identity, Notification and Audit service-local .env files,
apply all three services' migrations, and leave ports 3002, 3008 and 3009 available.
With Mailpit running:

```powershell
pnpm --filter @expense-tracker/identity-access-service build
pnpm --filter @expense-tracker/audit-compliance-service build
pnpm --filter @expense-tracker/notification-service exec tsx scripts/verify-local-mailpit.ts
```

The opt-in script starts the compiled Identity entrypoint and Notification runtime,
checks HTTP health, registers a new test user and workspace through Identity HTTP,
and invokes Notification's internal send command (there is no public send endpoint).
It verifies real HTTP recipient lookup, durable delivery, SENT status, command
replay without duplicate mail, and routes an actual Budget threshold event to its creator.
Audit starts after an observed durable outbox failure to verify recovery and webhook
replay deduplication. All three services stop afterward; test records and
captured mail remain for inspection. Only localhost databases and Mailpit are allowed.
Audit must be stopped before this opt-in recovery test starts.
Recipient lookup uses Identity's data.userId contract and sends x-user-id together
with the internal key so Identity can authorize the active actor.

Budget threshold producers include createdBy in their outbox payload. The HTTP
consumer uses an explicit audience first and the creator as its fallback; events
without either are rejected for repair/retry, not silently acknowledged. Older
queued threshold events without creator metadata need enrichment at the producer.
The webhook remains in-app and honors preferences; the internal command handles
email separately under its existing preference and deduplication rules.

For local Mailpit capture, set the following in the service-local .env:

```dotenv
NOTIFICATION_EMAIL_PROVIDER=mailpit
MAILPIT_URL=http://localhost:8025
NOTIFICATION_EMAIL_FROM=notifications@expense-tracker.test
```

The sender is optional for Mailpit and defaults to the address above. The adapter
uses [Mailpit's HTTP send API](https://mailpit.axllent.org/docs/usage/sending-messages/),
so port 8025 is used rather than SMTP port 1025. In a shared Docker network use
http://mailpit:8025 instead of localhost. Mailpit selection fails in production.
Production/default selection remains resend; its existing key/sender requirements
still apply. Unsupported provider names fail startup instead of silently pausing.

Identity recipient lookup remains enabled for both transports: run Identity Access
and configure the matching INTERNAL_API_KEY and IDENTITY_SERVICE_URL. Mailpit does
not introduce a recipient-email override into public notification requests.

Mailpit is explicitly non-idempotent. After a message is durably prepared, a later
attempt enters RECONCILIATION_REQUIRED without another provider request. This
includes uncertain network outcomes, completion-write failure, and a crash between
preparation and sending. It may need manual resolution even when nothing was sent;
preventing an automatic duplicate is the deliberate tradeoff. Identity lookup
failures before preparation can still retry. Resend's idempotent recovery is unchanged.

Set MAILPIT_TEST_URL=http://localhost:8025 alongside the matching isolated database
URLs to run the opt-in real capture test. It uses a controlled HTTP Identity fixture,
the real lookup adapter, composition root, email worker and PostgreSQL repositories.
The captured test email is left in Mailpit for inspection. Without MAILPIT_TEST_URL
that test skips; ordinary unit/provider recovery tests remain runnable.

Apply Prisma migrations, then set both `RESEND_API_KEY` and
`NOTIFICATION_EMAIL_FROM` to a verified sender. Set `INTERNAL_API_KEY` and
`IDENTITY_SERVICE_URL` for authenticated recipient lookup. No email is sent by the
test suite; the tests use a fake idempotent provider and mocked HTTP responses.

When both email settings are absent, production logs that email delivery is paused
and keeps queued intent. Supplying only one setting fails startup. The production
entry point starts the worker and waits for its active batch during shutdown.

Jobs are claimed using PostgreSQL SKIP LOCKED and expiring owner leases. A stale
owner cannot prepare, finish or reschedule a replacement owner's job. Before any
provider request, the job stores its recipient address, sender, subject, body,
provider credential fingerprint and durable notification UUID as idempotency key.
Retry does not re-render a template or re-fetch an address already captured.

Transient responses, timeouts and uncertain outcomes retry with exponential
backoff. Completion writes notification state, delivery state and outcome events
in one transaction. A crash or outcome-write failure leaves recoverable intent;
the replacement worker reuses the exact provider message and key. Read state is
independent and is preserved when delivery later finishes.

[Resend retains idempotency keys for 24 hours](https://resend.com/changelog/idempotency-keys).
Automatic recovery uses a conservative 23-hour window, stops at ten claims, and
does not issue another request near the deadline. Expired windows, exhausted
attempts or changed provider credentials produce RECONCILIATION_REQUIRED rather
than risking duplicates. Permanent provider rejection produces FAILED. SENT means
provider acceptance, not a guarantee against later bounce or spam filtering.

Inspect `notification_dispatch.email_deliveries` for FAILED or
RECONCILIATION_REQUIRED jobs. Check the provider's email records before resolving
an uncertain job. If acceptance is confirmed, record that outcome through the
same transactional delivery repository under a valid, controlled lease. If rejection
is confirmed, record failure. Do not reset an expired uncertain job to PENDING or
change its key to force another send. A deliberate new email is a new command and
must be an explicit business decision after reconciliation.

Migration puts legacy PENDING email records (including READ records without sentAt
or an error) into RECONCILIATION_REQUIRED. Their previous provider and retry window
are unknown, so they are never automatically resent. Already SENT/FAILED records
are not changed.

## HTTP route access and limits

The production application requires the internal API key for both gateway and
webhook traffic. User-facing routes additionally require a valid UUID in
`x-user-id`; optional workspace context must also be a valid UUID. The gateway
must supply these trusted headers after authenticating the user. The service
does not treat client-supplied context headers as independently authenticated.
Production construction rejects `enableInternalAuth: false`.

Each user-facing request checks workspace membership with Identity Access once.
All six template routes additionally require OWNER or ADMIN; template ID routes
derive workspace ownership from the stored record. Global template management
remains disabled. UUID input is normalized to lowercase before authorization.

Per-process fixed-window protection permits 300 reads and 30 writes per actor
per minute, in separate buckets, before remote workspace checks. Webhook traffic
permits 100 requests per peer IP per minute after internal authentication.
Bucket selection ignores caller-supplied forwarded IP headers. Rejected requests
return 429 with Retry-After; webhook publishers should retain and retry their
durable events. These are local safeguards, not deployment-wide distributed
quotas; shared stores would be required for that guarantee. The existing shared
limiter disables throttling under NODE_ENV=test; guard tests explicitly enable
it with the development environment.

## Request validation

User-facing HTTP requests validate their raw bodies, params and query strings
with Zod before Fastify's JSON-schema coercion. Body booleans must be JSON
booleans; unknown input fields are rejected with 400 instead of silently removed.
Pagination query values must be digit-only integers within limit 1–100 and offset
0–2147483647. Omitted pagination defaults to limit 50 / offset 0. Blank template
text is rejected; meaningful surrounding template whitespace is preserved.
Workspace and record IDs must match domain-supported UUID versions 1–5.
Empty partial updates remain accepted as no-ops.

## Webhook preference policy

The HTTP consumer handles `expense.status_changed` (and legacy
`ExpenseStatusChanged`) using `expenseOwnerId`, creating expense outcome alerts
only for APPROVED/REJECTED. It handles `approval.workflow_started` (and legacy
`ApprovalWorkflowStarted`) using `requesterId`. Actor fields such as changedBy
are not substituted for those recipients. Policy exemption outcomes remain
SYSTEM_ALERT events rather than being classified as expense outcomes.

Some upstream events have no notification recipient; these are acknowledged
without creating personal notifications. A workspace-wide recipient/fan-out
policy must be defined before enabling that behavior. The optional in-process
NotificationEventHandler is not the production HTTP subscription path.

`/api/v1/event-outbox/events` remains an authenticated in-app event consumer.
All supported event types, including SYSTEM_ALERT and INVITATION, honor global
`inAppEnabled` and type-specific `inApp` preferences. Missing preferences use the
domain defaults. Global opt-out overrides a type opt-in. Payload fields such as
`mandatory` cannot bypass this policy; there is no mandatory-type exception.

Evaluate preferences once when the event is accepted. Store that decision with
its event-ID/fingerprint receipt in the same transaction. Suppression returns
200 with `suppressed: true`, creates no notification or delivery event, and remains
suppressed on replay even if preferences later change. A conflicting replay returns
409. Previously delivered notifications stay delivered/read after preference
changes. A new event uses current preferences.

Webhook consumption does not implicitly fan out to email or apply email templates.
Use the internal command for preference-aware multi-channel delivery. Receipt IDs
are globally unique across webhook and command kinds; reuse across kinds conflicts.

## Running the full suite

Set DATABASE_URL and NOTIFICATION_TEST_DATABASE_URL to the same disposable,
migrated PostgreSQL database, then run `pnpm test` in this service. Without that
explicit selection, database suites skip. Files run in one fork because durable
workers claim from the global queue and some failure tests temporarily change
schema constraints. Tests still issue concurrent operations within a file to
verify deduplication, locking and lease fencing. Do not run independent test
processes against the same database.
