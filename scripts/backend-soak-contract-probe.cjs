// Replay one local soak event to diagnose its subscriber contract; no credentials in output.
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync } = require('node:fs');
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const results = JSON.parse(readFileSync('backend-soak-results.json', 'utf8'));
const { PrismaClient } = require('../apps/identity-access-service/node_modules/.prisma/client-identity');
const prisma = new PrismaClient({ datasources: { db: {
  url: `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/expense_tracker_identity`,
} } });
async function main() {
  try {
    assert.ok(results.actors[0]?.userId, 'A soak actor is required');
    const event = await prisma.outboxEvent.findFirstOrThrow({ where: {
      aggregateId: results.actors[0].userId, eventType: 'UserCreated',
    } });
    const probe = { at: new Date().toISOString(), eventId: event.id,
      eventType: event.eventType, workspacePresent: Object.hasOwn(event.payload, 'workspaceId'), responses: [] };
    for (const [service, port] of [['audit', 13009], ['notification', 13008]]) {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/event-outbox/events`, {
        method: 'POST', signal: AbortSignal.timeout(10000), headers: {
          'content-type': 'application/json', 'x-internal-api-key': config.INTERNAL_API_KEY,
        }, body: JSON.stringify({ eventId: event.id, eventType: event.eventType,
          aggregateId: event.aggregateId, aggregateType: event.aggregateType,
          payload: event.payload, timestamp: event.createdAt.toISOString() }),
      });
      const body = await response.json();
      probe.responses.push({ service, status: response.status, error: body.error });
    }
    writeFileSync('backend-soak-contract-probe.json', JSON.stringify(probe, null, 2));
    console.log(JSON.stringify(probe, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.name); process.exitCode = 1; });
