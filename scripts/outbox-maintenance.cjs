// Read-only by default. Replay is limited to proven historical audit-only events.
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { randomUUID } = require('node:crypto');
const { parse } = require('dotenv');
const { contracts, assess, validateLocalDatabase } = require('./lib/outbox-recovery-policy.cjs');
const root = resolve(__dirname, '..');
const services = {
  'identity-access': 'identity', 'expense-budgeting': 'expense', 'approval-policy': 'approval',
  'audit-compliance': 'audit', 'bank-feed': 'bank-feed', notification: 'notification',
  categorization: 'categorization', 'receipt-vault': 'receipt-vault',
};
const readEnv = file => existsSync(file) ? parse(readFileSync(file)) : {};
const rootEnv = readEnv(join(root, '.env'));
const args = process.argv.slice(2);
const mode = args.shift() || 'inspect';
const options = {};
while (args.length) {
  const key = args.shift();
  if (!['--service', '--limit', '--ids', '--after'].includes(key) || !args.length) throw new Error('Usage: outbox-maintenance.cjs inspect|replay [--service name] [--limit 50] [--ids UUID,...] [--after UUID]');
  if (options[key] !== undefined) throw new Error('Duplicate option');
  options[key] = args.shift();
}
if (!['inspect', 'replay'].includes(mode)) throw new Error('Expected inspect or replay');
const selection = options['--service'] || (mode === 'inspect' ? 'all' : '');
if (!(selection in services) && selection !== 'all') throw new Error('Choose a known service');
if (mode === 'replay' && selection !== 'expense-budgeting') throw new Error('Automatic replay currently supports only Expense historical audit contracts');
const limit = Number(options['--limit'] || 50);
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) throw new Error('Limit must be 1..500');
const ids = options['--ids']?.split(',');
if (ids && ids.some(id => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error('Invalid event ID');
const after = options['--after'];
if (after && (selection === 'all' || !/^[0-9a-f-]{36}$/i.test(after))) throw new Error('A cursor requires one selected service and a valid event ID');
const page = after ? { cursor: { id: after }, skip: 1 } : {};
const report = { mode, startedAt: new Date().toISOString(), services: [], events: [] };
const reportPath = join(tmpdir(), `expense-outbox-${mode}-${Date.now()}-${randomUUID()}.json`);
const persistReport = () => writeFileSync(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });

async function inspect(db, service) {
  if (!db.outboxEvent) {
    const summary = { service, role: 'event consumer; no outbound outbox' };
    report.services.push(summary); console.log(JSON.stringify(summary)); return;
  }
  const counts = await db.outboxEvent.groupBy({ by: ['status'], _count: { _all: true } });
  const deadTypes = await db.outboxEvent.groupBy({ by: ['eventType'], where: { status: 'DEAD_LETTER' }, _count: { _all: true } });
  const failures = {};
  for (const row of await db.outboxEvent.findMany({ where: { status: 'DEAD_LETTER' }, select: { error: true } })) {
    const error = row.error || '';
    const category = /quarantined|owning aggregate.*no longer exists/i.test(error) ? 'historical_orphan_quarantined'
      : /Unmapped event type/i.test(error) ? 'historical_unmapped_route'
      : /workspace|recipient|scope/i.test(error) ? 'event_scope_or_recipient'
      : /401|403|unauthorized|forbidden/i.test(error) ? 'authentication_or_permission'
      : /400|validation/i.test(error) ? 'consumer_rejected_contract'
      : /timeout|ECONN|fetch failed|circuit|500|502|503/i.test(error) ? 'downstream_delivery_failure'
      : 'manual_investigation';
    failures[category] = (failures[category] || 0) + 1;
  }
  const candidates = await db.outboxEvent.findMany({ where: { status: 'DEAD_LETTER', ...(ids ? { id: { in: ids } } : {}) },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: limit, ...page });
  for (const event of candidates) {
    let result = { reason: 'manual_review_required' };
    if (service === 'expense-budgeting') {
      const contract = contracts[event.eventType];
      const owner = contract && event.aggregateType === contract[0]
        ? await db[contract[1]].findUnique({ where: { id: event.aggregateId }, select: { workspaceId: true } }) : null;
      result = assess(event, owner);
    }
    report.events.push({ service, id: event.id, eventType: event.eventType, createdAt: event.createdAt, reason: result.reason });
  }
  const summary = { service, counts: counts.map(row => ({ status: row.status, count: row._count._all })),
    deadTypes: deadTypes.map(row => ({ eventType: row.eventType, count: row._count._all })), failures, sampled: candidates.length,
    nextCursor: candidates.length === limit ? candidates[candidates.length - 1].id : null };
  report.services.push(summary);
  console.log(JSON.stringify(summary));
}

async function replay(db, config) {
  const audit = new URL(`${config.AUDIT_SERVICE_URL || 'http://localhost:3009'}/api/v1/event-outbox/events`);
  if (audit.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(audit.hostname)
    || audit.username || audit.password || audit.search || audit.hash) throw new Error('Replay requires a local Audit endpoint');
  if (!config.INTERNAL_API_KEY) throw new Error('INTERNAL_API_KEY is required');
  const candidates = await db.outboxEvent.findMany({ where: { status: 'DEAD_LETTER', eventType: { in: Object.keys(contracts) },
    ...(ids ? { id: { in: ids } } : {}) }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: limit, ...page });
  for (const candidate of candidates) {
    const token = randomUUID();
    const claimed = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM expense_ledger.outbox_event WHERE id = ${candidate.id} FOR UPDATE`;
      const event = await tx.outboxEvent.findUnique({ where: { id: candidate.id } });
      if (!event) return null;
      const contract = contracts[event.eventType];
      const owner = contract && event.aggregateType === contract[0]
        ? await tx[contract[1]].findUnique({ where: { id: event.aggregateId }, select: { workspaceId: true } }) : null;
      const decision = assess(event, owner);
      const entry = { id: event.id, eventType: event.eventType, reason: decision.reason, outcome: 'quarantined',
        originalStatus: event.status, originalRetryCount: event.retryCount };
      report.events.push(entry);
      // Unknown prior acknowledgements require a separate subscriber review.
      if (!decision.payload) return null;
      if (event.deliveredTo.some(url => url !== audit.href)) { entry.reason = 'subscriber_review_required'; return null; }
      entry.outcome = 'claimed';
      persistReport(); // Save recovery intent before changing database state.
      return tx.outboxEvent.update({ where: { id: event.id }, data: { payload: decision.payload,
        status: 'PROCESSING', leaseToken: token, leaseExpiresAt: new Date(Date.now() + 120000) } });
    });
    if (!claimed) { persistReport(); continue; }
    const entry = report.events[report.events.length - 1];
    try {
      if (!claimed.deliveredTo.includes(audit.href)) {
        const response = await fetch(audit, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
          headers: { 'content-type': 'application/json', 'x-internal-api-key': config.INTERNAL_API_KEY },
          body: JSON.stringify({ eventId: claimed.id, eventType: claimed.eventType, aggregateId: claimed.aggregateId,
            aggregateType: claimed.aggregateType, payload: claimed.payload, timestamp: claimed.createdAt.toISOString() }) });
        if (![200, 201].includes(response.status)) throw new Error(`Audit HTTP ${response.status}`);
      }
      const saved = await db.outboxEvent.updateMany({ where: { id: claimed.id, status: 'PROCESSING', leaseToken: token },
        data: { status: 'PROCESSED', processedAt: new Date(), error: null, leaseToken: null, leaseExpiresAt: null,
          deliveredTo: [...new Set([...claimed.deliveredTo, audit.href])] } });
      if (saved.count !== 1) throw new Error('Recovery lease lost');
      entry.outcome = 'processed';
    } catch (error) {
      const reason = /^Audit HTTP \d+$|^Recovery lease lost$/.test(error.message) ? error.message : 'Audit transport failure';
      entry.outcome = 'failed'; entry.failure = reason;
      await db.outboxEvent.updateMany({ where: { id: claimed.id, status: 'PROCESSING', leaseToken: token },
        data: { status: 'DEAD_LETTER', error: `${candidate.error || ''}; ${reason}`, leaseToken: null, leaseExpiresAt: null } });
      process.exitCode = 1;
    }
    persistReport();
  }
  console.log(JSON.stringify({ selected: candidates.length, processed: report.events.filter(e => e.outcome === 'processed').length,
    quarantined: report.events.filter(e => e.outcome === 'quarantined').length, failed: report.events.filter(e => e.outcome === 'failed').length,
    nextCursor: candidates.length === limit ? candidates[candidates.length - 1].id : null }));
}

async function main() {
  for (const [service, client] of Object.entries(services)) {
    if (selection !== 'all' && service !== selection) continue;
    const local = readEnv(join(root, 'apps', `${service}-service`, '.env'));
    // A root DATABASE_URL often points to Identity. Never apply it to every service.
    if (process.env.OUTBOX_DATABASE_URL && selection === 'all') throw new Error('Database override requires one selected service');
    const config = { ...rootEnv, ...local, ...process.env,
      DATABASE_URL: process.env.OUTBOX_DATABASE_URL || local.DATABASE_URL };
    validateLocalDatabase(config.DATABASE_URL);
    const { PrismaClient } = require(join(root, 'apps', `${service}-service`, 'node_modules/.prisma', `client-${client}`));
    const db = new PrismaClient({ datasources: { db: { url: config.DATABASE_URL } } });
    try { if (mode === 'inspect') await inspect(db, service); else await replay(db, config); }
    finally { await db.$disconnect(); persistReport(); }
  }
  console.log(`Report: ${reportPath}`);
}
main().catch(error => { console.error('Outbox maintenance failed:', error.code || error.name); process.exitCode = 1; });
