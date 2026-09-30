# Bank-feed migrations

`20260929000000_initial_bank_feed` records the schema that was previously created with `prisma db push`. `20260929000001_harden_bank_feed` upgrades it with scoped foreign keys and deduplication, decimal amounts, retained transaction history, and a PostgreSQL partial unique index allowing only one active sync per connection.

The upgrade also adds a connection version used to reject stale concurrent writes. Sync sessions older than 30 minutes are marked failed before a new sync starts; the transaction batch checks that both its connection and session are still active before importing rows.

Successful sync commits the imported rows, completed session, connection timestamp/version, and corresponding outbox events in one PostgreSQL transaction. New sessions acquire the connection lock before enforcing the active-session and cooldown rules. Failed completion transactions import no rows; the application separately records the failed session with a safe error message.

For a new database, run `prisma migrate deploy` with this service's `DATABASE_URL`.

For a database already created by `db push`, first back it up and confirm that its schema matches the initial migration. Then mark only the initial migration as applied with `prisma migrate resolve --applied 20260929000000_initial_bank_feed` and run `prisma migrate deploy`. Do not apply the initial migration to existing tables. The upgrade removes the bank database's unused `identity_workspace.workspace_membership` shadow table; authorization now queries Identity Access remotely.

Before upgrading existing data, check that every sync session belongs to its referenced connection, every transaction belongs to its referenced connection and session, and no connection has more than one `PENDING` or `IN_PROGRESS` session. The new foreign keys and partial unique index reject inconsistent historical records rather than silently changing their ownership.

Set `BANK_FEED_TOKEN_ENCRYPTION_KEY` to a base64-encoded 32-byte key and retain it securely. New connection tokens are encrypted with AES-256-GCM. After deploying to a database containing older plaintext tokens, run `pnpm --filter @expense-tracker/bank-feed-service tokens:encrypt-existing` to encrypt those rows. The script is idempotent. Keep the key available for decryption and rotate bank tokens before changing the key.

Database endpoint tests require an isolated PostgreSQL database. Set both `DATABASE_URL` and `BANK_FEED_TEST_DATABASE_URL` to the same test database URL after applying migrations; the suite skips those tests if the URLs are absent or differ.

The cross-service HTTP suite also requires `EXPENSE_E2E_DATABASE_URL` pointing to a separate migrated Expense Budgeting test database whose name contains `_e2e_`. It starts the real Expense HTTP app, a local bank-provider stub, and a local Identity membership stub. The suite checks sync and match, cross-workspace rejection, and provider failure transitions. The temporary test databases should be discarded after the run.

Set `BANK_FEED_OUTBOX_TEST_DATABASE_URL` to another migrated Bank Feed database, distinct from `DATABASE_URL`, to run the outbox concurrency and subscriber retry tests. All three isolated database URLs are required to run every test without skips.
