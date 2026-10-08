// Pair Fastify request/response logs so routine successes do not flood dev output.
function createTrafficFilter(verbose = false) {
  const requests = new Map();
  let successes = 0;
  return {
    inspect(log) {
      if (verbose || log.level >= 40) return { suppress: false };
      const key = log.reqId === undefined ? undefined : `${log.pid ?? ''}:${log.reqId}`;
      if (log.req && key !== undefined) {
        const pathname = String(log.req.url ?? '').split('?')[0];
        const routine = (log.req.method === 'POST' && pathname.endsWith('/event-outbox/events'))
          || (log.req.method === 'GET' && ['/health', '/live'].includes(pathname));
        if (routine) {
          if (requests.size >= 1000) requests.delete(requests.keys().next().value);
          requests.set(key, { method: log.req.method, url: log.req.url });
          return { suppress: true };
        }
      }
      if (log.res && key !== undefined) {
        const request = requests.get(key);
        requests.delete(key);
        if (request && log.res.statusCode >= 200 && log.res.statusCode < 300) {
          successes++;
          return { suppress: true };
        }
        return { suppress: false, request };
      }
      return { suppress: false };
    },
    drainSuccesses() {
      const count = successes;
      successes = 0;
      return count;
    },
  };
}
module.exports = { createTrafficFilter };
