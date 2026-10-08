const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTrafficFilter } = require('./backend-traffic-filter.cjs');

test('summarizes successful webhook traffic and resets the summary counter', () => {
  const filter = createTrafficFilter();
  assert.equal(filter.inspect({ pid: 1, reqId: 'a', req: { method: 'POST', url: '/api/v1/event-outbox/events' } }).suppress, true);
  assert.equal(filter.inspect({ pid: 1, reqId: 'a', res: { statusCode: 201 } }).suppress, true);
  assert.equal(filter.drainSuccesses(), 1);
  assert.equal(filter.drainSuccesses(), 0);
});

test('keeps rejected deliveries and warnings visible with the request context', () => {
  const filter = createTrafficFilter();
  const req = { method: 'POST', url: '/api/v1/event-outbox/events' };
  filter.inspect({ reqId: 'a', req });
  assert.equal(filter.inspect({ reqId: 'a', level: 40, msg: 'Rejected event' }).suppress, false);
  const failure = filter.inspect({ reqId: 'a', res: { statusCode: 400 } });
  assert.equal(failure.suppress, false);
  assert.deepEqual(failure.request, req);
  assert.equal(filter.drainSuccesses(), 0);
});

test('keeps user traffic visible and separates IDs across restarted processes', () => {
  const filter = createTrafficFilter();
  filter.inspect({ pid: 1, reqId: 'a', req: { method: 'GET', url: '/health' } });
  assert.equal(filter.inspect({ pid: 2, reqId: 'a', req: { method: 'GET', url: '/api/v1/expenses' } }).suppress, false);
  assert.equal(filter.inspect({ pid: 2, reqId: 'a', res: { statusCode: 200 } }).suppress, false);
  assert.equal(filter.inspect({ pid: 1, reqId: 'a', res: { statusCode: 503 } }).suppress, false);
});

test('verbose mode retains each internal request and response', () => {
  const filter = createTrafficFilter(true);
  assert.equal(filter.inspect({ reqId: 'a', req: { method: 'GET', url: '/health' } }).suppress, false);
  assert.equal(filter.inspect({ reqId: 'a', res: { statusCode: 200 } }).suppress, false);
});
