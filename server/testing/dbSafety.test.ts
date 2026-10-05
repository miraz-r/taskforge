/**
 * Unit tests for the destructive-suite safety guards.
 *
 * These are the guards that stop `cleanAll` from deleting a real account, so
 * they are tested as pure functions: no database, no network, no fixtures.
 *
 * Each refusal below corresponds to a way the suite could otherwise be pointed
 * at the application database. `assertDisposableDatabase` is what both
 * `scripts/run-db-tests.ts` and the integration suite consult, so a pass here is
 * a pass for both call sites.
 */

import { describe, expect, it } from 'vitest'
import {
  assertDisposableDatabase,
  databaseNameOf,
  describeIdentity,
  isDisposableName,
  UnsafeDatabaseError,
  type DatabaseIdentity,
} from './dbSafety'

/** A plausible disposable target. Tests vary exactly one field at a time. */
function identity(overrides: Partial<DatabaseIdentity> = {}): DatabaseIdentity {
  return {
    database: 'taskforge_test',
    serverAddress: '127.0.0.1',
    currentUser: 'taskforge_migrate',
    ...overrides,
  }
}

const APPLICATION_DATABASE = 'taskforge'

describe('assertDisposableDatabase', () => {
  it('accepts a loopback database whose name ends in _test', () => {
    expect(() =>
      assertDisposableDatabase(identity(), APPLICATION_DATABASE),
    ).not.toThrow()
  })

  it('returns the identity so callers can report what they connected to', () => {
    const probe = identity()
    expect(assertDisposableDatabase(probe, APPLICATION_DATABASE)).toEqual(probe)
  })

  describe('refuses the application database', () => {
    it('rejects a name that does not end in _test', () => {
      expect(() =>
        assertDisposableDatabase(
          identity({ database: 'taskforge' }),
          APPLICATION_DATABASE,
        ),
      ).toThrow(UnsafeDatabaseError)
    })

    it('rejects a production-style name', () => {
      expect(() =>
        assertDisposableDatabase(
          identity({ database: 'taskforge_production' }),
          APPLICATION_DATABASE,
        ),
      ).toThrow(/does not end in "_test"/)
    })

    it('rejects the application database even if it somehow ends in _test', () => {
      // Belt and braces: the suffix rule is the load-bearing check, but an
      // explicit app-database match must also refuse.
      expect(() =>
        assertDisposableDatabase(
          identity({ database: 'taskforge_test' }),
          'taskforge_test',
        ),
      ).toThrow(/is the APPLICATION database/)
    })

    it('rejects a name that is only the bare suffix', () => {
      expect(() =>
        assertDisposableDatabase(identity({ database: '_test' }), ''),
      ).toThrow(UnsafeDatabaseError)
    })

    it('rejects an empty database name rather than treating it as unknown-safe', () => {
      expect(() =>
        assertDisposableDatabase(identity({ database: '' }), ''),
      ).toThrow(/no database name/)
    })
  })

  describe('refuses a remote server', () => {
    it('rejects a routable address', () => {
      expect(() =>
        assertDisposableDatabase(
          identity({ serverAddress: '10.0.0.5' }),
          APPLICATION_DATABASE,
        ),
      ).toThrow(/is not loopback/)
    })

    it('rejects a public address', () => {
      expect(() =>
        assertDisposableDatabase(
          identity({ serverAddress: '203.0.113.9' }),
          APPLICATION_DATABASE,
        ),
      ).toThrow(/is not loopback/)
    })

    it('accepts IPv6 loopback', () => {
      expect(() =>
        assertDisposableDatabase(
          identity({ serverAddress: '::1' }),
          APPLICATION_DATABASE,
        ),
      ).not.toThrow()
    })

    it('accepts the CIDR form PostgreSQL actually reports', () => {
      // `inet_server_addr()::text` yields '127.0.0.1/32'. An earlier revision
      // compared the raw string and refused a genuinely local database, which
      // would have made the suite unrunnable rather than safe.
      expect(() =>
        assertDisposableDatabase(
          identity({ serverAddress: '127.0.0.1/32' }),
          APPLICATION_DATABASE,
        ),
      ).not.toThrow()
    })

    it('accepts the whole 127.0.0.0/8 range', () => {
      expect(() =>
        assertDisposableDatabase(
          identity({ serverAddress: '127.0.0.1/8' }),
          APPLICATION_DATABASE,
        ),
      ).not.toThrow()
      expect(() =>
        assertDisposableDatabase(
          identity({ serverAddress: '127.1.2.3' }),
          APPLICATION_DATABASE,
        ),
      ).not.toThrow()
    })

    it('rejects a CIDR form of a routable address', () => {
      expect(() =>
        assertDisposableDatabase(
          identity({ serverAddress: '10.0.0.5/32' }),
          APPLICATION_DATABASE,
        ),
      ).toThrow(/is not loopback/)
    })

    it('rejects an undeterminable address instead of assuming local', () => {
      expect(() =>
        assertDisposableDatabase(
          identity({ serverAddress: null }),
          APPLICATION_DATABASE,
        ),
      ).toThrow(/could not determine the server address/)
    })
  })
})

describe('isDisposableName', () => {
  it('accepts a suffixed name', () => {
    expect(isDisposableName('taskforge_test')).toBe(true)
    expect(isDisposableName('scratch_test')).toBe(true)
  })

  it('rejects the application database', () => {
    expect(isDisposableName('taskforge')).toBe(false)
    expect(isDisposableName('postgres')).toBe(false)
  })

  it('rejects a suffix that is not at the end', () => {
    // `taskforge_test_backup` is not the name the guard approved.
    expect(isDisposableName('taskforge_test_backup')).toBe(false)
  })

  it('rejects the bare suffix', () => {
    expect(isDisposableName('_test')).toBe(false)
  })
})

describe('databaseNameOf', () => {
  it('extracts the name without exposing credentials', () => {
    const name = databaseNameOf(
      'postgresql://role:sup3r-secret@127.0.0.1:5432/taskforge_test',
    )
    expect(name).toBe('taskforge_test')
    expect(name).not.toContain('sup3r-secret')
  })

  it('returns an empty string for an unparseable string', () => {
    expect(databaseNameOf('not a url')).toBe('')
  })

  it('returns an empty string when no database is named', () => {
    expect(databaseNameOf('postgresql://role@127.0.0.1:5432/')).toBe('')
  })
})

describe('describeIdentity', () => {
  it('names the database, host and role but never a credential', () => {
    const line = describeIdentity(identity())
    expect(line).toBe('taskforge_test on 127.0.0.1 as taskforge_migrate')
    expect(line).not.toMatch(/password|secret|:\/\//)
  })

  it('says so when the address is unknown', () => {
    expect(describeIdentity(identity({ serverAddress: null }))).toContain(
      'unknown',
    )
  })
})