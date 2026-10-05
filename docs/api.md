# TaskForge — API Contracts

**Status:** ACTIVE — implemented for the foundation milestone
**Scope:** endpoint contracts, schemas, error formats
**Related:** `docs/architecture.md` (system structure),
`docs/01_PRODUCT_REQUIREMENTS.md` (requirements these satisfy)

---

## 1. Conventions

- Base path `/api`. The client calls same-origin `/api`; in development Vite
  proxies it to the Express server.
- Requests and responses are `application/json`, except `204 No Content`.
- **Authentication is a cookie.** The session is an opaque token in an
  `HttpOnly; SameSite=Lax; Secure` cookie named `taskforge_session`
  (configurable).
- **CSRF:** every non-`GET`/`HEAD`/`OPTIONS` request must send the session's CSRF
  token in `X-CSRF-Token`. Obtain it from `GET /api/auth/session`. It is never
  written to a readable cookie.
- **No identifier is trusted from the client.** There is no endpoint parameter or
  body field that selects the acting user.
- Timestamps are ISO-8601 UTC strings. Dates are `YYYY-MM-DD` where a date is
  meant.

## 2. Error format

Every failure uses one envelope. No route returns a raw framework or database
error.

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Enter an email address in the format name@example.com.",
    "fieldErrors": { "email": "Enter an email address in the format name@example.com." }
  }
}
```

`fieldErrors` appears **only** when a message belongs to a specific control. A
message is never rendered both as a form banner and under a field.

| Code | Status | Meaning |
|---|---|---|
| `validation_failed` | 400 / 422 | Malformed body, or a field failed validation |
| `unauthenticated` | 401 | No valid session |
| `forbidden` | 403 | Authenticated but not permitted |
| `invalid_csrf` | 403 | CSRF token missing or wrong |
| `not_found` | 404 | No such route, or no such resource within your scope |
| `conflict` | 409 | Already exists (e.g. duplicate email) |
| `limit_reached` | 422 | A product limit is reached (e.g. workspace ceiling) |
| `rate_limited` | 429 | Too many failed attempts |
| `internal_error` | 500 | Unexpected fault; detail is logged, never returned |

### 2.1 Information disclosure

- **Sign-in failures are uniform.** Unknown account and wrong password return
  byte-identical responses.
- **Absent and not-yours are indistinguishable.** A resource you do not own and a
  resource that does not exist both return `403` with the same wording. The API
  cannot be used to enumerate ids.
- **Unknown endpoints return `401` when unauthenticated**, and `404` once
  authenticated. A `404` for an anonymous caller would reveal which routes exist.
- Unexpected errors are logged server-side; the client receives a generic message.

## 3. Authentication

### `POST /api/auth/register` → `201`

```json
{ "email": "ada@example.com", "password": "a-good-password", "displayName": "Ada Lovelace" }
```

```json
{ "user": { "id": "…", "email": "…", "displayName": "…" }, "csrfToken": "…" }
```

Sets the session cookie. `409` if the address is already registered, with the
error on `email`.

### `POST /api/auth/sign-in` → `200`

Same body shape, minus `displayName`. Same response. Sets the session cookie.
`401` on failure, message identical to an unknown account.

### `GET /api/auth/session` → `200`

```json
{ "user": { "id": "…", "email": "…", "displayName": "…" }, "csrfToken": "…", "expiresAt": "…" }
```

Returns `user: null` with `200` when signed out — deliberately not `401` — so the
client can distinguish "signed out" from "server unreachable" on boot.

### `POST /api/auth/sign-out` → `204`

Requires a session and CSRF. Revokes the session **server-side** and clears the
cookie. The old token is dead, not merely discarded.

### `PATCH /api/auth/profile` → `200`

```json
{ "user": { "id": "…", "email": "…", "displayName": "…" } }
```

Updates the **caller's own** display name (`FR-AUTH-008`). Requires a session and
CSRF. The user is derived from the session; the body carries no identifier, so
one caller cannot edit another's profile. `displayName` is trimmed, 1–80
characters.

> **Display name only — there is no avatar field.** No avatar column exists in the
> schema, no upload transport is defined, and `design-system` 10.4 marks the avatar
> specification Proposed. An `avatar` key in the body is stripped like any other
> unknown key, not stored.

Unknown keys are stripped, not rejected, matching every other body schema here.
A body naming `userId` is therefore ignored rather than honoured.

### `POST /api/migrate/legacy` → `200`

One-time import from the browser-only build. Unauthenticated by necessity:
ownership is proven by verifying the supplied password against the supplied
hash. See `docs/architecture.md` §8.

**There is no `memberships` field, by design.** The server creates exactly one
`OWNER` membership per imported workspace for the verified importer.

```json
{
  "report": {
    "alreadyMigrated": false,
    "userId": "…",
    "counts": { "workspacesCreated": 1, "projectsCreated": 2, "tasksCreated": 7, "commentsCreated": 0 },
    "rejected": [{ "kind": "workspace", "legacyId": "…", "reason": "not owned by the importing account" }],
    "remapped": [{ "kind": "project", "legacyId": "…", "newId": "…" }]
  }
}
```

Nothing is discarded silently: every rejected row appears in `rejected` with a
reason. Re-running returns `alreadyMigrated: true` and writes nothing.

## 4. Workspaces

### `GET /api/workspaces` → `200`

```json
{ "workspaces": [{ "id": "…", "name": "…", "ownerId": "…", "createdAt": "…" }],
  "owned": 1, "limit": 2 }
