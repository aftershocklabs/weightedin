/**
 * Prisma Database Client
 * 
 * Singleton pattern to prevent multiple connections in development.
 * Per CLAUDE.md: Use Prisma for all database operations.
 * 
 * @module lib/db
 */

import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to `global` in development to prevent
// exhausting your database connection limit during hot reloading.
// See: https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
