import { createTestServer } from './apps/api/src/test-server.js';
import { MinimalContainer } from './apps/api/src/minimal-container.js';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('--- DIAGNOSTIC START ---');
  try {
    console.log('1. Testing Prisma instantiation...');
    const prisma = new PrismaClient();
    console.log('✓ Prisma OK');

    console.log('2. Testing MinimalContainer instantiation...');
    const container = new MinimalContainer(prisma);
    console.log('✓ MinimalContainer OK');

    console.log('3. Testing createTestServer...');
    const server = await createTestServer();
    console.log('✓ createTestServer OK');

    console.log('--- DIAGNOSTIC SUCCESS ---');
    process.exit(0);
  } catch (error) {
    console.error('--- DIAGNOSTIC FAILED ---');
    console.error(error);
    process.exit(1);
  }
}

main();
