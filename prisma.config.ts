import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Read lazily so `prisma generate` works without a database configured.
    url: process.env.DATABASE_URL ?? '',
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
