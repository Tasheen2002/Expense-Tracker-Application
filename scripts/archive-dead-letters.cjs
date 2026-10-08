// Local development only. Preview by default; --apply archives then deletes the snapshot IDs.
const { readFileSync, writeFileSync, mkdirSync, openSync, closeSync, fsyncSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomUUID, createHash } = require('node:crypto');
const { parse } = require('dotenv');
const { validateLocalDatabase } = require('./lib/outbox-recovery-policy.cjs');
const root = resolve(__dirname, '..');
if (process.argv.slice(2).some(arg => !['--apply', '--undelivered'].includes(arg))) throw new Error('Supported options: --apply --undelivered');
const apply = process.argv.includes('--apply');
const statuses = process.argv.includes('--undelivered') ? ['PENDING', 'FAILED', 'DEAD_LETTER'] : ['DEAD_LETTER'];
const services = { 'identity-access': 'identity', 'expense-budgeting': 'expense', 'approval-policy': 'approval',
  notification: 'notification', 'bank-feed': 'bank-feed', categorization: 'categorization', 'receipt-vault': 'receipt-vault' };
const clients = [];
const directory = join(tmpdir(), `expense-outbox-archive-${Date.now()}-${randomUUID()}`);
const results = [];
async function main() {
  try {
    // Snapshot IDs before cleanup. New events and in-flight deliveries are excluded.
    for (const [service, client] of Object.entries(services)) {
      const env = parse(readFileSync(join(root, 'apps', `${service}-service`, '.env')));
      validateLocalDatabase(env.DATABASE_URL);
      const { PrismaClient } = require(join(root, 'apps', `${service}-service`, 'node_modules/.prisma', `client-${client}`));
      const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
      clients.push({ db, service, ids: (await db.outboxEvent.findMany({ where: { status: { in: statuses } }, select: { id: true } })).map(row => row.id) });
    }
    if (apply) mkdirSync(directory, { mode: 0o700 });
    for (const { db, service, ids } of clients) {
      if (!apply || !ids.length) { console.log(`${service}: ${ids.length} selected${apply ? ', 0 deleted' : ' (preview)'}`); continue; }
      const source = readFileSync(join(root, 'apps', `${service}-service`, 'prisma/schema.prisma'), 'utf8');
      const block = source.match(/model OutboxEvent\s*\{([\s\S]*?)^\}/m)?.[1];
      const schema = block?.match(/@@schema\("([a-z_]+)"\)/)?.[1];
      const table = block?.match(/@@map\("([a-z_]+)"\)/)?.[1];
      if (!schema || !table) throw new Error('Cannot establish outbox table mapping');
      const result = await db.$transaction(async tx => {
        // Lock outbox rows; the final selection still requires the original IDs and status.
        await tx.$queryRawUnsafe(`SELECT id FROM "${schema}"."${table}" WHERE id::text=ANY($1::text[]) AND status::text=ANY($2::text[]) FOR UPDATE`, ids, statuses);
        const rows = await tx.outboxEvent.findMany({ where: { id: { in: ids }, status: { in: statuses } } });
        const json = JSON.stringify({ service, archivedAt: new Date().toISOString(), records: rows }, null, 2);
        const file = join(directory, `${service}.json`);
        const descriptor = openSync(file, 'wx', 0o600);
        try { writeFileSync(descriptor, json); fsyncSync(descriptor); } finally { closeSync(descriptor); }
        const hash = createHash('sha256').update(json).digest('hex');
        if (createHash('sha256').update(readFileSync(file)).digest('hex') !== hash) throw new Error('Archive verification failed');
        const deleted = await tx.outboxEvent.deleteMany({ where: { id: { in: rows.map(row => row.id) }, status: { in: statuses } } });
        if (deleted.count !== rows.length) throw new Error('Selected records changed; deletion rolled back');
        return { service, statuses, deleted: deleted.count, archive: file, sha256: hash };
      }, { timeout: 60000 });
      results.push(result); console.log(`${service}: ${result.deleted} archived and deleted`);
    }
  } finally {
    await Promise.all(clients.map(({ db }) => db.$disconnect()));
    if (apply && results.length) {
      writeFileSync(join(directory, 'manifest.json'), JSON.stringify(results, null, 2), { mode: 0o600 });
      console.log(`Private archive: ${directory}`);
    }
  }
}
main().catch(error => { console.error('Dead-letter archive failed:', error.code || error.message); process.exitCode = 1; });
