# Receipt migrations

The application repair adds `20261004000000_receipt_concurrency` for Receipt versions. Infrastructure hardening adds `20261004010000_metadata_tag_concurrency` for metadata and tag definition versions. Both migrations include nonnegative checks; existing rows start at version zero. Deploy all pending migrations before running the updated service: the generated client and versioned update paths require these columns. All four migrations, repeat deployment, schema drift checks and the full service suite were verified in disposable PostgreSQL databases on 2026-10-04. Existing application databases still require deployment through their normal migration process.

Fresh databases: set this service's `DATABASE_URL`, run `prisma migrate deploy`, then `prisma generate` before startup. Never substitute `db push` for deploying these constraints.

Existing databases created with `db push` require deliberate baseline adoption:

1. Back up the database and verify that its schema matches the initial migration (`20261003000000_initial_receipt`). Compare using Prisma migration diff against that migration in a disposable shadow database. Do not mark the baseline applied when it differs.
2. Inspect and resolve cross-workspace tag assignments, duplicate active `(workspace_id, file_hash)` records, invalid file sizes, hashes and OCR confidence. The hardening migration fails rather than discarding these records.
3. Only after verifying the initial baseline, run `prisma migrate resolve --applied 20261003000000_initial_receipt`, then `prisma migrate deploy`. Do not reset a database containing user data.
4. Run migration status and compare the migrated schema with `schema.prisma`. SQL CHECK constraints and the partial active-hash unique index intentionally live in the migration.

Migration verification is reproducible with `node scripts/verify-receipt-foundation.cjs` from the repository root. It uses the local smoke PostgreSQL instance, creates a uniquely named disposable test database, applies migrations, checks drift, runs tests and drops that test database in `finally`. It never migrates the configured application database.

## Storage/API transition

Domain validation now also rejects malformed UUIDs, unsupported currencies, invalid dates, invalid line items, and financial values outside nonnegative two-decimal `Decimal(12,2)` bounds. Inspect legacy metadata before deployment and correct it from authoritative source data; do not silently coerce invalid values. LOCAL storage records must contain a managed object key. Recover missing keys from verified stored objects, rather than guessing a path. Notes remain plain text and must be escaped when displayed by clients.

Upload now accepts `{ originalName, mimeType, fileContent }`, where `fileContent` is canonical base64 of the file bytes (maximum decoded size 50 MiB). Optional `receiptType` is supported. The service computes the hash and size, checks the permitted file signature, and writes a private managed object. Caller-supplied file paths, object keys, file size and hash are no longer upload inputs. A signature check is not full document decoding or malware scanning.

Download uses the authenticated `GET /api/v1/workspaces/:workspaceId/receipts/:receiptId/download` endpoint. Local objects do not have public or signed URLs. Access requires workspace membership and receipt ownership. The frontend API/hook upload types have been updated to this contract; file selection/encoding UI remains a separate frontend task.

Legacy metadata-only uploads may refer to nonexistent files. Recover actual bytes through the managed upload flow; do not invent bytes or convert arbitrary paths into keys. Cloud provider records require a corresponding storage adapter; the current composition root supports LOCAL only. Legacy hash-based keys are accepted within the configured directory, and deletion checks surviving references before unlinking.

Receipt writes and their events commit together. Permanent deletion queues physical cleanup in the same database transaction. Local cleanup is retried by the leased outbox worker; exhausted events remain visible as DEAD_LETTER for operator investigation. Do not delete dead-letter events without resolving their cause. Auditing is at-least-once; consumers must deduplicate by event ID.

Metadata and tag saves also commit their version change and events atomically. Stale updates return 409; reload the latest representation before applying a new edit. Do not blindly retry the stale entity. Updating a deleted metadata or tag row cannot recreate it.

List filters combine rather than replace one another. Boolean query parameters accept only `true` or `false`. Date filters accept valid calendar dates (`YYYY-MM-DD`) or ISO timestamps with an offset; `fromDate` must not exceed `toDate`. Receipt ordering uses createdAt and ID for deterministic ties. Offset pagination's count and items are separate reads and may reflect concurrent changes; it does not promise a single database snapshot.

Mutation limits run once after gateway authentication and use the authenticated actor's key. The shared limiter is in-memory and applies per service process. A deployment requiring a cluster-wide quota must enforce it in a shared gateway or replace the limiter store with shared infrastructure; the current service does not advertise a cluster-wide quota.

The hourly storage reconciliation job deletes unreferenced managed files older than 24 hours, recovering crashes or failed compensation between file write and database persistence. It retains referenced files, recent uploads and unmanaged files. Mount `/app/uploads` on a persistent volume in Docker. Back up that volume alongside database metadata. Legacy outbox payloads lacking workspace/actor context need explicit reconciliation before replay; the worker cannot infer their audience.
