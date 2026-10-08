// Real Docker services; a loopback measurement gateway leaves their quotas enabled.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync, appendFileSync } = require('node:fs');
const { spawn, spawnSync } = require('node:child_process');
const results = { startedAt: new Date().toISOString(), durationSeconds: 120, users: [], isolation: {} };
const isolationOnly = process.argv.includes('--isolation-only');
if (isolationOnly) {
  const previous = JSON.parse(readFileSync('identity-multi-user-load-results.json', 'utf8'));
  assert.ok(previous.users.length === 3 && previous.users.every(u => u.statuses['200'] === 60));
  results.users = previous.users;
  results.loadStartedAt = previous.startedAt;
}
const log = 'identity-multi-user-load.log';
writeFileSync(log, `Multi-user verification ${results.startedAt}\n`);
let gateway, processHandle;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(path, token, body) {
  const started = performance.now();
  const r = await fetch(gateway + path, { method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(15000),
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const data = await r.json();
  return { status: r.status, ms: performance.now() - started, value: data,
    quotaLimit: r.headers.get('x-ratelimit-limit'), quotaRemaining: r.headers.get('x-ratelimit-remaining') };
}
async function setup(label) {
  const email = `multi-load-${randomUUID()}@example.test`, password = `Multi-${randomUUID()}!`;
  assert.equal((await request('/api/v1/auth/register', undefined, { email, password, fullName: label })).status, 201);
  const login = await request('/api/v1/auth/login', undefined, { email, password }); assert.equal(login.status, 200);
  const token = login.value.data.token;
  const ws = await request('/api/v1/workspaces', token, { name: `Multi ${randomUUID().slice(0, 8)}` }); assert.equal(ws.status, 201);
  return { token, userId: login.value.data.user.userId, workspaceId: ws.value.data.workspaceId };
}
async function main() {
  try {
    const build = spawnSync(process.execPath, ['node_modules/esbuild/bin/esbuild', 'scripts/backend-load-gateway.ts', '--bundle', '--platform=node', '--target=node20', '--format=cjs', '--outfile=tmp/backend-load-gateway.cjs'], { encoding: 'utf8' });
    assert.equal(build.status, 0, 'Measurement gateway build failed');
    processHandle = spawn(process.execPath, ['tmp/backend-load-gateway.cjs'], { stdio: ['ignore', 'pipe', 'pipe'] });
    processHandle.stdout.on('data', d => { appendFileSync(log, d); const m = String(d).match(/LOAD_GATEWAY_URL=(http:\/\/[^\s]+)/); if (m) gateway = m[1]; });
    processHandle.stderr.on('data', d => appendFileSync(log, d));
    for (let i = 0; i < 100 && !gateway; i++) await sleep(100);
    assert.ok(gateway, 'Measurement gateway startup');
    const actors = [];
    for (const label of isolationOnly ? ['User A', 'User B'] : ['User A', 'User B', 'User C']) actors.push(await setup(label));
    if (!isolationOnly) {
    console.log('Starting two-minute mixed profile/expense reads for three users sharing the gateway');
    await Promise.all(actors.map(async actor => {
      const samples = [], started = Date.now();
      for (let i = 0; i < 60; i++) {
        const r = await request(i % 2 ? `/api/v1/workspaces/${actor.workspaceId}/expenses` : '/api/v1/auth/me', actor.token);
        samples.push({ status: r.status, ms: r.ms });
        await sleep(Math.max(0, started + (i + 1) * 2000 - Date.now()));
      }
      const times = samples.map(s => s.ms).sort((a, b) => a - b), statuses = {};
      for (const s of samples) statuses[s.status] = (statuses[s.status] || 0) + 1;
      results.users.push({ userId: actor.userId, workspaceId: actor.workspaceId, requests: samples.length,
        durationMs: Date.now() - started, statuses, p95Ms: times[Math.ceil(times.length * .95) - 1], p99Ms: times[times.length - 1] });
    }));
    assert.ok(results.users.every(u => u.statuses['200'] === 60), `Unexpected statuses: ${JSON.stringify(results.users)}`);
    console.log('PASS: 180 mixed requests across three users, all HTTP 200');
    }
    let aStatus;
    // At the end of the two-minute stage a fixed window can roll over mid-probe.
    // Bound attempts across two windows rather than assuming its exact phase.
    let attempts = 0;
    for (; attempts < 201; attempts++) {
      const r = await request('/api/v1/auth/me', actors[0].token);
      aStatus = r.status;
      if (aStatus === 429) break;
      assert.equal(aStatus, 200);
    }
    assert.equal(aStatus, 429, 'User A must reach its profile quota within 201 attempts');
    const bStatus = (await request('/api/v1/auth/me', actors[1].token)).status;
    assert.equal(bStatus, 200);
    // Exercise the authenticated gateway session-check path, not only its auth proxy.
    assert.equal((await request(`/api/v1/workspaces/${actors[0].workspaceId}/expenses`, actors[0].token)).status, 429);
    assert.equal((await request(`/api/v1/workspaces/${actors[1].workspaceId}/expenses`, actors[1].token)).status, 200);
    results.isolation = { exhaustedUserStatus: aStatus, otherUserStatus: bStatus,
      attempts: attempts + 1, actorUserIds: actors.map(a => a.userId), protectedRoutes: '429 for A, 200 for B' };
    console.log('PASS: exhausting User A does not throttle User B on profile or protected expense reads');
  } catch (error) { results.failure = error.message; throw error; }
  finally {
    processHandle?.kill('SIGKILL');
    results.finishedAt = new Date().toISOString();
    writeFileSync('identity-multi-user-load-results.json', JSON.stringify(results, null, 2));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
