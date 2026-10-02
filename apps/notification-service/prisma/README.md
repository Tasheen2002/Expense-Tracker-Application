# Notification database migrations

The baseline `20260930010000_initial_notification_dispatch` records the current
Notification schema: four tables, five enums, and their indexes. It does not
change the existing domain or API contract.

For a new database, set this service's `DATABASE_URL` and run:

```sh
pnpm exec prisma migrate deploy
pnpm exec prisma migrate status
```

For an existing database created with `prisma db push`, back it up first and
verify that its managed schema matches the baseline:

```sh
pnpm exec prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
```

An exit code of 0 means there is no detected Prisma schema difference. Inspect
any custom database objects and resolve differences before adopting the baseline.
Then record the baseline without executing its table creation statements:

```sh
pnpm exec prisma migrate resolve --applied 20260930010000_initial_notification_dispatch
pnpm exec prisma migrate deploy
```

Do not mark the baseline as applied on an empty database; deploy it there.
The migration lock file records the PostgreSQL provider and belongs in source control.

The PostgreSQL webhook integration tests require an isolated migrated database.
Set `DATABASE_URL` and `NOTIFICATION_TEST_DATABASE_URL` to that same database URL
before running `pnpm test`. Without the explicit test URL, those tests are skipped.
They exercise the real HTTP application and publisher, internal authentication,
notification persistence, and duplicate delivery. CI deploys this migration before
running the suite and checks the migrated database for Prisma schema drift.

## Delivery-integrity migration

`20260930020000_notification_delivery_integrity` adds incoming-event fingerprints,
outbox leases, retry scheduling, subscriber acknowledgments, and a partial unique
index for global templates. Both global and workspace templates have one row per
notification type/channel, including inactive templates. The partial index is a
PostgreSQL constraint that Prisma cannot express directly; preserve it in future
migrations.

Before upgrading an existing database, inspect duplicate global templates:

```sql
SELECT type, channel, COUNT(*)
FROM notification_dispatch.notification_templates
WHERE workspace_id IS NULL
GROUP BY type, channel
HAVING COUNT(*) > 1;
```

The migration refuses duplicates rather than deleting template content. Review
and consolidate those rows explicitly before deploying it. If deployment already
failed at that unique index, resolve that failed migration as rolled back after
checking its state, then deploy again. Stop old workers during the upgrade: legacy
PROCESSING events are reset to PENDING for recovery. Delivery is at least once;
receiving services must remain idempotent.

Existing notifications retain their content and initially have no fingerprint.
An incoming replay must match their stored workspace, recipient, source type,
payload, and provided original timestamp before adopting a complete fingerprint.
Aggregate metadata was not stored by the old consumer, so its original identity
cannot be reconstructed retroactively. After adoption, the complete fingerprint
protects subsequent deliveries. New conflicting events return 409; invalid
workspace IDs and timestamps return 400. Recipientless events remain explicitly
acknowledged without creating a workspace notification.

The foundation integration suite verifies global/tenant uniqueness, concurrent
replays and conflicts, legacy replay adoption, transactional rollback, bulk read
events, disjoint worker claims, lease fencing/recovery, subscriber progress, and
retry backoff. Set the two test database variables described above to an isolated
database migrated through both migrations before running it.
