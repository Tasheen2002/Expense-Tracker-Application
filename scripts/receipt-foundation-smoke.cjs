const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { parse } = require('dotenv');
const { PrismaClient } = require('../apps/receipt-vault-service/node_modules/.prisma/client-receipt-vault');
const config = parse(readFileSync('.env.docker-smoke'));
const database = `codex_test_receipt_smoke_${Date.now()}`, container = `codex-receipt-smoke-${Date.now()}`;
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/`;
const admin = new PrismaClient({ datasources: { db: { url: base + 'postgres' } } });
const prisma = new PrismaClient({ datasources: { db: { url: base + database } } });
function execute(command, args, env = process.env) {
  const result = spawnSync(command, args, { env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} ${args[0]} failed`);
  return result.stdout.trim();
}
async function request(port, path, method = 'GET', body, actor) {
  return fetch(`http://127.0.0.1:${port}${path}`, { method, signal: AbortSignal.timeout(10000), headers: {
    ...(body === undefined ? {} : { 'content-type': 'application/json' }), 'x-internal-api-key': config.INTERNAL_API_KEY,
    ...(actor ? { 'x-user-id': actor.id, 'x-user-email': actor.email, authorization: `Bearer ${actor.token}` } : {}),
  }, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function jsonRequest(...args) { const response = await request(...args); const value = await response.json(); assert(response.ok, `HTTP ${response.status}: ${value.message || value.error}`); return value; }
async function eventually(check) { for (let i = 0; i < 45; i++) { try { if (await check()) return; } catch {} await new Promise(resolve => setTimeout(resolve, 500)); } throw new Error('Smoke verification timed out'); }
async function main() {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  try {
    execute(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/receipt-vault-service/prisma/schema.prisma'], { ...process.env, DATABASE_URL: base + database });
    const env = { ...process.env, DATABASE_URL: `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@expense_smoke_postgres:5432/${database}`, INTERNAL_API_KEY: config.INTERNAL_API_KEY };
    execute('docker', ['run', '-d', '--name', container, '--network', 'expense-smoke_default', '-p', '127.0.0.1:13007:3007', '-v', '/app/uploads', '-e', 'DATABASE_URL', '-e', 'INTERNAL_API_KEY', '-e', 'IDENTITY_SERVICE_URL=http://expense_smoke_identity:3002', '-e', 'EXPENSE_SERVICE_URL=http://expense_smoke_expense:3003', '-e', 'AUDIT_SERVICE_URL=http://expense_smoke_audit:3009', 'codex-receipt-foundation:local'], env);
    await eventually(async () => (await request(13007, '/health')).ok);
    assert.equal((await fetch('http://127.0.0.1:13007/api/v1/workspaces/' + randomUUID() + '/receipts')).status, 403);
    const email = `receipt-smoke-${randomUUID()}@example.test`, password = `Smoke-${randomUUID()}!`;
    await jsonRequest(13002, '/api/v1/auth/register', 'POST', { email, password, fullName: 'Receipt foundation smoke' });
    const login = await jsonRequest(13002, '/api/v1/auth/login', 'POST', { email, password });
    const actor = { email, id: login.data.user.userId, token: login.data.token };
    const workspace = await jsonRequest(13002, '/api/v1/workspaces', 'POST', { name: `Receipt smoke ${randomUUID().slice(0, 8)}` }, actor);
    const workspaceId = workspace.data.workspaceId, scoped = `/api/v1/workspaces/${workspaceId}/receipts`;
    const bytes = Buffer.from('%PDF-1.7 local Docker receipt fixture');
    const upload = await jsonRequest(13007, scoped + '/upload', 'POST', { originalName: 'receipt.pdf', mimeType: 'application/pdf', fileContent: bytes.toString('base64') }, actor);
    const receiptId = upload.data.receiptId;
    assert.equal((await request(13007, scoped + '/upload', 'POST', { originalName: 'duplicate.pdf', mimeType: 'application/pdf', fileContent: bytes.toString('base64') }, actor)).status, 409);
    const download = await request(13007, `${scoped}/${receiptId}/download`, 'GET', undefined, actor);
    assert.equal(download.status, 200); assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
    assert.equal((await request(13007, `${scoped}/${receiptId}/link-expense`, 'POST', { expenseId: randomUUID() }, actor)).status, 404);
    await jsonRequest(13007, `${scoped}/${receiptId}/metadata`, 'POST', { paymentMethod: 'cash', lastFourDigits: '1234', invoiceNumber: 'old', poNumber: 'old-po', totalAmount: 0 }, actor);
    const metadata = await jsonRequest(13007, `${scoped}/${receiptId}/metadata`, 'PATCH', { paymentMethod: 'card', lastFourDigits: '9999', invoiceNumber: 'new', poNumber: 'new-po' }, actor);
    assert.equal(metadata.data.paymentMethod, 'card'); assert.equal(metadata.data.lastFourDigits, '9999');
    assert.equal(metadata.data.invoiceNumber, 'new'); assert.equal(metadata.data.poNumber, 'new-po'); assert.equal(metadata.data.totalAmount, '0');
    const tagPath = `/api/v1/workspaces/${workspaceId}/receipt-tags`;
    const tag = await jsonRequest(13007, tagPath, 'POST', { name: 'Smoke tag', color: '#112233', description: 'clear me' }, actor);
    const cleared = await jsonRequest(13007, `${tagPath}/${tag.data.tagId}`, 'PATCH', { color: '', description: '' }, actor);
    assert.equal(cleared.data.color ?? null, null); assert.equal(cleared.data.description ?? null, null);
    const tagRow = await prisma.receiptTagDefinition.findUniqueOrThrow({ where: { id: tag.data.tagId } });
    assert.equal(tagRow.color, null); assert.equal(tagRow.description, null);
    for (let i = 0; i < 2; i++) await jsonRequest(13007, `${scoped}/${receiptId}/tags`, 'POST', { tagId: tag.data.tagId }, actor);
    assert.equal(await prisma.outboxEvent.count({ where: { aggregateId: receiptId, eventType: 'ReceiptTagAssigned' } }), 1);
    assert.equal((await request(13007, `${scoped}/${receiptId}/process`, 'POST', { ocrConfidence: 1.234 }, actor)).status, 400);
    assert.equal((await prisma.receipt.findUniqueOrThrow({ where: { id: receiptId } })).status, 'PENDING');
    await jsonRequest(13007, `${scoped}/${receiptId}/process`, 'POST', { ocrText: 'Externally extracted text', ocrConfidence: 90 }, actor);
    await jsonRequest(13007, `${scoped}/${receiptId}/verify`, 'POST', undefined, actor);
    await jsonRequest(13007, `${scoped}/${receiptId}/reject`, 'POST', { reason: 'Smoke lifecycle check' }, actor);
    const stats = await jsonRequest(13007, scoped + '/stats', 'GET', undefined, actor);
    assert.equal(stats.data.total, 1); assert.equal(stats.data.rejected, 1);
    await jsonRequest(13007, `${tagPath}/${tag.data.tagId}`, 'DELETE', undefined, actor);
    await eventually(async () => (await prisma.outboxEvent.count({ where: { status: { not: 'PROCESSED' } } })) === 0);
    const uploadedEvent = await prisma.outboxEvent.findFirstOrThrow({ where: { aggregateId: receiptId, eventType: 'ReceiptUploaded' } });
    await eventually(async () => (await prisma.outboxEvent.findUniqueOrThrow({ where: { id: uploadedEvent.id } })).status === 'PROCESSED');
    execute('docker', ['restart', container]);
    await eventually(async () => (await request(13007, '/health')).ok);
    assert.equal((await request(13007, `${scoped}/${receiptId}/download`, 'GET', undefined, actor)).status, 200);
    const row = await prisma.receipt.findUniqueOrThrow({ where: { id: receiptId } });
    await jsonRequest(13007, `${scoped}/${receiptId}?permanent=true`, 'DELETE', undefined, actor);
    await eventually(async () => (await prisma.outboxEvent.findFirst({ where: { aggregateId: receiptId, eventType: 'ReceiptFileDeletionRequested' } }))?.status === 'PROCESSED');
    assert.equal(execute('docker', ['exec', container, 'node', '-e', `process.stdout.write(String(require('fs').existsSync('/app/uploads/${row.storageKey}')))`]), 'false');
    writeFileSync('receipt-vault-live-verification.json', JSON.stringify({ upload: true, authenticatedDownload: true, duplicateRejected: true, inaccessibleExpenseRejected: true, metadataFullUpdate: true, tagClearing: true, tagAssignmentDeduplication: true, invalidOcrNoMutation: true, rejectedIncludedInStats: true, mutationAuditDelivery: true, auditDelivery: true, restartPreservesFiles: true, durableFileDeletion: true, workspaceId, receiptId }, null, 2));
    console.log('Receipt Docker smoke passed: upload/download, duplicate prevention, expense isolation, audit delivery, restart and durable deletion.');
  } finally {
    spawnSync('docker', ['rm', '-f', '-v', container], { stdio: 'ignore' });
    await prisma.$disconnect(); await admin.$executeRawUnsafe(`DROP DATABASE "${database}" WITH (FORCE)`); await admin.$disconnect();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
