# Audit database migrations

For a new audit database, run `prisma migrate deploy` from this service. CI
creates the database and applies both migrations before running the tests.

An existing audit database created with `prisma db push` already has the
`audit_compliance.audit_logs` table but no migration history. Back up that
database, then mark the initial table migration as applied without running it:

```sh
prisma migrate resolve --applied 20260929000000_init_audit_compliance
prisma migrate deploy
```

The second migration replaces the old indexes with workspace-scoped indexes.
Use the service's `DATABASE_URL` for both commands. Do not mark the initial
migration as applied on an empty database; run `prisma migrate deploy` there.
