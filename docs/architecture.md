# TaskForge — System Architecture

**Status:** ACTIVE — specified and implemented for the foundation milestone
**Scope:** system structure, module boundaries, data flow
**Related:** `AGENTS.md` (workflow and authorization), `docs/00_PROJECT_OVERVIEW.md`
(product identity), `docs/01_PRODUCT_REQUIREMENTS.md` (requirements),
`docs/design-system.md` (visual system), `docs/api.md` (endpoint contracts)

---

## 1. Purpose

This document describes how TaskForge is put together: the processes, the module
boundaries, where authority lives, and how a request flows from the browser to
PostgreSQL and back. It records **what the code actually does**. Where the code
and a requirement disagree, the requirement governs and the divergence is a
defect, not a design choice.

Read `docs/api.md` for the endpoint contracts. Read
`docs/01_PRODUCT_REQUIREMENTS.md` for what the product must do.

## 2. System shape

Two processes plus one database.

```
┌──────────────────────────┐        ┌──────────────────────────┐
│  Browser (React SPA)     │        │  Node (Express API)      │
│                          │        │                          │
│  Views                   │  HTTP  │  Middleware chain        │
│   └─ access/service.ts   │───────▶│   ├ helmet               │
│       └─ data/backend.ts │  /api  │   ├ json body limit      │
│           └─ data/api.ts │        │   ├ cookie-parser        │
│                          │        │   ├ session attach       │
│  Only non-authoritative  │◀───────│   ├ rate limit (auth)    │
│  data: theme preference  │  JSON  │   ├ CSRF (mutations)     │
└──────────────────────────┘        │   └ routes               │
                                    │        └ services          │
                                    │             └ domain      │
                                    │                  └ Store   │
                                    └────────┬─────────────────┘
                                             │ Prisma 7 + pg
                                             ▼
                                    ┌──────────────────────────┐
                                    │  PostgreSQL              │
                                    │  authoritative store     │
                                    └──────────────────────────┘
```

In development Vite proxies `/api` to the API, so the browser talks to a single
same-origin address. That matters: the session is a cookie, and a cookie is only
first-party when the origin matches.

## 3. Technology decisions

| Layer | Choice | Rationale |
|---|---|---|
| UI | React 19 + TypeScript | Component model, strict types across the API boundary |
| Build | Vite 6 | Fast dev server with the `/api` proxy; ESM-first |
| Styling | Tailwind CSS 4 | Tokens map to CSS custom properties; see `docs/design-system.md` |
| API | Express 5 | Small, stable, middleware model that matches the requirement order |
| Language | TypeScript everywhere, `strict` + `exactOptionalPropertyTypes` | A partial patch to a task is a type error, not a silent no-op |
| Database | PostgreSQL | Relational data with real constraints and transactions |
| ORM | Prisma 7.10 (stable) | Typed queries; **note:** `prisma@latest` resolves to an 8.0 release candidate — pin to 7.10 to match `@prisma/client` |
| Driver | `@prisma/adapter-pg` + `pg` | Prisma 7 removed `url` from the datasource block; the runtime connection is an adapter |
| Validation | Zod 4 | One schema per input, parsed before any handler |
| Hashing | `@node-rs/argon2`, argon2id | Memory-hard; prebuilt binaries, no compilation step |
| Tests | Vitest 3, Testing Library | One runner across client and server |

## 4. Module boundaries

### 4.1 Server

```
server/
├── index.ts                 entry: config → store → listen
├── app.ts                   Express assembly; middleware ORDER is the security contract
├── config.ts                env parsing, validated once at startup
├── middleware.ts            actor attach, requireAuth, CSRF, parse()
├── auth/
│   ├── password.ts          argon2id + legacy PBKDF2 verification
│   └── session.ts           token generation, hashing, cookie serialisation
├── domain/
│   ├── records.ts           plain structural types
│   ├── authorize.ts         membership enforcement
│   └── scope.ts             resource-chain resolution
├── repositories/
│   ├── store.ts             the interface every service depends on
│   ├── prisma.ts            PostgreSQL implementation
│   └── memory.ts            in-process implementation (tests only)
├── services/                business rules; no Express types
├── validation/schemas.ts    Zod schemas
├── http/                    error envelope, DTO mappers
├── routes/                  HTTP surface only
└── prisma/schema.prisma     data definition
```

**The rule that shapes this layout:** services depend on the `Store` interface,
not on Prisma. That is why every authorization rule is unit-testable with no
database, and why the Prisma implementation is a thin, boring mapping layer.

### 4.2 Client

