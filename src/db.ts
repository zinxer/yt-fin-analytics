import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { requireEnv } from './config';

let client: PrismaClient | undefined;

// Lazily creates the Prisma client so that importing this module never needs the database.
export function getPrisma(): PrismaClient {
    if (!client) {
        const adapter = new PrismaMariaDb(requireEnv('DATABASE_URL'));
        client = new PrismaClient({ adapter });
    }
    return client;
}

export async function disconnectPrisma(): Promise<void> {
    if (client) {
        await client.$disconnect();
        client = undefined;
    }
}
