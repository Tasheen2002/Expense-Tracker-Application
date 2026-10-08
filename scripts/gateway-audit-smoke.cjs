const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { parse } = require('dotenv');
const config = parse(readFileSync('.env.docker-smoke'));
const container = `codex-gateway-audit-${Date.now()}`;
function docker(args, env = process.env) {
  const result = spawnSync('docker', args, { env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Docker ${args[0]} failed`);
  return result.stdout.trim();
}
async function main() {
  const env = { ...process.env, JWT_SECRET: config.JWT_SECRET, INTERNAL_API_KEY: config.INTERNAL_API_KEY };
  const upstreams = { IDENTITY_SERVICE_URL: 'identity:3002', EXPENSE_SERVICE_URL: 'expense:3003', CATEGORIZATION_SERVICE_URL: 'categorization:3004', APPROVAL_SERVICE_URL: 'approval:3005', BANK_FEED_SERVICE_URL: 'bank:3006', NOTIFICATION_SERVICE_URL: 'notification:3008', AUDIT_SERVICE_URL: 'audit:3009' };
  const flags = Object.entries(upstreams).flatMap(([key, value]) => ['-e', `${key}=http://expense_smoke_${value}`]);
  try {
    docker(['run', '-d', '--name', container, '--network', 'expense-smoke_default', '-p', '127.0.0.1::3001', '-e', 'NODE_ENV=production', '-e', 'JWT_SECRET', '-e', 'INTERNAL_API_KEY', ...flags, '-e', 'RECEIPT_SERVICE_URL=http://unavailable-receipt:3007', 'codex-gateway-audit:local'], env);
    const port = Number(docker(['port', container, '3001/tcp']).split(':').pop());
    async function request(path, method = 'GET', body, token) {
      return fetch(`http://127.0.0.1:${port}${path}`, { method, signal: AbortSignal.timeout(15000), headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(token ? { authorization: `Bearer ${token}` } : {}),
      }, body: body === undefined ? undefined : JSON.stringify(body) });
    }
    let started = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      try { if ((await request('/live')).ok) { started = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(started, 'Gateway started');
    const email = `gateway-audit-${randomUUID()}@example.test`, password = `Gateway-${randomUUID()}!`;
    assert.equal((await request('/api/v1/auth/register', 'POST', { email, password, fullName: 'Gateway audit smoke' })).status, 201);
    const login = await request('/api/v1/auth/login', 'POST', { email, password });
    assert.equal(login.status, 200); const token = (await login.json()).data.token;
    const workspace = await request('/api/v1/workspaces', 'POST', { name: `Gateway smoke ${randomUUID().slice(0, 8)}` }, token);
    assert.equal(workspace.status, 201); const workspaceId = (await workspace.json()).data.workspaceId;
    for (const path of ['expenses', 'stock', 'suggestions', 'notifications', 'audit-logs']) {
      const response = await request(`/api/v1/workspaces/${workspaceId}/${path}`, 'GET', undefined, token);
      assert.equal(response.status, 200, path);
    }
    const failure = await request(`/api/v1/workspaces/${workspaceId}/receipts`, 'GET', undefined, token);
    assert.ok([502, 503].includes(failure.status));
    assert.equal((await request('/health')).status, 503);
    assert.equal((await request('/live')).status, 200);
    assert.equal((await request('/api/v1/auth/logout', 'POST', undefined, token)).status, 204);
    assert.equal((await request(`/api/v1/workspaces/${workspaceId}/expenses`, 'GET', undefined, token)).status, 401);
    docker(['stop', '--time', '10', container]);
    assert.equal(docker(['inspect', '-f', '{{.State.ExitCode}}', container]), '0');
    writeFileSync('gateway-audit-live-verification.json', JSON.stringify({ verifiedAt: new Date().toISOString(), productionStartup: true, realServiceRouting: true, stockAndSuggestionRoutes: true, degradedReadiness: true, liveness: true, revocationAcrossServices: true, gracefulShutdown: true, syntheticWorkspaceId: workspaceId }, null, 2));
    console.log('Gateway Docker smoke passed: production startup, real service routing, readiness/liveness, revoked-session rejection and graceful shutdown.');
  } finally { spawnSync('docker', ['rm', '-f', container], { stdio: 'ignore' }); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