```
src/
├── App.tsx                  routing + guard
├── app/                     AppContext, AppProvider (session, workspaces, theme)
├── access/service.ts        validation + error shaping; the only API views may call
├── data/
│   ├── api.ts               fetch wrapper: cookies, CSRF, error envelope, 401 handling
│   ├── backend.ts           Backend interface
│   ├── remoteBackend.ts     production — talks to the API
│   ├── localBackend.ts      TEST ONLY — in-process
│   ├── repository.ts        TEST ONLY — browser-style store
├── domain/types.ts          shared enums and records
├── components/              design-system components
└── views/                   one file per route
```

`views → access/service.ts → data/backend.ts → data/api.ts`. No view imports a
transport. No view imports a repository.

## 5. Authority and trust boundaries

| Concern | Authority | Enforced by |
|---|---|---|
| Authentication | **Server** | Session record; `middleware.attachActor` |
| Authorization | **Server** | `domain/authorize.ts`, `domain/scope.ts` |
| Validation | **Server** | Zod, in `validation/schemas.ts` |
| Password hashing | **Server** | `auth/password.ts` |
| Session lifecycle | **Server** | `auth/session.ts` + `Session` table |
| Authoritative data | **Server** | PostgreSQL |
| Presentation | Client | `docs/design-system.md` |
| Theme preference | **Client** | Deliberately not authoritative; see §9 |

### 5.1 The client is never a security boundary

The client performs no authorization checks and holds no trust. It does not even
know a workspace id until the server tells it. Every value the client could
tamper with is either ignored or re-verified:

- **Identity** comes only from the validated session. No route accepts a user id
  from a body, query, or path.
- **Zod strips unknown keys**, so a forged `userId` or `ownerId` in a request body
  never reaches a handler.
- **Workspace ownership is derived from the actor**, not from the request.
- **Resource chains are resolved before access**: task → project → workspace →
  membership. The membership check happens before the parent row is read.

### 5.2 Request flow

```
POST /api/workspaces/:id/projects
  helmet              → security headers
  json body limit     → reject >256 kB
  attachActor         → cookie → session record → req.actor  (or none)
  requireAuth         → 401 if no actor
  requireCsrf         → header must equal the session's csrfToken
  route               → Zod parse → strip unknown keys
  service             → resolveWorkspaceScope(actor, workspaceId)   ← 403 here
                      → validate
  store               → INSERT ... WHERE workspaceId = ?             ← scoped in SQL
  dto                 → explicit response shape
```

## 6. Data model

`server/prisma/schema.prisma`. Normalized, with foreign keys, unique
constraints, and indexes chosen for the access patterns above.

| Table | Purpose | Notable constraints |
|---|---|---|
| `User` | Identity | `email` unique (lower-cased) |
| `Session` | Server-managed sessions | `tokenHash` unique; indexed on `expiresAt`, `revokedAt` |
| `Workspace` | Ownership container | indexed on `ownerId` |
| `Membership` | **The authorization fact** | composite PK `(userId, workspaceId)` |
| `Project` | Work container | indexed `(workspaceId, state)`; `colourToken` is a token name, never a hex |
| `Task` | Unit of work | indexed `(projectId, stage, createdAt)` for board grouping |
| `Comment` | Task discussion | indexed `(taskId, createdAt)` |
| `Notification` | In-app only | indexed `(userId, createdAt desc)`, `(userId, readAt)` |

Deletes cascade: workspace → project → task → comment. Session and membership
rows cascade from `User`.

### 6.1 Two decisions encoded in the schema

- **`MembershipRole` grants nothing.** The column records ownership because
  `FR-WS-001` requires the creator to become owner. Role-based permissions are
  deferred (resolved **D-03**), so no permission matrix is derived from it.
  Deferring roles does **not** relax membership scoping (`NFR-SEC-010`).
- **No `deletedAt` on Project.** Archiving is a state, not a delete (resolved
  **D-19**). Permanent deletion is excluded from the initial milestone
  (`FR-PRJ-012`), so no soft-delete column and no deletion route exist. There is
  nothing to enable later without a migration.

### 6.2 Concurrent updates resolve last-writer-wins

Concurrent updates to the same task or project resolve **last-writer-wins** at
the PostgreSQL row level: each update is a single atomic `UPDATE`, but nothing
coordinates two updates to the same row, so the later commit silently
overwrites the earlier one. There is no version column, no conflict detection,
and no conflict surfaced to either client. This is acceptable for the initial
milestone — workspaces are single-user-dominated (invitations deferred,
**D-10**) and no requirement mandates conflict handling. **Revisit this
decision when the `FR-RT` feature family leaves Coming Soon**, at which point
`FR-RT-002` will require real conflict resolution and last-writer-wins will no
longer satisfy it.

