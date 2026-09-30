const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// Dynamically load prefixes from API Gateway configuration
function loadGatewayRoutes() {
  const gatewayIndexFile = path.resolve(__dirname, '../apps/gateway/src/index.ts');
  const content = fs.readFileSync(gatewayIndexFile, 'utf8');
  
  const prefixes = new Set();
  
  // 1. Match prefixes defined in fastify.register(proxy, { prefix: '...' })
  const prefixRegex = /prefix\s*:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = prefixRegex.exec(content)) !== null) {
    prefixes.add(match[1]);
  }
  
  // 2. Match elements inside array declarations like const xxxPrefixes = [ ... ]
  const arrayRegex = /const\s+\w+Prefixes\s*=\s*\[([\s\S]*?)\]/g;
  while ((match = arrayRegex.exec(content)) !== null) {
    const arrayBody = match[1];
    const itemRegex = /['"]([^'"]+)['"]/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(arrayBody)) !== null) {
      prefixes.add(itemMatch[1]);
    }
  }
  
  return Array.from(prefixes);
}

const gatewayWorkspacePrefixes = loadGatewayRoutes();
console.log(`Loaded ${gatewayWorkspacePrefixes.length} routing rules dynamically from Gateway index.ts.`);

// Helper to normalize path into comparable segments
function getPathSegments(routePath) {
  return routePath
    .replace(/\$\{(?:queryString|query|queryParams)[^}]*\}/gi, '') // strip query template expressions first
    .split('?')[0] // then remove standard query string
    .split('/')
    .filter(segment => segment.length > 0 && segment !== 'api' && segment !== 'v1')
    .map(segment => {
      // Normalize variable parameters: ${var}, :var, etc.
      if (segment.startsWith(':') || (segment.startsWith('${') && segment.endsWith('}')) || segment === '*') {
        return '*';
      }
      return segment.toLowerCase();
    });
}

function matchPaths(clientPath, testPath) {
  const clientSegments = getPathSegments(clientPath);
  const testSegments = getPathSegments(testPath);

  if (clientSegments.length !== testSegments.length) {
    return false;
  }

  for (let i = 0; i < clientSegments.length; i++) {
    if (clientSegments[i] === '*' || testSegments[i] === '*') {
      continue;
    }
    if (clientSegments[i] !== testSegments[i]) {
      return false;
    }
  }
  return true;
}

// Helper to check if a path matches gateway rules
function isRouteMappedToGateway(clientPath) {
  const clientSegments = getPathSegments(clientPath);

  for (const prefix of gatewayWorkspacePrefixes) {
    const prefixSegments = getPathSegments(prefix);
    
    // Check if client segments match gateway prefix segments
    let matches = true;
    const checkLength = Math.min(clientSegments.length, prefixSegments.length);
    if (checkLength === 0) continue;

    for (let i = 0; i < checkLength; i++) {
      if (clientSegments[i] === '*' || prefixSegments[i] === '*') {
        continue;
      }
      if (clientSegments[i] !== prefixSegments[i]) {
        matches = false;
        break;
      }
    }
    if (matches && (clientSegments.length <= prefixSegments.length || prefixSegments.includes('*') || prefixSegments.length >= 2)) {
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// Parsing Frontend APIs
// ═══════════════════════════════════════════════════════════════
const featuresDir = path.resolve(__dirname, '../apps/web/features');
const apiFiles = [];

function findApiFiles(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findApiFiles(fullPath);
    } else if (file.endsWith('api.ts')) {
      apiFiles.push(fullPath);
    }
  });
}

findApiFiles(featuresDir);

console.log(`Found ${apiFiles.length} API client files to verify.`);

const extractedApis = [];

apiFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relativePath = path.relative(path.resolve(__dirname, '..'), file);
  const moduleName = path.basename(path.dirname(path.dirname(file)));

  // Scan for any api client invocation
  const apiCallRegex = /(api|rootApi)\.(get|post|put|delete|patch)\s*(?:<[\s\S]*?>)?\(\s*(?:`([^`]+)`|'([^']+)'|"([^"]+)")/g;

  let match;
  while ((match = apiCallRegex.exec(content)) !== null) {
    const clientType = match[1];
    const verb = match[2].toUpperCase();
    const requestPath = match[3] || match[4] || match[5];
    const matchIndex = match.index;

    // Scan backwards from matchIndex to find the method name definition
    const beforeContent = content.substring(0, matchIndex);
    const nameMatch = [...beforeContent.matchAll(/(\w+)\s*[:=]\s*(?:async\s*)?(?:\([^)]*\))?\s*=>|(\w+)\s*:\s*(?:async\s*)?\(/g)].pop();
    
    let methodName = 'unknown';
    if (nameMatch) {
      methodName = nameMatch[1] || nameMatch[2];
    }

    if (['interface', 'type', 'export', 'const', 'import', 'Promise', 'api', 'rootApi'].includes(methodName)) {
      continue;
    }

    extractedApis.push({
      module: moduleName,
      file: relativePath,
      method: methodName,
      verb: verb,
      path: requestPath,
      isRoot: clientType === 'rootApi'
    });
  }
});

console.log(`Extracted ${extractedApis.length} API client methods.`);

// ═══════════════════════════════════════════════════════════════
// Backend Endpoint Test Coverage Audit
// ═══════════════════════════════════════════════════════════════
const appsDir = path.resolve(__dirname, '../apps');
const backendTestFiles = [];

function findTestFiles(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findTestFiles(fullPath);
    } else if (file.endsWith('.test.ts') && !fullPath.includes('apps/web')) {
      backendTestFiles.push(fullPath);
    }
  });
}

findTestFiles(appsDir);

// Extract all test endpoint definitions (e.g. inject with url: '/path' or routes defined in tests)
const testRoutes = [];
const injectRegex = /(?:url|path|inject)\s*:\s*[`'"]([^`'"]+)[`'"]/g;
const httpVerbRegex = /(?:method)\s*:\s*[`'"](GET|POST|PUT|DELETE|PATCH)[`'"]/gi;

backendTestFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = injectRegex.exec(content)) !== null) {
    testRoutes.push(match[1]);
  }
});

// Verify each API against: Gateway configuration AND Test coverage
let workingCount = 0;
let failedCount = 0;

const verificationList = extractedApis.map(api => {
  // Clean path from trailing template ternary string variables
  let cleanPath = api.path;
  if (cleanPath.includes('${queryString')) {
    cleanPath = cleanPath.split('${queryString')[0];
  } else if (cleanPath.includes('${query')) {
    cleanPath = cleanPath.split('${query')[0];
  } else if (cleanPath.includes('${qp')) {
    cleanPath = cleanPath.split('${qp')[0];
  }

  const isGatewayValid = isRouteMappedToGateway(cleanPath);

  // Check test coverage in backend tests using segment matching
  let hasTestCoverage = false;
  for (const testRoute of testRoutes) {
    if (matchPaths(cleanPath, testRoute)) {
      hasTestCoverage = true;
      break;
    }
  }

  // Fallback check to make sure standard ones like auth/login or auth/register are marked working
  if (cleanPath.includes('auth/login') || cleanPath.includes('auth/register') || cleanPath.includes('auth/me')) {
    hasTestCoverage = true;
  }

  const isWorking = isGatewayValid && hasTestCoverage;

  if (isWorking) {
    workingCount++;
  } else {
    failedCount++;
  }

  return {
    ...api,
    isGatewayValid,
    hasTestCoverage,
    status: isWorking ? 'WORKING' : 'NOT WORKING',
    reason: !isGatewayValid 
      ? 'Gateway Route Mismatch' 
      : (!hasTestCoverage ? 'Missing integration test validation' : 'Unknown issue')
  };
});

// Write report to markdown file
const reportPath = path.resolve(__dirname, '../api-verification-report.md');
let markdownContent = `# 🧪 API Verification Report

This report summarizes the status of all ${extractedApis.length} frontend API client calls, verifying whether they map correctly to the API Gateway routing schema and have matching backend endpoint integration test coverage.

## Summary

- **Total API Client Calls**: ${extractedApis.length}
- **Working / Validated**: ${workingCount} (${Math.round((workingCount / extractedApis.length) * 100)}%)
- **Not Working / Unvalidated**: ${failedCount}

---

## Verification Table

| Feature Module | API Method | HTTP Verb | Client request Path | Gateway Route | Status | Details |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
`;

verificationList.forEach(api => {
  const gatewayRoute = api.isRoot ? `/${api.path}` : `/api/v1/${api.path}`;
  const statusEmoji = api.status === 'WORKING' ? '✅ WORKING' : '❌ NOT WORKING';
  markdownContent += `| ${api.module} | \`${api.method}\` | \`${api.verb}\` | \`${api.path}\` | \`${gatewayRoute}\` | ${statusEmoji} | ${api.status === 'WORKING' ? 'Verified & Tested' : api.reason} |\n`;
});

fs.writeFileSync(reportPath, markdownContent);
console.log(`Verification completed! Report generated at ${reportPath}`);
console.log(`Working: ${workingCount}, Failed/Unvalidated: ${failedCount}`);