```

Only workspaces the caller belongs to, filtered in SQL.

### `POST /api/workspaces` → `201`

```json
{ "name": "Acme Product Team" }
```

The caller becomes owner. `422 limit_reached` when the caller already owns
`limit` workspaces.

> **No membership routes exist.** No invite, no add-member, no join. Invitations
> are a Coming Soon decision (resolved **D-10**). Exposing such a route would let
> any client grant itself access to any workspace id.

## 5. Projects

All routes verify workspace membership before reading or writing.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/workspaces/:workspaceId/projects?state=ACTIVE\|ARCHIVED` | Scoped in SQL |
| `POST` | `/api/workspaces/:workspaceId/projects` | `201` |
| `GET` | `/api/projects/:projectId` | |
| `PATCH` | `/api/projects/:projectId` | Partial |
| `POST` | `/api/projects/:projectId/archive` | Reversible |
| `POST` | `/api/projects/:projectId/restore` | |

`colourToken` is a **design-system token name** (`brand-600`, `accent-500`, …),
never a hex value, so the palette stays owned by `docs/design-system.md`.

> **There is no `DELETE /api/projects/:id`.** Permanent deletion is excluded from
> the initial milestone (`FR-PRJ-012`), so no control exists to invoke — not
> disabled, not "Coming Soon", simply absent.

## 6. Tasks

| Method | Path |
|---|---|
| `GET` | `/api/projects/:projectId/tasks` |
| `POST` | `/api/projects/:projectId/tasks` |
| `PATCH` | `/api/tasks/:taskId` |

`stage` is fixed and not user-extensible: `BACKLOG`, `IN_PROGRESS`, `IN_REVIEW`,
`DONE` (resolved **D-09**). `priority` is `HIGH`, `MEDIUM`, `LOW`, `NONE`.
Tasks are returned newest-first; there is no reordering (resolved **D-09**).

An `assigneeId` must belong to the same workspace, otherwise the task could
reference a user with no access to the data it describes.

## 7. Comments

| Method | Path |
|---|---|
| `GET` | `/api/tasks/:taskId/comments` |
| `POST` | `/api/tasks/:taskId/comments` |

The author is taken from the session. Comment deletion and retention are an open
decision (**D-12**), so no delete route exists yet.

## 8. Search and dashboard

### `GET /api/projects/:projectId/search?q=…` → `200`

```json
{ "query": "deploy", "count": 2,
  "results": [{ "task": { … }, "matchedIn": "title" }] }
```

