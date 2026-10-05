/**
 * Runs the PostgreSQL integration suite against a DISPOSABLE test database.
 *
 * WHY THIS EXISTS
 * The suite empties every table between and after tests. It was originally run
 * against the application database and deleted a real account, so the target is
 * now a separate database — `taskforge_test` — that holds nothing but test rows.
 *
 * WHAT MAKES IT SAFE
 * `TEST_DATABASE_URL` is not trusted. Before any test runs, this script connects
 * and asks the server what it actually is (`current_database`,
 * `inet_server_addr`, `current_user`) and hands those facts to
 * `assertDisposableDatabase`, which refuses unless the database name ends in
 * `_test`, is not the application database, and is on loopback. A URL that
 * merely claims to be safe is not evidence; the server's own answer is.
 *
 * MIGRATIONS
 * The test database is migrated with `prisma migrate deploy` before the suite
 * runs, so it never shares schema state with the application database and can be
 * dropped and recreated freely.
 *
 * Usage:  npm run test:db
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertDisposableDatabase,
  databaseNameOf,
  describeIdentity,
  probeDatabaseIdentity,
} from '../server/testing/dbSafety'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function fail(message: string): never {
  console.error(`[test:db] ${message}`)
  process.exit(1)
}

const envPath = resolve(projectRoot, '.env')
if (!existsSync(envPath)) {
  fail(
    'no .env in the project root. Copy .env.example to .env and fill in the ' +
      'development credentials (see docs/architecture.md).',
  )
}

// Same loader the server uses, so development behaves identically everywhere.
process.loadEnvFile(envPath)

const testUrl = process.env.TEST_DATABASE_URL ?? ''
if (testUrl === '') {
  fail(
    'TEST_DATABASE_URL is not set in .env. It must point at a DISPOSABLE ' +
      'database whose name ends in _test, never at the application database.',
  )
}

const applicationDatabase = databaseNameOf(process.env.DATABASE_URL ?? '')

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolveExit) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      env,
    })
    child.on('exit', (code) => resolveExit(code ?? 1))
  })
}

async function main(): Promise<void> {
  // Ask the server what it actually is. Nothing here is read from configuration.
  let identity
  try {
    identity = await probeDatabaseIdentity(testUrl)
  } catch (error) {
    fail(
      `could not connect to TEST_DATABASE_URL: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

  // Throws unless the live connection is provably a disposable local database.
  assertDisposableDatabase(identity, applicationDatabase)

  console.log(
    `[test:db] verified against the server: ${describeIdentity(identity)}\n` +
      `[test:db] this suite DELETES all rows in "${identity.database}". The ` +
      `application database "${applicationDatabase || '(unset)'}" is not touched.`,
  )

  // Migrate the test database only. `migrate deploy` applies committed
  // migrations without prompting and never resets anything.
  const migrateEnv = { ...process.env, MIGRATION_DATABASE_URL: testUrl, DATABASE_URL: testUrl }
  const migrate = await run(
    process.execPath,
    [
      resolve(projectRoot, 'node_modules', 'prisma', 'build', 'index.js'),
      'migrate',
      'deploy',
    ],
    migrateEnv,
  )
  if (migrate !== 0) {
    fail(
      'applying migrations to the test database failed. Fix that before running ' +
        'the suite; the schema may be out of date.',
    )
  }

  const code = await run(
    process.execPath,
    [
      resolve(projectRoot, 'node_modules', 'vitest', 'vitest.mjs'),
      'run',
      '--project',
      'server',
      'server/__tests__/db',
    ],
    {
      ...process.env,
      // The suite reads DATABASE_URL; point it at the disposable database.
      DATABASE_URL: testUrl,
      RUN_DB_TESTS: 'true',
      // The name the SERVER reported, not the one the URL claimed. The suite
      // asserts this matches its own live probe, so neither side can drift.
      TASKFORGE_DB_TEST_TARGET: identity.database,
      // Lets the suite add an explicit "is this the app database?" check on top
      // of the name-suffix rule that already makes it impossible.
      TASKFORGE_APPLICATION_DATABASE: applicationDatabase,
    },
  )
  process.exit(code)
}

void main()
