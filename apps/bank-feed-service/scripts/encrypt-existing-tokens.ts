import 'dotenv/config';
import { PrismaClient } from '../src/prisma-client';
import { BankTokenCipher } from '../src/shared/infrastructure/security/bank-token-cipher';

async function main(): Promise<void> {
  const cipher = new BankTokenCipher(process.env.BANK_FEED_TOKEN_ENCRYPTION_KEY);
  const prisma = new PrismaClient();
  try {
    const encrypted = await encryptExistingTokens(prisma, cipher);
    console.log(`Encrypted ${encrypted} legacy bank connection tokens`);
  } finally {
    await prisma.$disconnect();
  }
}

export async function encryptExistingTokens(prisma: PrismaClient, cipher: BankTokenCipher): Promise<number> {
  let encrypted = 0;
  let cursor: string | undefined;
  while (true) {
    const connections = await prisma.bankConnection.findMany({
      select: { id: true, workspaceId: true, accessToken: true },
      orderBy: { id: 'asc' },
      take: 100,
      ...(cursor ? { where: { id: { gt: cursor } } } : {}),
    });
    if (!connections.length) break;
    for (const connection of connections) {
      if (!connection.accessToken || connection.accessToken.startsWith('enc:v1:')) continue;
      const result = await prisma.bankConnection.updateMany({
        // A token rotation or disconnect since this read must win.
        where: { id: connection.id, workspaceId: connection.workspaceId, accessToken: connection.accessToken },
        data: {
          accessToken: cipher.encrypt(connection.accessToken, connection.id, connection.workspaceId),
        },
      });
      encrypted += result.count;
    }
    cursor = connections[connections.length - 1].id;
  }
  return encrypted;
}

if (require.main === module) main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
