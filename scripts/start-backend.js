const { spawn } = require('child_process');
const path = require('path');

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
      p.kill();
    } catch (e) {}
  });
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

services.forEach(service => {
  const servicePath = path.resolve(process.cwd(), service.dir);
  
  // Run tsx watch src/index.ts directly
  // Each service reads its own DATABASE_URL from its local .env file
  const p = spawn('npx', ['tsx', 'watch', 'src/index.ts'], {
    cwd: servicePath,
    shell: true,
    env: {
      ...process.env,
    }
  });

  activeProcesses.push(p);

  let launched = false;

  p.stdout.on('data', data => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
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
              `${formatTimeUTC()} \x1b[32mRES:\x1b[0m \x1b[36m[${service.name}] ${statusColor}${status}\x1b[0m (${logObj.responseTime ? Math.round(logObj.responseTime) : 0}ms)`
            );
            return;
          }

          // Only show warnings and errors (level >= 40)
          if (logObj.level >= 40) {
            const levelStr = logObj.level === 40 ? '\x1b[33mWARN:\x1b[0m' : '\x1b[31mERROR:\x1b[0m';
            console.error(`${formatTimeUTC()} ${levelStr} \x1b[36m[${service.name}] ${logObj.msg || logObj.message || JSON.stringify(logObj)}\x1b[0m`);
          }
          return;
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Skip noise like prisma queries or outbox worker loop ticks
      if (line.includes('prisma:query') || line.includes('[Outbox-Worker]')) {
        return;
      }

      // Output error logs so the developer knows if something goes wrong
      if (line.toLowerCase().includes('error') || line.toLowerCase().includes('fail') || line.toLowerCase().includes('exception')) {
        console.error(`${formatTimeUTC()} \x1b[31mERROR:\x1b[0m \x1b[36m[${service.name}] ${line}\x1b[0m`);
      }
    });
  });

  p.stderr.on('data', data => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (!line.trim()) return;
      if (line.includes('prisma:query') || line.includes('[Outbox-Worker]') || line.includes('tsx watch')) {
        return;
      }
      if (line.toLowerCase().includes('npm warn') || line.toLowerCase().includes('unknown env config') || line.toLowerCase().includes('deprecationwarning')) {
        return;
      }
      console.error(`${formatTimeUTC()} \x1b[31mSTDERR:\x1b[0m \x1b[36m[${service.name}] ${line}\x1b[0m`);
    });
  });
});
