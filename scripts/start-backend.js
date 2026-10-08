const { spawn } = require('child_process');
const path = require('path');
const { createInterface } = require('node:readline');
const { readFileSync, existsSync } = require('node:fs');
const dotenv = require('dotenv');
const { createTrafficFilter } = require('./backend-traffic-filter.cjs');
const verboseTraffic = process.env.BACKEND_VERBOSE_HTTP === 'true';
const summarizeTraffic = process.env.BACKEND_HTTP_SUMMARY === 'true';
const rootPath = path.resolve(__dirname, '..');
const readEnv = file => existsSync(file) ? dotenv.parse(readFileSync(file)) : {};
const rootEnvironment = readEnv(path.join(rootPath, '.env'));

const services = [
  { name: 'API Gateway', dir: 'apps/gateway', port: 3001 },
  { name: 'Identity Service', dir: 'apps/identity-access-service', port: 3002 },
  { name: 'Expense Budgeting', dir: 'apps/expense-budgeting-service', port: 3003 },
  { name: 'Categorization Service', dir: 'apps/categorization-service', port: 3004 },
  { name: 'Approval Policy', dir: 'apps/approval-policy-service', port: 3005 },
  { name: 'Bank Feed Service', dir: 'apps/bank-feed-service', port: 3006 },
  { name: 'Receipt Vault', dir: 'apps/receipt-vault-service', port: 3007 },
  { name: 'Notification Service', dir: 'apps/notification-service', port: 3008 },
  { name: 'Audit Compliance', dir: 'apps/audit-compliance-service', port: 3009 }
];

const formatTimeUTC = () => {
  const now = new Date();
  const timeStr = now.toISOString().split('T')[1].split('.')[0];
  return `\x1b[90m[${timeStr} UTC]\x1b[0m`; // Gray timestamp
};

// Clear the console to hide the command invocation lines
console.clear();

console.log(`${formatTimeUTC()} \x1b[32mINFO:\x1b[0m \x1b[36mInitializing 9 backend microservices...\x1b[0m`);

const activeProcesses = [];

// Clean shutdown handler
function shutdown() {
  console.log(`\n${formatTimeUTC()} \x1b[32mINFO:\x1b[0m \x1b[36mShutting down all services...\x1b[0m`);
  activeProcesses.forEach(p => {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      } else {
        p.kill('SIGTERM');
      }
    } catch (e) {}
  });
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

services.forEach(service => {
  const servicePath = path.resolve(__dirname, '..', service.dir);
  const serviceEnvironment = readEnv(path.join(servicePath, '.env'));
  
  // Run tsx watch src/index.ts directly
  // Each service reads its own DATABASE_URL from its local .env file
  const p = spawn(process.execPath, [require.resolve('tsx/cli'), 'watch', 'src/index.ts'], {
    cwd: servicePath,
    windowsHide: true,
    env: {
      ...rootEnvironment,
      ...serviceEnvironment,
      ...process.env,
      PORT: process.env.PORT ?? serviceEnvironment.PORT ?? String(service.port),
    }
  });

  activeProcesses.push(p);
  p.on('error', error => console.error(`[${service.name}] Unable to launch: ${error.message}`));
  p.on('exit', (code, signal) => {
    console.error(`[${service.name}] Process exited (${signal || code})`);
  });

  let launched = false;
  const traffic = createTrafficFilter(verboseTraffic);
  const summaryTimer = setInterval(() => {
    const count = traffic.drainSuccesses();
    if (summarizeTraffic && count) console.log(`${formatTimeUTC()} INFO: [${service.name}] ${count} successful internal/health requests in the last 30s`);
  }, 30_000);
  summaryTimer.unref();
  p.once('exit', () => clearInterval(summaryTimer));

  createInterface({ input: p.stdout }).on('line', line => {
      if (!line.trim()) return;

      // Extract and print clean running indicators
      if (line.includes('Running on') || line.includes('Server listening at') || line.includes('running at')) {
        if (!launched) {
          console.log(
            `${formatTimeUTC()} \x1b[32mINFO:\x1b[0m \x1b[36m${service.name} registered — running at http://localhost:${service.port}\x1b[0m`
          );
          launched = true;
        }
        return;
      }

      // Check if it's a JSON log
      if (line.trim().startsWith('{')) {
        try {
          const logObj = JSON.parse(line.trim());
          const decision = traffic.inspect(logObj);
          if (decision.suppress) return;

          // Print HTTP requests
          if (logObj.req) {
            console.log(
              `${formatTimeUTC()} \x1b[32mREQ:\x1b[0m \x1b[36m[${service.name}] ${logObj.req.method} ${logObj.req.url}\x1b[0m`
            );
            return;
          }

          // Print HTTP responses
          if (logObj.res) {
            const status = logObj.res.statusCode;
            const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
            console.log(
              `${formatTimeUTC()} \x1b[32mRES:\x1b[0m \x1b[36m[${service.name}] ${decision.request ? `${decision.request.method} ${decision.request.url} ` : ''}${statusColor}${status}\x1b[0m (${logObj.responseTime ? Math.round(logObj.responseTime) : 0}ms)`
            );
            return;
          }

          // Only show warnings and errors (level >= 40)
          if (logObj.level >= 40) {
            const levelStr = logObj.level === 40 ? '\x1b[33mWARN:\x1b[0m' : '\x1b[31mERROR:\x1b[0m';
            const eventContext = logObj.eventId ? ` (event ${logObj.eventType || ''} ${logObj.eventId})` : '';
            console.error(`${formatTimeUTC()} ${levelStr} \x1b[36m[${service.name}] ${logObj.msg || logObj.message || JSON.stringify(logObj)}${eventContext}\x1b[0m`);
          }
          return;
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Skip noise like prisma queries or outbox worker loop ticks
      if (line.includes('prisma:query') || (line.includes('[Outbox-Worker]') && !/failed|error|dead letter|lost lease/i.test(line))) {
        return;
      }

      // Output error logs so the developer knows if something goes wrong
      if (/\b(error|exception)\b|\bfailed\s+(to|with|because)\b/i.test(line)) {
        console.error(`${formatTimeUTC()} \x1b[31mERROR:\x1b[0m \x1b[36m[${service.name}] ${line}\x1b[0m`);
      }
  });

  createInterface({ input: p.stderr }).on('line', line => {
      if (!line.trim()) return;
      if (line.trim().startsWith('{')) {
        try {
          const warning = JSON.parse(line.trim());
          if (warning.component === 'Outbox-Worker' && warning.level === 40) {
            console.error(`${formatTimeUTC()} \x1b[33mWARN:\x1b[0m [${service.name}] ${warning.message} (event ${warning.eventType} ${warning.eventId}; HTTP ${(warning.httpStatuses || []).join(',') || 'n/a'}; ${warning.status})`);
            return;
          }
        } catch (_) { /* Preserve unparseable stderr below. */ }
      }
      if (line.includes('prisma:query') || (line.includes('[Outbox-Worker]') && !/failed|error|dead letter|lost lease/i.test(line)) || line.includes('tsx watch')) {
        return;
      }
      if (line.toLowerCase().includes('npm warn') || line.toLowerCase().includes('unknown env config') || line.toLowerCase().includes('deprecationwarning')) {
        return;
      }
      console.error(`${formatTimeUTC()} \x1b[31mSTDERR:\x1b[0m \x1b[36m[${service.name}] ${line}\x1b[0m`);
  });
});