## 7. Authentication

1. `POST /api/auth/register` — validate, hash with argon2id, create user, issue
   session.
2. The raw session token is returned **only** in a `Set-Cookie` header:
   `HttpOnly`, `SameSite=Lax`, `Secure` unless `COOKIE_SECURE=false`.
3. The server stores `SHA-256(token)`. A database disclosure therefore does not
   yield usable sessions.
4. `GET /api/auth/session` returns the actor and a CSRF token, never the token.
5. `POST /api/auth/sign-out` **revokes the row** and clears the cookie. The old
   token is dead server-side, not merely discarded by the browser.

**Sign-in failure is uniform.** Unknown account and wrong password produce
byte-identical status, code, and message. When the account is unknown a decoy
hash is verified so response time does not reveal existence.

**CSRF** uses the synchronizer-token pattern: the token lives on the session row,
is delivered once via `/api/auth/session`, and must be echoed in
`X-CSRF-Token` on every non-safe method. It is never written to a readable
cookie, so a cross-site page cannot obtain it.

**Rate limiting** is a fixed window on the credential endpoints only, keyed by
client IP, counting **failures only** — a correct user is never locked out.

## 8. Data flow: legacy migration

A one-time import from the Phase 0 browser-only build, at
`POST /api/migrate/legacy`. It is the only endpoint that accepts
client-asserted data, so its threat model is documented explicitly in
`server/services/migrate.service.ts`. Summary:

1. The supplied password is verified against the supplied hash by **recomputing**
   PBKDF2. The hash is never trusted, so an attacker cannot claim an account.
2. Membership claims are **not accepted at all** — no such field exists in the
   schema. The server creates exactly one `OWNER` membership per imported
   workspace, for the verified importer.
3. A workspace is imported only if its claimed owner is the importing address;
   anything else is rejected and **reported**, never silently dropped.
4. Legacy ids are hints: preserved when free, remapped on collision, with every
   child reference rewritten.
5. The whole import runs in one transaction.
6. Re-running against a known address changes nothing and reports
   `alreadyMigrated`.

A successful import stores the legacy PBKDF2 record; the **first successful
sign-in re-hashes it with argon2id** in place, so the legacy path self-destructs.

**Known limitation:** all pre-migration data lives only in the user's own
browser. There is no server copy. Clearing storage, or never opening the app
again, means the data is unrecoverable. No engineering removes that; only
announcing it before it happens does.

## 9. Why the theme stays on the client

Theme is presentation, not application data (`FR-THEME-006`: switching changes
presentation only). Persisting it server-side would mean a cookie read or an
extra round trip for a value with no cross-device requirement and no security
consequence. It is stored under `taskforge.theme` and never sent to the API.

## 10. Environments

All configuration is read once in `config.ts` and validated. A misconfigured
deployment fails at startup rather than on the first request. Values are never
echoed in an error — only field names and reasons.

See `.env.example` for the full list. `DATABASE_URL` is the only required value;
there is no in-memory fallback and the API refuses to start without it.

## 11. Local development

```bash
cp .env.example .env          # then fill in DATABASE_URL and TEST_DATABASE_URL
npm install
npm run prisma:migrate        # apply migrations to the application database
npm run dev:api               # terminal 1 — Express on :4000
npm run dev                   # terminal 2 — Vite on :5173, proxying /api
```

### 11.1 One API watcher, not several

Run `npm run dev:api` **once**. It wraps `tsx watch server/index.ts` in
`scripts/dev-api.ts`, which refuses to start if the port is already served and
names the problem instead of exiting on a bare `EADDRINUSE`.

This matters because several redundant watchers produce an intermittent
`ECONNREFUSED` on port 4000 that reads as a crashing backend. Only one process
owns the port; each watcher independently restarts its own child on every file
save, so between killing the old child and the new one binding, nothing is
listening and the Vite proxy reports a refused connection.

The launcher **never kills anything**. Terminating a process you may be using is
not its decision to make; it prints how to find the running watchers and leaves
the choice to you. It also surfaces a watcher's non-zero exit rather than
returning to the prompt as though it had shut down cleanly.

