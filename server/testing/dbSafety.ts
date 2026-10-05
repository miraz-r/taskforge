/**
 * Database safety guards for the destructive integration suite.
 *
 * TEST SUPPORT ONLY. Imported by `scripts/run-db-tests.ts` and by
 * `server/__tests__/db/database.integration.test.ts`; never by the application.
 *
 * WHY THIS EXISTS
 * `cleanAll` empties every table, so pointing the suite at the application
 * database destroys real accounts. That is not hypothetical: the suite was run
 * against `taskforge` during development and deleted a registered account.
 *
 * The rule this module enforces is that the target must be *positively
 * identified* as disposable, which means asking the server rather than trusting
 * an environment variable. A URL that merely claims to be safe proves nothing —
 * a typo, a stale `.env`, or a copied shell export could point the suite at
 * production. Every check below therefore reads the identity PostgreSQL reports
 * for the live connection.
 *
 * Three independent conditions must all hold:
 *
 *   1. The connected database name ends in `_test`. `taskforge` cannot match, so
 *      no configuration mistake alone can make the application database a target.
 *   2. The connected database is not the application database, compared against
 *      the name in `DATABASE_URL`.
 *   3. The server is on loopback. A remote host is refused outright, so this
 *      suite can never wipe a database that is not on this machine.
 *
 * Anything unverifiable is a refusal, not a warning. A skipped suite that claims
 * to have passed is worse than one that refuses to start.
 */

import pg from 'pg'

/** Connection facts reported by the server itself, not by configuration. */
export interface DatabaseIdentity {
  /** `current_database()` */
  database: string
  /** `inet_server_addr()` — null for a non-TCP local connection. */
  serverAddress: string | null
  /** `current_user` */
  currentUser: string
}

/** A database name must end with this to be considered disposable. */
export const DISPOSABLE_NAME_SUFFIX = '_test'

/**
 * `inet_server_addr()` renders the address in CIDR form (`127.0.0.1/32`), so a
 * plain string comparison against `127.0.0.1` is wrong and would refuse a
 * perfectly local database. The prefix is stripped first, then the address is
 * matched.
 */
function isLoopbackAddress(address: string): boolean {
  const host = address.split('/')[0]?.trim().toLowerCase() ?? ''
  return (
    host === '::1' ||
    host === '::ffff:127.0.0.1' ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  )
}

export class UnsafeDatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeDatabaseError'
  }
}

/** Database name from a connection string. Credentials are never returned. */
export function databaseNameOf(connectionString: string): string {
  try {
    return new URL(connectionString).pathname.replace(/^\//, '')
  } catch {
    return ''
  }
}

export function isDisposableName(name: string): boolean {
  return name.endsWith(DISPOSABLE_NAME_SUFFIX) && name.length > DISPOSABLE_NAME_SUFFIX.length
}

/**
 * Throws unless every safety condition holds. Returns the identity on success so
 * callers can report exactly what they connected to.
 */
export function assertDisposableDatabase(
  identity: DatabaseIdentity,
  applicationDatabase: string,
): DatabaseIdentity {
  const { database, serverAddress } = identity

  if (database === '') {
    throw new UnsafeDatabaseError(
      'the server reported no database name, so the target cannot be identified',
    )
  }

  if (!isDisposableName(database)) {
    throw new UnsafeDatabaseError(
      `connected database "${database}" does not end in "${DISPOSABLE_NAME_SUFFIX}", ` +
        'so it is not disposable and this suite will not touch it',
    )
  }

  if (applicationDatabase !== '' && database === applicationDatabase) {
    throw new UnsafeDatabaseError(
      `connected database "${database}" is the APPLICATION database. This suite ` +
        'empties every table and must never run against it',
    )
  }

  if (serverAddress === null) {
    throw new UnsafeDatabaseError(
      'could not determine the server address, so a remote host cannot be ruled ' +
        'out. Refusing to run',
    )
  }

  if (!isLoopbackAddress(serverAddress)) {
    throw new UnsafeDatabaseError(
      `server address "${serverAddress}" is not loopback. This suite only ever ` +
        'clears a database on this machine',
    )
  }

  return identity
}

/** One-line summary for logs. Contains no credentials. */
export function describeIdentity(identity: DatabaseIdentity): string {
  return `${identity.database} on ${identity.serverAddress ?? 'unknown'} as ${identity.currentUser}`
}

/**
 * Asks the connected server what it actually is.
 *
 * Every field comes from a live `SELECT` against the open connection. Nothing is
 * read from the connection string, which is precisely the thing that cannot be
 * trusted. If the query fails the caller must refuse — there is no fallback that
 * treats an unknown database as safe.
 */
export async function probeDatabaseIdentity(
  connectionString: string,
): Promise<DatabaseIdentity> {
  const client = new pg.Client({ connectionString })
  try {
    await client.connect()
    const result = await client.query<{
      database: string
      server_address: string | null
      current_user: string
    }>(
      'SELECT current_database() AS database, ' +
        'inet_server_addr()::text AS server_address, ' +
        'current_user AS current_user',
    )
    const row = result.rows[0]
    if (!row) {
      throw new Error('the server returned no identity row')
    }
    return {
      database: row.database,
      serverAddress: row.server_address,
      currentUser: row.current_user,
    }
  } finally {
    await client.end().catch(() => undefined)
  }
}
