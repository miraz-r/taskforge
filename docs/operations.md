# TaskForge — Operations

**Status:** ACTIVE — backup/restore runbook and schema-change policy
**Scope:** deployment support, observability notes, runbooks
**Related:** `AGENTS.md` (workflow and authorization), `docs/architecture.md`
(system structure, §12.2 local PostgreSQL), `docs/api.md` (endpoint contracts)

---

## 1. Backup and restore

Strategy: **`pg_dump` + `pg_restore`**, full-database, custom format. PostgreSQL
17.11 tools live under `D:\The Arsenal\PostgreSQL\Applications\bin`
(see `docs/architecture.md` §12.2). No third-party backup tooling is used.

### 1.1 What is backed up

- The whole application database (`taskforge`): schema **and** data, one dump.
- Role definitions are **not** in a database dump. Roles change rarely; when they
  do, capture globals separately with `pg_dumpall --globals-only`. The two
  project roles and their grants are described in `docs/architecture.md` §12.2.

### 1.2 Taking a backup

Run as the migration role (schema owner). Credentials come from `.env`
(`MIGRATION_DATABASE_URL`); never paste a password into a command line —
`psql`, `pg_dump` and `pg_restore` all read `PGPASSWORD` from the environment.

```powershell
$env:PGPASSWORD = '<from .env, never committed, never echoed>'
& '<pg-bin>\pg_dump.exe' -h 127.0.0.1 -p 5432 -U taskforge_migrate `
  -Fc -f taskforge-<yyyymmdd>.dump taskforge
Remove-Item Env:\PGPASSWORD
```

- `-Fc` is the custom format: compressed, and `pg_restore` can reload it into a
  database that already exists. Prefer it over plain SQL for routine backups.
- A backup is verified only by restoring it somewhere disposable (see §1.3). A
  dump file that has never been restored is an untested artifact, not a backup.

### 1.3 Restoring — scratch database only

**Never restore into `taskforge`.** A restore overwrites the target, so the
target is always a separate scratch database created for the purpose, verified,
then dropped.

```powershell
$env:PGPASSWORD = '<from .env, never committed, never echoed>'
& '<pg-bin>\psql.exe' -h 127.0.0.1 -p 5432 -U taskforge_migrate `
  -d postgres -w -c "CREATE DATABASE taskforge_scratch OWNER taskforge_migrate;"
& '<pg-bin>\pg_restore.exe' -h 127.0.0.1 -p 5432 -U taskforge_migrate `
  -d taskforge_scratch taskforge-<yyyymmdd>.dump
Remove-Item Env:\PGPASSWORD
```

Then verify before trusting the restore (§1.5), and drop the scratch database
when done:

```powershell
& '<pg-bin>\psql.exe' -h 127.0.0.1 -p 5432 -U taskforge_migrate `
  -d postgres -w -c "DROP DATABASE taskforge_scratch;"
```

The scratch name must **not** end in `_test`: that suffix is reserved for the
destructive integration suite (`server/testing/dbSafety.ts`), and anything
bearing it may be emptied by `npm run test:db`.

### 1.4 RPO / RTO — project decisions, not engineering values

The repository defines **no** recovery-point or recovery-time objectives. Until
they are decided, the honest statement is:

- **RPO:** time since the last manual dump. There is no scheduled backup, so any
  data written after the newest dump file is unrecoverable from dumps.
- **RTO:** time to provision a database, `pg_restore`, point the application at
  it, and verify. Never measured; the §1.5 procedure is the rehearsal.

Do not invent numbers here. Setting an RPO/RTO is a project decision for the
repository owner; this document records the current manual state until then.
Before any production use, decide at minimum: backup schedule, dump retention,
where dumps are stored, and who may restore.

### 1.5 Verification procedure

After any restore, compare source and target before trusting either:

1. Both databases report the same table list (all eight application tables).
2. Row counts match per table.
3. `prisma migrate status --schema server/prisma/schema.prisma` reports the
   restored database up to date (run with `MIGRATION_DATABASE_URL` pointed at
   the restored database; it is a read-only check).

This procedure was last exercised end-to-end against disposable scratch
databases; the scratch databases were dropped and the dump file deleted
afterwards, leaving `taskforge` and `taskforge_test` untouched.

## 2. Schema-change policy

Prisma migrations in this repository are **forward-only**:

- No down-migrations or revert migrations are maintained. Prisma Migrate has no
  down-migration mechanism, and none is emulated here.
- Rolling back a deployed schema or data change is handled one of two ways, as
  appropriate: a **corrective forward migration** (the normal case), or a
  **database restore** from a pre-change dump (when data must return to its
  earlier state and a forward fix cannot reconstruct it).
- `prisma migrate dev`, `prisma migrate reset`, and any destructive schema
  command are never run against `taskforge`. Schema changes reach it through
  reviewed migrations applied with `prisma migrate deploy`.
