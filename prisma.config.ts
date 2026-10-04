import { defineConfig } from 'prisma/config'

/**
 * Prisma 7 configuration.
 *
 * Prisma 7 removed `url` from the schema's datasource block. The migrate-time
 * connection URL lives here, and the runtime connection is supplied as a driver
 * adapter on the PrismaClient constructor (see server/repositories/prisma.ts).
 *
 * TWO URLS, TWO ROLES. `MIGRATION_DATABASE_URL` is preferred for Prisma CLI
 * commands and points at a role that owns the schema, so it can create and alter
 * objects. `DATABASE_URL` is the application's runtime credential and is granted
 * only data privileges. Separating them means a compromised application process
 * cannot alter the schema. `DATABASE_URL` remains the fallback so a single-URL
 * setup still works.
 *
 * `prisma generate` and `prisma validate` do not need a database, so the
 * datasource block is omitted when neither URL is set. Migration commands require
 * one and will fail loudly with Prisma's own error if it is missing.
 */
const migrationUrl =
  process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL

export default defineConfig({
  schema: 'server/prisma/schema.prisma',
  migrations: {
    path: 'server/prisma/migrations',
  },
  ...(migrationUrl ? { datasource: { url: migrationUrl } } : {}),
})