If you have already accumulated watchers, stop them from their own terminals. To
list them:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object CommandLine -match 'server/index.ts'
```

## 12. Testing strategy

| Suite | Command | Needs PostgreSQL |
|---|---|---|
| Unit + HTTP contract | `npm run test:server` | No |
| Client | `npm run test:client` | No |
| Database integration | `npm run test:db` | **Yes** |
| Everything | `npm run verify` | No (db suite self-skips) |

The HTTP contract tests drive the **real Express app over a real socket** with a
cookie-jar client. Only the data layer is substituted, so middleware order,
status codes, cookie flags and CSRF are exercised as shipped.

The database suite is destructive: it empties every table between tests. **It runs
against a separate, disposable database and never against the application
database.** This is not a convention — the target is verified with the server
before anything is deleted.

| Database | Contents | Who writes to it |
|---|---|---|
| `taskforge` | real accounts and workspaces | `DATABASE_URL` (`taskforge_app`) |
| `taskforge_test` | test rows only, emptied every run | `TEST_DATABASE_URL` (`taskforge_migrate`) |

They are separate databases rather than separate schemas precisely so the test
database can be dropped and recreated freely without touching application data.

```
npm run test:db
```

`scripts/run-db-tests.ts` reads `.env` itself, migrates `taskforge_test`, and
runs the suite there. No credential is ever typed, echoed or passed on a command
line.

### 12.1 Why the target is verified, not assumed

`TEST_DATABASE_URL` is **not** treated as proof that a target is safe. A stale
`.env`, a typo, or a copied shell export could point the suite at the
application database, and the suite's `cleanAll` empties every table.

So before any test runs, `scripts/run-db-tests.ts` opens a connection and asks
PostgreSQL what it actually is — `current_database()`, `inet_server_addr()`,
`current_user` — and hands those facts to `assertDisposableDatabase` in
`server/testing/dbSafety.ts`. Three independent conditions must all hold:

1. The connected database name ends in `_test`. `taskforge` cannot match, so no
   configuration mistake alone can make the application database a target.
2. It is not the application database named by `DATABASE_URL`.
3. The server is on loopback, so a remote database can never be wiped.

Anything unverifiable is a **refusal**, never a warning and never a skip: a
suite that skips while reporting green is worse than one that refuses to start.
`NODE_ENV=production` is rejected outright for the same reason.

The integration file re-validates independently of the runner — the suite does
not trust the wrapper that launched it. Its guard runs at module scope with
`await`, so it completes before either `describe` block can reach a destructive
hook, and it also requires `TASKFORGE_DB_TEST_TARGET` to equal the name the
**server** reported.

`server/testing/dbSafety.test.ts` covers these rules as pure functions, with no
database required. Note `inet_server_addr()` reports CIDR form (`127.0.0.1/32`),
which the guard strips before matching.

A green `npm run verify` does **not** mean the database layer is verified: the
suite self-skips there and prints a warning naming `npm run test:db`.

### 12.2 Local PostgreSQL

PostgreSQL 17.11, installed under `D:\The Arsenal\PostgreSQL` with binaries in
`Applications\` and the cluster in `Data\`.

`.env` supplies both credentials and `server/index.ts` loads it through Node's
built-in `process.loadEnvFile` — no `dotenv` dependency. Two properties are
deliberate: an existing environment variable is **never** overridden, so a real
deployment's injected configuration always wins, and a missing `.env` is not an
error, so production starts from the environment alone.

`listen_addresses = 'localhost'`. Every connection this project makes is to
`127.0.0.1`, and `pg_hba.conf` permits only loopback, so binding all interfaces
served no purpose. Narrowing it means a database on a laptop is not reachable at
all on an untrusted network.

| Role | Purpose | Superuser | CreateDB | Schema `CREATE` | Table rights |
|---|---|---|---|---|---|
| `taskforge_app` | runtime | no | no | **no** | `SELECT`, `INSERT`, `UPDATE` |
| `taskforge_migrate` | Prisma CLI | no | yes | yes (owner) | all |

`DELETE` and `TRUNCATE` are withheld from the runtime role on purpose: the
`Store` interface exposes no delete at all, because permanent deletion is excluded
from this milestone (`FR-PRJ-012`). Object ownership is a second, independent
barrier — the runtime role cannot alter a table even if a grant were misconfigured.

The database suite needs `DELETE`, so it connects as `taskforge_migrate` — but
against `taskforge_test`, so the privilege is never exercised on application
data.

### 12.3 Credential rate limiting

`server/http/authRateLimit.ts` limits `/auth/sign-in` and `/auth/register`. What
it guarantees, precisely:

- **Only failures consume the allowance.** A successful authentication is not
  counted, so getting it right never moves a caller closer to being locked out.
- **Failures remain limited.** After `AUTH_RATE_LIMIT` failures for a key, that
  key is refused with `429 rate_limited` for the rest of the window.

Two things it does **not** do, which are easy to assume and are documented in the
module because assuming otherwise would be a security-relevant error:

1. **A success does not clear earlier failures.** The count is a running total of
   failures in the window; a later success neither adds to it nor resets it.
2. **An exhausted key is refused even when the credentials are correct.** This
   cannot be otherwise — the server cannot know a password is right without
   verifying it, and verifying unlimited guesses is the attack the limit exists to
   prevent. "A correct sign-in never *consumes* the allowance" is the honest
   claim; "a correct sign-in is never *refused*" is not, and cannot be made true
   without removing the limit.

The key is the client IP **and** the normalised email. Keyed on IP alone, one
attacker targeting one account would exhaust the bucket for every legitimate user
behind that address — which in local development means everyone, since the Vite
proxy makes all browser traffic arrive from `127.0.0.1`. Keyed on email alone, an
attacker could rotate addresses to spray many accounts, so the IP component is
retained. Email case and whitespace are normalised so they cannot multiply
buckets, and a request with no usable email falls back to the IP alone rather
than minting a fresh key.

`server/__tests__/authRateLimit.test.ts` pins all of the above over real HTTP,
including the two limitations, so the guarantee cannot be quietly overstated.

### 12.4 Dependency audit

Production dependencies are audited with `npm run audit`
(`npm audit --omit=dev`), which reports known vulnerabilities in the
dependencies that ship, excluding dev-only tooling.

- **Manual step.** There is no CI pipeline and none is claimed: a human runs
  the command, reads the report, and acts on it.
- **When.** At each security workstream milestone, before any production
  deployment, and whenever a production dependency is added or upgraded.
- **On findings.** Assess the reported advisories against the project's actual
  use; fix (upgrade or replace the dependency) or record the decision and its
  reason. An unreviewed report is not a completed audit.

### 12.5 Prisma audit decision (WS03) — keep 7.10.0

`npm run audit` reports 4 high-severity findings, all inside the `prisma`
CLI toolchain: `deepmerge-ts@7.1.5` (via `@prisma/config@7.10.0`) and
`mysql2@3.15.3` (direct CLI dependency, exact pins — no patched release fits
without an upstream Prisma release). Decision: **keep Prisma 7.10.0; do not
downgrade to 6.x; do not run `npm audit fix --force`.**

- **Why accepted as residual risk.** Both packages are CLI/config tooling,
  never loaded by the serving runtime (`PrismaPg` + `pg` against PostgreSQL;
  `@prisma/client`'s only runtime dependency is
  `@prisma/client-runtime-utils`). `mysql2` executes solely on the CLI's MySQL
  dialect branch, which a `provider = "postgresql"` project never takes; both
  mysql2 advisories require live MySQL traffic that does not exist here.
  `deepmerge-ts` merges only the committed local config, so its recursive-graph
  exhaustion has no remote trigger.
- **Why not 6.19.3.** A major downgrade would require moving `prisma`,
  `@prisma/client`, and `@prisma/adapter-pg` together, removing the
  Prisma-7-only `prisma.config.ts`, rewriting the schema datasource block, and
  regenerating the client — certain breakage in exchange for an older major,
  to silence findings that cannot reach the application.
- **Reassessment.** Re-run the audit at each milestone and upgrade to a fixed
  Prisma stable (7.x patch or 8.x final) when upstream ships one.


## 13. Known gaps and follow-up

| Item | State | Follow-up |
|---|---|---|
| Database integration suite | **Written, never run** | Needs PostgreSQL |
| WCAG 2.2 AA contrast (text) | **Re-measured passing** after WS04 token adjustments: muted text, focus ring, and primary-button label/fills now meet 4.5:1 (text) / 3:1 (non-text) in both themes, verified by computation against the token values | D-18 conformance-level claim still open; dark-theme shadow validation still pending |
| Frontend for projects/tasks/comments/search/dashboard | **Built** and browser-verified against the live API | — |
| `FR-AUTH-008` display-name editing | **Built** and browser-verified | — |
| `FR-AUTH-008` avatar | **Deferred.** No schema column, no upload transport, `design-system` 10.4 is Proposed. Initials-only avatar renders; the profile view states this honestly rather than offering a control that cannot work | Needs a storage and presentation decision before it can be built |
| Workspace-level dashboard (`FR-DASH-002`) | **Not built.** Only the project-level summary exists | Needs the **D-05** metric set resolved first |
| Multi-member assignment (`FR-TASK-007` beyond one member) | Candidate list is the owner plus Unassigned, because invitations are Coming Soon (**D-10**) | Unblocks automatically when invitations ship |
| `docs/testing.md` | Does not exist | Needed for a real performance budget |
| Two-workspace ceiling | Enforced server-side, not recorded in an ACTIVE document | Needs a product decision record |
| Rate limiter in a multi-instance deployment | In-process | Move to a shared store before horizontal scaling |