Scoped to the **current project only**, matching title and description,
case-insensitive and partial (resolved **D-13**). `matchedIn` is `title`,
`description`, or `both`, so the UI can indicate match location. There is no
cross-project search and no advanced search — advanced search is a Coming Soon
surface.

### `GET /api/projects/:projectId/dashboard` → `200`

```json
{ "dashboard": { "projectId": "…", "projectName": "…", "totalTasks": 12,
  "byStage": [{ "stage": "BACKLOG", "label": "Backlog", "count": 4 }],
  "dueSoon": 2, "overdue": 1, "isEmpty": false } }
```

Derived from actual rows, never estimated (`NFR-DATA-003`). `isEmpty` distinguishes
"no tasks" from "zero on a metric" (`NFR-STATE-006`).

## 9. Notifications

In-app only. Delivery beyond the app is an open decision (**D-04**).

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/notifications?limit=50` | `limit` 1–100. Returns `{ notifications, unread }` |
| `POST` | `/api/notifications/:id/read` | Scoped by user; a foreign id is simply absent |
| `POST` | `/api/notifications/read-all` | `204` |

## 10. Operational

### `GET /api/health` → `200`

`{ "status": "ok" }`. Does not touch the database.

## 11. Endpoint inventory

| # | Method | Path |
|---|---|---|
| 1 | GET | `/api/health` |
| 2 | POST | `/api/auth/register` |
| 3 | POST | `/api/auth/sign-in` |
| 4 | GET | `/api/auth/session` |
| 5 | POST | `/api/auth/sign-out` |
| 6 | PATCH | `/api/auth/profile` |
| 7 | POST | `/api/migrate/legacy` |
| 8 | GET | `/api/workspaces` |
| 9 | POST | `/api/workspaces` |
| 10 | GET | `/api/workspaces/:workspaceId/projects` |
| 11 | POST | `/api/workspaces/:workspaceId/projects` |
| 12 | GET | `/api/projects/:projectId` |
| 13 | PATCH | `/api/projects/:projectId` |
| 14 | POST | `/api/projects/:projectId/archive` |
| 15 | POST | `/api/projects/:projectId/restore` |
| 16 | GET | `/api/projects/:projectId/tasks` |
| 17 | POST | `/api/projects/:projectId/tasks` |
| 18 | PATCH | `/api/tasks/:taskId` |
| 19 | GET | `/api/tasks/:taskId/comments` |
| 20 | POST | `/api/tasks/:taskId/comments` |
| 21 | GET | `/api/projects/:projectId/search` |
| 22 | GET | `/api/projects/:projectId/dashboard` |
| 23 | GET | `/api/notifications` |
| 24 | POST | `/api/notifications/:id/read` |
| 25 | POST | `/api/notifications/read-all` |

Rate-limited (failures only): 2, 3, 7.

## 12. Not implemented — deliberately

Absent by decision, not oversight:

- Workspace invitations / join — Coming Soon (**D-10**)
- Roles and permissions — deferred (**D-03**); `MembershipRole` grants nothing
- Permanent deletion of anything (**FR-PRJ-012**)
- Comment deletion and retention — open (**D-12**)
- Undo — deferred (**D-14**)
- Real-time collaboration (**D-16**), automation (**D-04**), timeline (**D-07**)
- External integrations (**D-17**), exports and retention (**D-08**)
- Notification delivery beyond the app (**D-04**)
- Advanced / cross-project search (**D-13** resolved to current-project only)
- Avatar upload and storage — no column, no transport; `design-system` 10.4 is
  Proposed. Display-name editing is implemented; avatar is deferred.
- A **workspace-level** dashboard. `GET /api/projects/:projectId/dashboard` is the
  project-level summary (`FR-DASH-001`, `AC-DASH-02`). `FR-DASH-002` describes a
  workspace dashboard aggregating non-archived projects across a workspace, and no
  such endpoint or view exists yet. The metric set for it remains open (**D-05**).
