# Categorization database migrations

This service owns `categorization_rules` in `expense_tracker_categorization`.
Identity memberships, expense IDs and category IDs remain owned by their
respective services. Existing legacy `identity_workspace` tables are not dropped
by these migrations, and this service no longer creates or maps them.

## Fresh database

Configure `DATABASE_URL`, generate the service-specific client, then run
`prisma migrate deploy` using this service's Prisma CLI. The migrations create
the original categorization tables, then add integrity constraints and indexes.
`prisma migrate status` should show all migrations applied.

## Existing database created with db push

Back up the database and compare its categorization tables with
`20261002000000_initial_categorization/migration.sql` before baselining.
Only when they match, mark that migration applied with:

```text
prisma migrate resolve --applied 20261002000000_initial_categorization
prisma migrate deploy
```

Do not baseline a different schema or mark the hardening migrations applied
without executing them. Upgrades intentionally fail when existing data contains
duplicate workspace/name pairs, orphaned or cross-workspace rule executions,
negative priorities, nonfinite/out-of-range confidence values, or inconsistent
suggestion response timestamps. Reconcile these records explicitly first; the
migrations do not silently remove history or rewrite business data.

## Deletion and event persistence

Rule deletion sets `deleted_at` and `is_active = false`. Operational rule reads
hide deleted rules; their workspace/name stays reserved. Execution records retain
their rule through a composite `(rule_id, workspace_id)` foreign key, with hard
deletion restricted. Historical execution data remains readable by workspace.

Rule and suggestion changes, including deletion, persist domain events in the
same transaction as their state changes. Rule evaluation commits execution,
suggestion and both aggregates' events together. Evaluation locks its rule and
checks that it is still active before writing. Failed transactions retain the
in-memory events for retry. Event IDs are stable domain event IDs. There is no
separate event-bus subscriber writing a second outbox record.

## Integration tests

Use a dedicated temporary PostgreSQL database named
`codex_test_categorization_<unique suffix>`. Deploy migrations and set both
`DATABASE_URL` and `CATEGORIZATION_TEST_DATABASE_URL` to that database before
running the service suite. The foundation tests install and remove a trigger
that deliberately rejects outbox inserts; never run them against an application
database. Without the test URL, those PostgreSQL tests are explicitly skipped.

Tests cover concurrent uniqueness, tenant foreign keys, database checks, event
rollback and retry, retained deletion history, atomic evaluation, and evaluation
of a rule deleted after it was read.

Repository history reads require workspace scope. Execution history is appended
through the atomic evaluation operation; no standalone save/delete operation
can replace or remove it. Suggestion responses lock their row and reject a
competing response, committing only one response event. Original proposal and
ownership fields cannot be rewritten. Pagination uses deterministic tie-breaks,
with limit 1–100 and offset 0–2147483647.

## Reliable suggestion acceptance

Deploy the rule-concurrency migration and regenerate the Categorization Prisma
client before deploying this version. Rule writes compare their stored version;
stale writes and writes after deletion return a conflict rather than overwriting
newer data. Suggestion responses cannot recreate a deleted suggestion.

Evaluation reads the expense snapshot from Expense Budgeting instead of trusting
the caller's `expenseData`. The HTTP field remains accepted for compatibility.
Rule targets and manually created suggestions are checked against scoped owner
service resources. Configure `EXPENSE_SERVICE_URL` and the shared internal key.

Accepting a suggestion checks the current expense/category and atomically saves
the acceptance and `CategorySuggestionAccepted` outbox event. The event records
the accepting actor and expected expense version. Acceptance means the update
has been queued; it does not claim that Expense Budgeting has already applied it.

The event is delivered to Audit and Expense Budgeting's `/event-outbox/events`.
The Expense receiver locks the expense and category, rejects inactive or foreign
categories and stale/uneditable expenses, and commits the category change, its
outbox event and processed-event record together. Concurrent redeliveries across
consumer instances apply it once. Transport/database failures can be retried.

A version conflict deliberately preserves the newer expense. Review failed
outbox events and create a fresh suggestion if the category is still desired.
Old queued acceptance events lacking `acceptedBy` or `expenseVersion` cannot be
applied safely; reconcile them explicitly rather than inventing that metadata.

## Suggestion notification recipients

New manually created and rule-generated suggestions notify the **expense creator**.
The application resolves `ExpenseDTO.userId` from Expense Budgeting's scoped
resource endpoint. A missing or invalid owner fails the request before creating
a suggestion. The owner is recorded as `expenseOwnerId` in the suggestion-created
event, in the same transaction as the suggestion (and execution for evaluation).
No recipient field is accepted from the requesting administrator.

Notification creates an in-app `SYSTEM_ALERT` titled “Category suggestion
available”. Global in-app and per-type `SYSTEM_ALERT` preferences are honored.
Suppression is recorded durably, so opting back in and replaying the same event
does not create a notification. Concurrent deliveries create one notification.
This path does not send email or push messages. No new database migration is
required because recipient metadata is in the existing JSON outbox payload.

Legacy creation events without verified owner metadata are rejected instead of
silently acknowledged by Notification. Do not invent their recipient or mutate
their historical payload: create a fresh suggestion through the authorized API.
Already processed legacy events are not automatically backfilled. The retry
command also refuses incomplete legacy creation events.

## Outbox delivery and operator recovery

Deploy `20261003000000_outbox_delivery` before starting this version. It adds
subscriber acknowledgements, lease ownership, lease expiration and retry timing.
Workers claim rows with PostgreSQL `FOR UPDATE SKIP LOCKED`, recover expired
leases and reject writes from expired or replaced leases. A successful subscriber
stays acknowledged when another destination fails; retries use exponential backoff.
Shutdown drains the worker before disconnecting the app-owned Prisma client.

To retry a failed or dead-letter event after fixing a transient dependency failure,
run from this service directory with `DATABASE_URL` set to the intended database:

```text
pnpm outbox:retry <event UUID>
```

This development/operator command requires the service dependencies and generated
client. It preserves the payload and delivered subscriber list. It does not retry
pending, processing or completed events. Inspect the event's error first. An
expense version conflict requires a fresh suggestion against the current expense;
requeuing the same stale event cannot resolve it. Legacy acceptance payloads
missing a verified actor or version are refused and remain available for review.

For PostgreSQL published by Docker on Windows, use `127.0.0.1` in host-side
database URLs. `localhost` delayed additional pooled connections in local tests
and caused interactive-transaction start timeouts. Containers continue using
their Compose database hostname.

The runtime schedules processed-event retention cleanup once per day, retaining
the latest seven days. It never deletes pending, failed or dead-lettered events.
Cleanup runs do not overlap, and shutdown waits for cleanup and active delivery
before disconnecting Prisma. A failed cleanup is logged and retried at the next
daily schedule. Short-lived instances may require an external cleanup job if
they consistently restart before the daily interval elapses.
