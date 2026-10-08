// Local-only bank provider fixture. Runs inside the smoke Bank container.
const { createServer } = require('node:http');
createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname !== '/transactions') { response.writeHead(404); response.end(); return; }
  const token = request.headers.authorization || '';
  if (!token.startsWith('Bearer smoke-')) { response.writeHead(401); response.end(); return; }
  if (token.includes('unavailable')) { response.writeHead(503); response.end(); return; }
  if (!url.searchParams.get('fromDate') || !url.searchParams.get('toDate')) {
    response.writeHead(400); response.end(); return;
  }
  response.setHeader('content-type', 'application/json');
  const transaction = {
    externalId: token.replace('Bearer ', ''), amount: '12.34', currency: 'USD',
    description: 'Gateway fixture purchase', merchantName: 'Smoke fixture merchant',
    transactionDate: new Date().toISOString(),
  };
  response.end(JSON.stringify({ transactions: [transaction, transaction] }));
}).listen(19090, '127.0.0.1');
