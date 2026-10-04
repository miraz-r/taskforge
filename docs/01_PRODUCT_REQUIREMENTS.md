# 01 — TaskForge Product Requirements

> **Status:** ACTIVE
> **Role in the documentation set:** Product requirements — user journeys, functional and
> non-functional requirements, delivery states, priorities, dependencies, and acceptance
> criteria.
> **Master instruction file:** `AGENTS.md` — governs all work, including this document.
> **Product authority:** `docs/00_PROJECT_OVERVIEW.md` — governs product identity, scope, and
> the confirmed product decisions this document implements.

---

## 1. Document Purpose and Authority

### 1.1 Purpose

This document defines **what TaskForge must do** in product terms: the problems it addresses,
the journeys users take, the behavior of each feature, the state of each feature at the initial
milestone, the order of implementation, and the criteria by which the initial implementation
is judged acceptable.

It answers "what" and "for whom". It does not answer "how".

### 1.2 Authority and relationships

| Document | Owns | Relationship to this document |
|---|---|---|
| `AGENTS.md` | Workflow, scope, safety, authorization, verification, reporting | **Master.** Takes precedence on every matter it covers, including this document. |
| `docs/00_PROJECT_OVERVIEW.md` | Product identity, concept, scope, delivery-state definitions, success criteria | **Upstream product authority.** This document implements its decisions and may not contradict them. |
| `docs/01_PRODUCT_REQUIREMENTS.md` | Journeys, functional and non-functional requirements, delivery states, priorities, acceptance criteria | This document. |

This document is subordinate to `AGENTS.md` and to `docs/00_PROJECT_OVERVIEW.md`. It does not
modify, relax, or reinterpret either. Where it appears to conflict with either, that is a defect
to report (`AGENTS.md` §9.4), not a licence to decide unilaterally.

### 1.3 Confirmed decisions implemented by this document

These are **confirmed** (source: `docs/00_PROJECT_OVERVIEW.md`) and are not reopened here:

| Ref | Confirmed decision |
|---|---|
| **D-01** | All ten product areas remain in intended product scope; nothing is permanently excluded. |
| **D-01** | Initial implementation target is a working application within a **3-day development window** — a target, not a guarantee of production readiness. |
| **D-01** | Advanced functionality may use **Coming Soon** states; deferral is not removal. |
| **D-01** | No feature may be represented as functional unless it is implemented and verified. |

### 1.4 How to read this document

| Convention | Meaning |
|---|---|
| **Confirmed** | Settled by a prior authoritative document. Not reopened here. |
| **Proposed** | A workable approach proposed by this document, still open to change. Marked explicitly. |
| **`OPEN DECISION`** | Unresolved. Recorded in §11 with its impact and what must be settled. |
| **J-nn** | User journey (§4). |
| **FR-AREA-nnn** | Functional requirement (§5). |
| **NFR-AREA-nnn** | Non-functional requirement (§8). |
| **D-nn** | Open decision (§11), carried from the overview unless marked *new here*. |

A requirement marked **Proposed** is not a confirmed product decision. A requirement whose
implementation depends on an `OPEN DECISION` is identified as **Blocked by D-nn**.

**Nothing in this document is implemented.** No application code exists. Every delivery state
below is a *target*, not a report of existing behavior.

---

## 2. Product Goals

### 2.1 Principal user problems

| # | Problem | Current friction |
|---|---|---|
| **G-1** | Project status is not visible at a glance | Status is reconstructed from scattered conversations, documents, and memory |
| **G-2** | Work is not organized consistently | Ad-hoc lists and spreadsheets fragment effort across tools |
| **G-3** | Ownership and deadlines are ambiguous | It is unclear who owns what, and by when |
| **G-4** | Context for a task is scattered | Task detail, discussion, and history live in separate places |
| **G-5** | Team awareness lags behind work | Members learn about changes late, or not at all |
| **G-6** | Progress is reported by assertion | No shared, accurate view of what is done and what is blocked |

### 2.2 Intended user outcomes

1. A user opens the product and understands the state of a project without asking anyone (**G-1**).
2. A user creates, organizes, updates, and completes work through a single coherent flow (**G-2**).
3. A user can see who owns a task and when it is due, at a glance (**G-3**).
4. A user opens any task and finds its detail, discussion, and history in one place (**G-4**).
5. A team member stays aware of changes to work they care about (**G-5**).
6. Progress is derived from the work itself rather than reported separately (**G-6**).

### 2.3 Non-goals

TaskForge is not an all-purpose collaboration suite (`docs/00_PROJECT_OVERVIEW.md` §2). It is
not a document editor, chat client, or file store. Where a need falls outside project and task
management, this document does not specify it.

---

## 3. User Types and Roles

### 3.1 Anticipated user types

| Type | Description |
|---|---|
| **Individual user** | A person managing personal projects, possibly working alone |
| **Workspace owner** | The person who created a workspace and holds primary authority over it |
| **Workspace administrator** | A person granted administrative authority within a workspace |
| **Team member** | A participant who creates, updates, and comments on work |

These types are **anticipated**, not finalized. Their existence is consistent with the confirmed
audiences in `docs/00_PROJECT_OVERVIEW.md` §3.

### 3.2 Permission behavior for the initial milestone

**Role-based permissions are deferred for the initial milestone** (resolved **D-03**). This
document defines role *concepts* for journeys and requirement descriptions; it does not define
role *permissions*, and it does not claim role-based enforcement.

**Three distinct notions are separated here and must not be conflated:**

| Notion | Meaning | Status at the initial milestone |
|---|---|---|
| **Workspace membership scoping** | Whether an actor belongs to the workspace holding the resource | **Required and enforced.** Every read and every write is checked. Not deferred. |
| **UI presentation** | Whether a control is shown, hidden, or disabled | Presentation only. **Hiding or disabling a control is not enforcement and does not satisfy any security requirement.** |
| **Role authorization** | Whether an actor's role permits a specific operation | **Deferred** (resolved **D-03**) |

**Confirmed for the initial milestone:**

- A workspace has exactly one **owner** at creation.
- All members otherwise have equivalent capability; no role distinction is enforced.
- Role administration surfaces are **Coming Soon** (§5.13).
- Role-based enforcement is **not claimed** (`NFR-SEC-008`).
- **Workspace membership scoping remains mandatory** and is independent of roles
  (`FR-WS-004`, `NFR-SEC-002`, `NFR-SEC-010`).

**Reopen condition.** This decision is valid only while invitations remain deferred and a
workspace cannot contain a second member. **D-03 must be reopened before invitations or
multi-member collaboration are implemented.** If a second member can exist, membership scoping is
no longer sufficient and role authorization becomes necessary.

---

## 4. Core User Journeys

Each journey states its purpose, main steps, expected outcome, and failure or empty states.
Journeys describe required behavior, not implemented behavior.

### J-01 — Registration and sign-in

**Purpose.** A new user gains access; a returning user returns to their work.

**Main steps.**
1. A user opens the sign-in view.
2. A new user selects registration and provides required account details.
3. The user submits; the application validates the input.
4. On success, the user is signed in. An account with **zero workspaces** is shown the empty
   workspace state (`FR-WS-005`, resolved D-11). An account with one or more workspaces is shown
   the workspace context.
5. A returning user enters their credentials, is signed in, and follows the same routing as
   step 4.

**Expected outcome.** An authenticated session with a route to the user's workspace context.

**Failure and empty states.**
- Invalid input is rejected with a specific, actionable message naming the field (`FR-AUTH-004`).
- Invalid credentials are rejected without revealing whether the account exists.
- A submit action that fails shows an error and preserves entered input (`FR-AUTH-005`).
- An account with zero workspaces shows the empty workspace state. **Create a workspace** is
  available; **Join a workspace** is shown as visibly unavailable and non-interactive because
  workspace invitations are deferred for the initial milestone (resolved **D-10**, `FR-WS-005`).
  No skip option is offered, and this route is reachable from registration **and** from a later
  sign-in.

### J-02 — Creating or joining a workspace

**Purpose.** A user establishes a shared context in which work can be organized.

**Main steps.**
1. From the empty workspace state — reached on registration **or** on a later sign-in — the user
   chooses to create a workspace.
2. The user provides a workspace name.
3. The workspace is created, and the creating user becomes its **owner**.
4. The user is taken into the new workspace, which initially contains no projects.

**Expected outcome.** A workspace the user belongs to, with an empty project state.

**Failure and empty states.**
- A workspace with no name, or an invalid name, is rejected with a field-level message.
- A workspace with no projects shows an empty state with a route to create the first project
  (`FR-PRJ-005`).
- Inviting others to join is **deferred for the initial milestone** and is represented as
  **Coming Soon** (resolved **D-10**, `FR-WS-003`). This journey therefore completes through
  **Create a workspace**; the join action is not part of it.
- A user may create a second workspace and switch between the two. Switching is **Working** and is
  independent of invitations (`FR-WS-006`, `AC-WS-08`).

### J-03 — Creating a project

**Purpose.** Work is organized into a named container with its own lifecycle.

**Main steps.**
1. From the workspace, the user selects create project.
2. The user provides a project name and, optionally, a description and color.
3. The project is created and appears in the workspace project list.
4. The user enters the project, which contains no tasks.

**Expected outcome.** An accessible project whose empty state invites task creation.

**Failure and empty states.**
- A project with no name, or a duplicate name within the same workspace, is rejected with a
  message naming the conflict (`FR-PRJ-004`).
- A project with no tasks shows an empty board state (`FR-KAN-005`).
- A project the user cannot access is not shown in their list (`FR-WS-004`). *This is workspace
  membership scoping, not a role restriction: it is required and enforceable now, and does not
  depend on D-03.*
- Archiving a project requires confirmation; declining leaves it active and unchanged
  (`AC-PRJ-08`). The project currently being viewed cannot be archived, and the user is told to
  navigate away first (`AC-PRJ-12`).
- An archived project leaves the active list and the dashboard but keeps every task, comment, and
  history entry, and can be restored from the Archived view (`AC-PRJ-09`, `AC-PRJ-10`,
  `AC-PRJ-11`). Its tasks fall outside the current-project search scope (`FR-SEARCH-007`).
- No permanent-deletion control is offered for a project (`AC-PRJ-14`).

### J-04 — Creating and managing tasks

**Purpose.** Work is captured as discrete, trackable units.

**Main steps.**
1. Within a project, the user initiates task creation from the board or list view.
2. The user provides a title, and optionally a description, assignee, priority, and due date.
3. The task is created in the **Backlog** stage with **No priority** and no assignee, and appears
   in the board and list views (resolved D-09).
4. The user edits any task property later from the task detail drawer.
5. The user deletes a task when it is no longer relevant.

**Expected outcome.** A task visible in both the board and the list, with consistent properties.

**Failure and empty states.**
- A task with no title is rejected; the create control remains available and input is preserved
  (`FR-TASK-004`).
- A create or edit that fails surfaces an error and does not present the task as saved
  (`FR-TASK-005`).
- Deleting a task requires confirmation, and the outcome is stated plainly (`FR-TASK-006`).
- Undo of a destructive task action is **not** claimed at the initial milestone and is recorded
  as follow-up (§11, **D-14**).

### J-05 — Assigning tasks to team members

**Purpose.** Responsibility for work is explicit.

**Main steps.**
1. The user selects a task and opens the detail drawer.
2. The user opens the assignee control.
3. The user selects a member of the workspace.
4. The task shows the assignee; an unassigned task shows an explicit unassigned state.

**Expected outcome.** The task displays its assignee wherever the task is rendered.

**Failure and empty states.**
- The assignee list is limited to workspace members (`FR-TASK-007`, dependency `FR-WS-002`).
- A workspace with no other members shows only the current user, with an unassigned state
  remaining available (`FR-TASK-008`).
- Assignment depends on workspace membership, which is required and exercisable. *Who may
  assign — an owner assigning for others — is role authorization and is deferred (resolved D-03).
  At the initial milestone every member may assign to any workspace member.*
- Clearing an assignee returns the task to the unassigned state and is not an error.

### J-06 — Moving tasks through Kanban stages

**Purpose.** Work state changes are visible and immediate.

**Main steps.**
1. The user drags a task card from one stage column to another.
2. The card moves to the target position in the target column.
3. The task's stage is updated, and the change is reflected in the list view and progress
   indicators.
4. A stage change is recorded in the task's activity history.

**Expected outcome.** The task's stage reflects the user's action everywhere it appears.

**Failure and empty states.**
- A drag that cannot complete returns the card to its origin with no state change
  (`FR-KAN-004`).
- A drop into an invalid target is rejected with feedback (`FR-KAN-004`).
- An empty stage column shows an explicit empty state, not a blank gap (`FR-KAN-005`).
- Stages are the fixed system-wide set **Backlog → In Progress → In Review → Done**, with **Done**
  as the only terminal stage; a task is reopened by moving it out of **Done** (resolved D-09).
- No project defines its own stages, and no column may be added, renamed, reordered, or removed at
  the initial milestone.

### J-07 — Using the list view

**Purpose.** The same work is inspected as a sortable, filterable table.

**Main steps.**
1. The user switches from the board to the list view.
2. The list shows every task in the current project.
3. The user sorts by a task property.
4. The user opens a task from the list.

**Expected outcome.** A complete, correctly ordered representation of the project's tasks.

**Failure and empty states.**
- A project with no tasks shows an explicit empty state in the list view (`FR-LIST-004`).
- A sort that cannot be applied leaves the previous order intact with no silent change
  (`FR-LIST-005`).
- The view switch preserves the current project and filter context (`FR-LIST-006`).

### J-08 — Viewing task details and comments

**Purpose.** Full context for one task is available in one place.

**Main steps.**
1. The user selects a task from the board or list.
2. The detail drawer opens, showing the task's properties and description.
3. The user reads the existing comments.
4. The user writes and submits a comment.
5. The comment appears in the task's history.

**Expected outcome.** The complete task context without leaving the current view.

**Failure and empty states.**
- A task with no comments shows an explicit empty state for comments (`FR-DRAWER-005`).
- An empty comment is not submitted (`FR-CMT-004`).
- A comment submission that fails shows an error, preserves the typed text, and does not
  display the comment as posted (`FR-CMT-005`).
- The drawer is dismissible by keyboard and by pointer (`NFR-ACCESS-004`).

### J-09 — Reviewing project progress

**Purpose.** Project health is understood without manual reporting.

**Main steps.**
1. The user opens a project.
2. The user views progress indicators summarizing the project's tasks.
3. The user views the workspace dashboard for a cross-project summary.
4. The user filters or changes project to inspect a specific area.

**Expected outcome.** An accurate summary derived from actual task state.

**Failure and empty states.**
- A project with no tasks shows an explicit empty state rather than a misleading zero-percent
  display (`FR-DASH-004`).
- Metrics are labeled as derived from task data; they are not estimates (`FR-DASH-003`).
- Advanced analytics are **Coming Soon** and are represented honestly (§5.12).

### J-10 — Searching and filtering work

**Purpose.** A user locates specific work without scrolling.

**Main steps.**
1. The user activates search from the current view.
2. The user enters a search term.
3. Matching tasks are shown, with the matched field indicated (`FR-SEARCH-002`).
4. The user applies a filter such as assignee, priority, or stage.
5. The user clears the search or filter.

**Expected outcome.** A narrowed, correct result set that reflects the current query.

**Failure and empty states.**
- A query with no matches shows an explicit no-results state naming the query and offering a way
  to clear it (`FR-SEARCH-004`). That state is distinguishable from the no-query state and from
  the searching state (`AC-SEARCH-02`).
- Clearing search restores the full, unfiltered result set (`FR-SEARCH-005`).
- A search that cannot be completed reports an error, preserves the query, and does not present
  the result as a genuine no-match (`AC-SEARCH-07`).
- Scope is the **current project**, covering **tasks** and matching **title** and **description**
  (resolved **D-13**, `FR-SEARCH-007`, `FR-SEARCH-009`, `FR-SEARCH-010`).
- Results never include a task from a workspace the user does not belong to (`FR-SEARCH-011`,
  `NFR-SEC-010`).

### J-11 — Managing profile and workspace settings

**Purpose.** A user controls their own preferences, and workspace configuration is reachable.

**Main steps.**
1. The user opens settings from their account or workspace context.
2. The user changes a personal preference, including theme (`FR-PREF-001`).
3. The change takes effect and persists across a reload.
4. The user views workspace-level settings.

**Expected outcome.** Personal preferences applied and retained; workspace settings visible.

**Failure and empty states.**
- A setting change that fails to save reports the failure and does not display the new value as
  saved (`FR-PREF-005`).
- A setting the user cannot change is not presented as editable (`FR-PREF-006`). Which settings are
  restricted is **deferred** with role behavior (resolved **D-03**); membership scoping still
  applies.
- Theme behavior and its persistence are specified in §5.11 and §8.

---

## 5. Functional Requirements

### 5.0 Reading this section

Every subsection below states **purpose**, **expected user behavior**, **required interactions**,
**relevant states**, **dependencies**, **acceptance criteria**, and **initial delivery state**.

**Initial delivery state is a target for the initial milestone**, not a report of implemented
behavior. Nothing here is implemented (§1.4).

### 5.1 Authentication and user profiles — `FR-AUTH`

**Purpose.** A user can establish and return to an authenticated identity.

**Expected user behavior.** A user registers once, signs in thereafter, and can always tell
whether they are signed in.

**Required interactions.**
- `FR-AUTH-001` — The application provides a sign-in view and a registration view.
- `FR-AUTH-002` — Registration accepts a unique email address, a password, and a display name.
- `FR-AUTH-003` — Registration rejects an email address already registered to an account.
- `FR-AUTH-004` — Input validation reports the specific field and the reason for rejection.
- `FR-AUTH-005` — A failed authentication or registration attempt shows an error and preserves
  the user's entered input.
- `FR-AUTH-006` — A user can sign out and is returned to the sign-in view.
- `FR-AUTH-007` — The signed-in user's identity is visible from the application shell.
- `FR-AUTH-008` — A user can view and edit their own profile, including display name and avatar.

**Relevant states.** Loading while authenticating; empty form state; validation error per field;
submission error; success on redirect to the workspace context.

**Dependencies.** None. This is the foundational feature (§9).

**Acceptance criteria.**
- `AC-AUTH-01` — A new user can register and reach an authenticated state without a manual
  reload.
- `AC-AUTH-02` — Registering an already-registered email address produces a visible,
  field-specific error and does not create a second account.
- `AC-AUTH-03` — Submitting an empty required field produces a visible error naming that field.
- `AC-AUTH-04` — A failed sign-in attempt preserves the entered credentials' field content and
  displays a generic failure message that does not disclose account existence.
- `AC-AUTH-05` — After sign-out, protected views are not reachable and the sign-in view is shown.
- `AC-AUTH-06` — A profile edit is reflected in the application shell without a manual reload.

**Initial delivery state: Working** (target — Day 1, §7).

### 5.2 Workspaces and team membership — `FR-WS`

**Purpose.** Users are organized into a shared container that scopes their work.

**Expected user behavior.** A user creates a workspace or belongs to one, and sees only the
work within workspaces they belong to.

**Required interactions.**
- `FR-WS-001` — A user can create a workspace with a name.
- `FR-WS-002` — Workspace membership is listable, and the list is the basis for task assignment.
- `FR-WS-003` — An existing user can be added to a workspace by invitation. **Deferred for the
  initial milestone** (resolved **D-10**): invitations and joining are **Coming Soon** and are not
  implemented. This is a deliberate deferral, not an unresolved mechanism. The **Join a workspace**
  presentation is visibly unavailable and non-interactive, carries an honest explanation, and never
  implies that invitations work. Multi-member collaboration and invited-member coverage are
  deferred with it.
- `FR-WS-004` — A user sees only the workspaces and projects they belong to. **This is the minimum
  mandatory enforcement obligation and is not deferred:** every read and every write verifies
  workspace membership at the time of the request (`NFR-SEC-010`). It is independent of roles and
  does not depend on D-03.
- `FR-WS-005` — Every authenticated user with **zero** workspaces — arriving from registration
  **or** from sign-in — sees the empty workspace state. It offers **Create a workspace**, which is
  available, and **Join a workspace**, which is shown as visibly unavailable and non-interactive
  because invitations are deferred for the initial milestone (resolved **D-10**). No skip option is
  offered.
- `FR-WS-006` — A user can switch between workspaces they belong to. **Independent of
  invitations:** a user who creates two workspaces can exercise switching without any invitation
  (resolved **D-10**).
- `FR-WS-007` — A user can leave a workspace they are not the owner of. **Deferred** with role
  behavior (resolved **D-03**). Owner removal and ownership transfer are not exercised at the
  initial milestone.
- `FR-WS-008` — A workspace is **required** before a project or task can exist. A user with zero
  workspaces has no route to create a project or a task (resolved D-11).

**Relevant states.** Empty workspace state, reached from registration and from sign-in;
single-workspace state (no switcher needed); multi-workspace state, reachable by creating a
second workspace; loading; create failure; join action visibly unavailable while invitations are
deferred.

**Dependencies.** `FR-AUTH` (a workspace requires an authenticated user).

**Acceptance criteria.**
- `AC-WS-01` — A user can create a workspace and becomes its owner.
- `AC-WS-02` — The created workspace appears in the user's workspace list.
- `AC-WS-03` — A user with zero workspaces sees an empty state that names both **Create a
  workspace** and **Join a workspace**, and that distinguishes the available action from the
  unavailable one: the join action is visibly unavailable and non-interactive, carries an honest
  explanation, and offers no operable affordance or implication that invitations work.
- `AC-WS-04` — A workspace the user does not belong to is not listed and its projects are not
  reachable.
- `AC-WS-05` — Where a user belongs to two or more workspaces — reachable by creating a second
  workspace, without any invitation — switching workspaces updates the visible project set to the
  selected workspace. Exercisable independent of **D-10**.
- `AC-WS-06` — Workspace creation failure is reported and does not present the workspace as
  created.
- `AC-WS-07` — The zero-workspace path is reachable and identical from registration **and** from a
  subsequent sign-in, and a user is offered no control that skips the workspace state.
- `AC-WS-08` — A user who creates two workspaces can switch between them, and each switch updates
  the visible workspace, its project set, and the user's context. No invitation is required.

**Initial delivery state: Working** (target — Day 1, §7), **except** `FR-WS-003` invitations and
joining, which are **Coming Soon** by decision (resolved **D-10**). The empty-state routing, the
create flow, owner assignment, and `FR-WS-006` workspace switching are Working targets. Multi-member
collaboration and invited-member coverage are deferred with **D-10**.

### 5.3 Project creation and management — `FR-PRJ`

**Purpose.** Work is grouped into named, addressable units with their own lifecycle.

**Expected user behavior.** A user creates, renames, edits, and closes projects, and navigates
into a project to work on its tasks.

**Required interactions.**
- `FR-PRJ-001` — A user can create a project with a name; description and color are optional.
- `FR-PRJ-002` — Projects are listed within the current workspace. **The active project list
  excludes archived projects**, and archived projects are reachable through a separate **Archived**
  view (resolved **D-19**).
- `FR-PRJ-003` — A user can rename, edit the description, and change the color of a project.
- `FR-PRJ-004` — A project name that is empty or duplicates another project name within the same
  workspace is rejected with a message naming the conflict.
- `FR-PRJ-005` — A project with no tasks shows an explicit empty state with a route to create a
  task.
- `FR-PRJ-006` — A user can archive a project. **Archiving is reversible** (resolved **D-19**):
  it is a state change, not a deletion, and no task data is removed. Archiving requires
  confirmation. **"Complete" is not a separate lifecycle action** — archive is the only project
  lifecycle transition. Permanent project deletion is excluded from the initial milestone
  (`FR-PRJ-012`).
- `FR-PRJ-007` — Selecting a project opens it with its board or list view.
- `FR-PRJ-008` — A project does not define its own stages at the initial milestone. Every task in
  every project uses the same fixed system-wide stage set (resolved D-09).
- `FR-PRJ-009` — Archiving preserves all tasks, comments, and history of the project **without
  modifying their data**. Archive and restore do not mutate task, comment, or history content.
- `FR-PRJ-010` — An archived project can be restored, returning it to the active project list with
  its data intact (resolved **D-19**).
- `FR-PRJ-011` — The project currently being viewed **cannot be archived**. The user is told to
  navigate away from the project first (resolved **D-19**).
- `FR-PRJ-012` — **Planned:** permanent project deletion is excluded from the initial milestone and
  has **no interface control**. It must not be presented as a disabled or inert control
  (`AC-CS-06`).
- `FR-PRJ-013` — Archive and restore enforce **server-side workspace membership authorization** on
  every request (`NFR-SEC-010`, `FR-WS-004`). Both operations reject unauthorized requests
  regardless of what the interface renders (`FR-ROLE-008`).

**Relevant states.** Empty project list; project with no tasks; validation error; create and edit
failure; archive confirmation pending; archived project; archived view; restore failure. Archiving
is **consequential but non-destructive**: it hides a project from the active list and dashboard
while preserving all of its data (`FR-PRJ-009`, `NFR-ERR-004`). Retention policy for archived
projects remains **`OPEN DECISION` D-08** and is not decided here.

**Dependencies.** `FR-WS` (a project belongs to a workspace); `FR-AUTH`;
`NFR-SEC-010` (archive and restore are authorized writes); `FR-SEARCH` (archived-project tasks fall
outside the current-project search scope, resolved **D-13**).

**Acceptance criteria.**
- `AC-PRJ-01` — A user can create a project and it appears in the workspace project list.
- `AC-PRJ-02` — A project created without an optional description or color is accepted.
- `AC-PRJ-03` — An empty project name is rejected with a visible field-level error.
- `AC-PRJ-04` — A duplicate project name within one workspace is rejected with a message naming
  the duplicate.
- `AC-PRJ-05` — A project with no tasks shows an empty state with a working route to task
  creation.
- `AC-PRJ-06` — A project edit is reflected in the project list and the project header without a
  manual reload.
- `AC-PRJ-07` — A project offers no stage configuration, and a task in any project uses the same
  four fixed stages.
- `AC-PRJ-08` — Archiving requires confirmation. Declining the confirmation leaves the project
  active and completely unchanged (`NFR-ERR-004`).
- `AC-PRJ-09` — An archived project is absent from the active project list and from workspace
  dashboard summaries, and is reachable through the Archived view (`FR-PRJ-002`, `FR-DASH-002`).
- `AC-PRJ-10` — After archiving, every task, comment, and history entry of the project is still
  present and readable, with its content unaltered (`FR-PRJ-009`).
- `AC-PRJ-11` — Restoring returns the project to the active project list with all of its data
  intact and unchanged (`FR-PRJ-010`).
- `AC-PRJ-12` — Attempting to archive the project currently being viewed is prevented, with an
  explanation that the user must navigate away from the project first (`FR-PRJ-011`).
- `AC-PRJ-13` — A failed archive reports the error and does **not** present the project as
  archived (`NFR-ERR-002`). A failed restore reports the error and does **not** present the project
  as restored; it remains archived and reachable in the Archived view.
- `AC-PRJ-14` — No permanent-deletion control is presented for a project anywhere in the interface
  (`FR-PRJ-012`, `AC-CS-06`).
- `AC-PRJ-15` — A user who does not belong to the owning workspace cannot archive or restore its
  projects; the request is rejected server-side regardless of what the interface displays
  (`FR-PRJ-013`, `NFR-SEC-010`, `FR-ROLE-008`).

**Initial delivery state: Working** (target — Day 1 for project creation and editing; archive,
Archived view, and restore are **Day 3**, §7.3). `FR-PRJ-006` archiving is a **Working target**
under resolved **D-19**. Permanent project deletion is **Planned** and not represented in the
interface (`FR-PRJ-012`). Retention policy for archived projects remains **D-08**.

### 5.4 Task creation and management — `FR-TASK`

**Purpose.** Individual units of work are captured, editable, and movable.

**Expected user behavior.** A user creates a task with a title and the properties that matter,
and can revise them at any time.

**Required interactions.**
- `FR-TASK-001` — A task belongs to exactly one project.
- `FR-TASK-002` — A task requires a title; description, assignee, priority, and due date are
  optional. Priority defaults to **No priority** and is displayed as an explicit state, never as
  an empty gap (resolved D-09).
- `FR-TASK-003` — A user can create, view, edit, and delete a task.
- `FR-TASK-004` — A task with no title cannot be created; the control remains available and
  entered input is preserved.
- `FR-TASK-005` — A failed task create or edit surfaces an error and does not present the task as
  saved.
- `FR-TASK-006` — Deleting a task requires explicit confirmation and reports the outcome.
- `FR-TASK-007` — A task can be assigned to a workspace member; the candidate list is limited to
  members.
- `FR-TASK-008` — An unassigned task displays an explicit unassigned state.
- `FR-TASK-009` — A task can carry a priority and a due date. Priority values are **High**,
  **Medium**, **Low**, and **No priority** (resolved D-09). A due date is optional; when unset it
  is displayed as explicitly unset rather than blank.
- `FR-TASK-010` — A task can be moved between Kanban stages, and the change is reflected in every
  view where the task appears. **Done is the only terminal stage**, and a task is reopened by
  moving it out of **Done** into an active stage (resolved D-09).
- `FR-TASK-011` — The same task data underlies both the board view and the list view.
- `FR-TASK-012` — A new task is created in the **Backlog** stage. Stage belongs to the task, not
  to the project, and no project defines its own stages (resolved D-09).

**Relevant states.** Empty task collection; validation error; submission error; unassigned state;
deletion confirmation.

**Dependencies.** `FR-PRJ` (a task belongs to a project); `FR-WS` (assignment depends on
membership); `FR-KAN` (stage movement).

**Acceptance criteria.**
- `AC-TASK-01` — A task created with only a title is accepted and appears on the board and in the
  list.
- `AC-TASK-02` — A task with no title is rejected with a visible error, and the entered input is
  preserved after the failed attempt.
- `AC-TASK-03` — A task edit is reflected in the board, the list, and the detail drawer without a
  manual reload.
- `AC-TASK-04` — Deleting a task requires confirmation; declining leaves the task intact.
- `AC-TASK-05` — The assignee control lists only workspace members.
- `AC-TASK-06` — A task with no assignee shows an explicit unassigned indicator rather than an
  empty space.
- `AC-TASK-07` — A stage change made on the board is visible in the list view without a reload.
- `AC-TASK-08` — A simulated task create failure displays an error and the task is not shown as
  saved.
- `AC-TASK-09` — A newly created task appears in the **Backlog** column with an explicit **No
  priority** indicator rather than a blank value.
- `AC-TASK-10` — A task moved out of **Done** into an active stage is no longer treated as
  complete, and progress indicators recompute accordingly.

**Initial delivery state: Working** (target — Day 2, §7). The stage model, priority value set,
creation defaults, and reopening behavior are confirmed by resolved **D-09**.

### 5.5 Kanban board and drag-and-drop — `FR-KAN`

**Purpose.** Work in progress is understood by its position.

**Expected user behavior.** A user scans columns representing stages, and moves a card to change
its state.

**Required interactions.**
- `FR-KAN-001` — The board presents tasks as cards grouped into stage columns.
- `FR-KAN-002` — The board shows exactly four columns in the fixed order **Backlog → In Progress
  → In Review → Done** (resolved D-09). Within a column, cards are ordered **newest first**. No
  manual reordering and no custom columns are offered at the initial milestone, so no control
  implying either is shown.
- `FR-KAN-003` — A user can move a card between columns by drag-and-drop.
- `FR-KAN-004` — A drag that cannot complete returns the card to its origin and leaves task state
  unchanged; an invalid drop target is rejected with visible feedback.
- `FR-KAN-005` — An empty stage column shows an explicit empty state.
- `FR-KAN-006` — **A move must also be possible by keyboard**, without drag-and-drop.
- `FR-KAN-007` — The board reflects the current filter state from `FR-SEARCH`.
- `FR-KAN-008` — Card content shows the information a user needs to triage a task without
  opening it: title, and its stage-relevant properties.
- `FR-KAN-009` — The stage columns are not user-configurable at the initial milestone: they cannot
  be added, renamed, reordered, or removed, and **Done** is the only terminal stage (resolved
  D-09).

**Relevant states.** Empty project board; empty column; dragging; invalid drop; move failure;
loading.

**Dependencies.** `FR-TASK` (cards are tasks); `FR-PRJ` (the board belongs to a project);
`FR-SEARCH` (filters).

**Acceptance criteria.**
- `AC-KAN-01` — Every task in the current project appears exactly once on the board.
- `AC-KAN-02` — Moving a card to another column updates the task's stage and the change persists.
- `AC-KAN-03` — A card moved to a new column appears in that column in the list view.
- `AC-KAN-04` — An empty column shows a visible empty state, not an empty gap.
- `AC-KAN-05` — A task's stage can be changed using only the keyboard.
- `AC-KAN-06` — With a filter applied, the board shows only matching tasks and reports the number
  hidden.
- `AC-KAN-07` — An interrupted drag leaves the task in its original stage.
- `AC-KAN-08` — The board shows exactly four columns in the order **Backlog → In Progress → In
  Review → Done**, and presents no control to add, rename, reorder, or remove a column.

**Initial delivery state: Working** (target — Day 2, §7). The stage set, column order,
within-column ordering, and terminal-stage behavior are confirmed by resolved **D-09**. No Coming
Soon representation is required for the stage model.

### 5.6 List view — `FR-LIST`

**Purpose.** The same work is inspectable as an ordered, property-bearing table.

**Expected user behavior.** A user switches to the list to scan, sort, and open tasks.

**Required interactions.**
- `FR-LIST-001` — The list view presents every task in the current project.
- `FR-LIST-002` — Each row shows its task's key properties, including stage and assignee. Stage is
  shown as one of the four fixed values and priority as one of **High**, **Medium**, **Low**, or an
  explicit **No priority** (resolved D-09).
- `FR-LIST-003` — A user can sort by a task property.
- `FR-LIST-004` — A project with no tasks shows an explicit empty state.
- `FR-LIST-005` — A sort that cannot be applied leaves the previous order unchanged, with no
  silent reordering.
- `FR-LIST-006` — Switching between board and list preserves the current project and filter
  context.
- `FR-LIST-007` — Selecting a row opens the same task detail as the board (`FR-DRAWER`).
- `FR-LIST-008` — The list view supports editing a task's inline properties where it does not
  conflict with the detail drawer. **Planned** — excluded from the initial milestone; no inline
  editing affordance is presented in the list (resolved D-09).

**Relevant states.** Empty list; sorted ascending and descending; unsortable request; loading.

**Dependencies.** `FR-TASK`; `FR-PRJ`; `FR-SEARCH`.

**Acceptance criteria.**
- `AC-LIST-01` — The list contains exactly the tasks of the current project.
- `AC-LIST-02` — Sorting by a property reorders the rows accordingly.
- `AC-LIST-03` — Board-to-list and list-to-board switching preserves project and filter context.
- `AC-LIST-04` — A project with no tasks shows an explicit empty state in the list view.
- `AC-LIST-05` — Selecting a list row opens the task detail drawer for that task.
- `AC-LIST-06` — A row shows the task's assignee, including an explicit unassigned indicator.

**Initial delivery state: Working** (target — Day 2, §7). `FR-LIST-008` inline editing is
**Planned** — excluded from the initial milestone and not represented in the interface (§6.3).

### 5.7 Task detail drawer — `FR-DRAWER`

**Purpose.** Full context for one task is available without leaving the current view.

**Expected user behavior.** A user opens any task and reads or edits its complete context.

**Required interactions.**
- `FR-DRAWER-001` — Selecting a task opens a detail view showing all of its properties.
- `FR-DRAWER-002` — The drawer shows the task's description, stage, assignee, priority, and due
  date. Stage and priority use the fixed value sets confirmed by resolved **D-09**; an unset
  priority is shown as an explicit **No priority** state rather than a blank field.
- `FR-DRAWER-003` — The drawer can be dismissed, restoring the previous view and scroll context.
- `FR-DRAWER-004` — Property edits in the drawer are reflected in the board and list.
- `FR-DRAWER-005` — A task with no comments shows an explicit empty state in the comment area.
- `FR-DRAWER-006` — The drawer opens from both the board and the list for the selected task.
- `FR-DRAWER-007` — The drawer traps focus while open and returns focus to the invoking control
  on close (`NFR-ACCESS-004`).

**Relevant states.** Closed; open; loading task; task not found; unsaved edit; error on save.

**Dependencies.** `FR-TASK`; `FR-KAN`; `FR-LIST`; `FR-CMT` (comments).

**Acceptance criteria.**
- `AC-DRAWER-01` — Selecting a task on the board opens a drawer showing that task's properties.
- `AC-DRAWER-02` — Selecting a task in the list opens the same drawer with the same task.
- `AC-DRAWER-03` — Closing the drawer restores the board or list unchanged.
- `AC-DRAWER-04` — An edit made in the drawer is visible in the board and list without a reload.
- `AC-DRAWER-05` — A task with no comments shows an explicit empty state, not a blank area.
- `AC-DRAWER-06` — The drawer can be closed using only the keyboard.
- `AC-DRAWER-07` — On close, keyboard focus returns to the control that opened the drawer.

**Initial delivery state: Working** (target — Day 2, §7).

### 5.8 Comments and activity — `FR-CMT`

**Purpose.** Discussion and change history live with the work they concern.

**Expected user behavior.** A user discusses a task in context and can see what changed and when.

**Required interactions.**
- `FR-CMT-001` — A task carries an ordered comment thread.
- `FR-CMT-002` — A comment shows its author and creation time.
- `FR-CMT-003` — A user can post a comment on a task.
- `FR-CMT-004` — An empty comment is not submitted.
- `FR-CMT-005` — A failed comment submission shows an error, preserves the typed text, and does
  not display the comment as posted.
- `FR-CMT-006` — A task carries an activity history recording significant changes, including
  stage changes, assignment changes, and edits.
- `FR-CMT-007` — A user can open a task's activity history.
- `FR-CMT-008` — The activity history is readable in the task detail drawer.
- `FR-CMT-009` — Comments can be edited or deleted by their author. *Deletion and retention
  behavior is* **`OPEN DECISION` D-12**.

**Relevant states.** No comments; posting; empty-comment rejection; submission failure; activity
empty state.

**Dependencies.** `FR-DRAWER` (comments are shown in the drawer); `FR-AUTH` (author identity);
`FR-KAN` (stage changes feed activity).

**Acceptance criteria.**
- `AC-CMT-01` — A posted comment appears in the task's thread with its author and time.
- `AC-CMT-02` — Comments appear in a consistent chronological order.
- `AC-CMT-03` — Submitting an empty comment does not create a comment and shows a validation
  message.
- `AC-CMT-04` — A failed comment submission leaves the typed text intact and shows an error.
- `AC-CMT-05` — Moving a task to a different stage adds an activity entry recording the change.
- `AC-CMT-06` — A task with no comments and no activity shows explicit empty states.

**Initial delivery state: Working** (target — Day 3, §7), **except** `FR-CMT-009` comment
deletion and retention, which is **Coming Soon** pending D-12.

### 5.9 Dashboard and project progress — `FR-DASH`

**Purpose.** Project and workspace status is understood from the work itself.

**Expected user behavior.** A user sees accurate, derived indicators of progress.

**Required interactions.**
- `FR-DASH-001` — A project view shows progress indicators summarizing its tasks.
- `FR-DASH-002` — A workspace dashboard summarizes its **non-archived** projects. Archived projects
  are excluded from dashboard summaries (resolved **D-19**).
- `FR-DASH-003` — Indicators are derived from actual task data and are labeled as such; they are
  never estimates or forecasts.
- `FR-DASH-004` — A project with no tasks shows an explicit empty state rather than a
  misleading zero-percent figure.
- `FR-DASH-005` — The dashboard shows only workspaces and projects the user belongs to.
- `FR-DASH-006` — Basic indicators are defined at product level; the metric set and depth are
  **`OPEN DECISION` D-05**. Completion is derived from a task occupying the terminal **Done**
  stage (resolved D-09); **which** indicators are displayed remains **D-05** and is not decided
  here.
- `FR-DASH-007` — The dashboard provides routes into the underlying tasks behind each indicator.

**Relevant states.** Empty workspace; empty project; populated; partial data; loading.

**Dependencies.** `FR-TASK` and `FR-PRJ` (metrics depend on real task data); `FR-WS`.

**Acceptance criteria.**
- `AC-DASH-01` — Project indicators change when a task's stage changes.
- `AC-DASH-02` — Indicators reflect only the current project's tasks.
- `AC-DASH-03` — A project with no tasks shows an empty state, not a zero-progress claim.
- `AC-DASH-04` — The dashboard shows no project the user does not have access to, and no archived
  project (`FR-DASH-002`, `FR-DASH-005`, resolved **D-19**).
- `AC-DASH-05` — An indicator links to the tasks it summarizes.
- `AC-DASH-06` — A user can reach the dashboard from the application shell.

**Initial delivery state: Working** for basic indicators (target — Day 3, §7). **Coming Soon**
for advanced analytics (§5.12), **Blocked by D-05**.

### 5.10 Search and filtering — `FR-SEARCH`

**Purpose.** A user locates specific work without scrolling through it.

**Expected user behavior.** A user narrows the visible set of tasks by text or property.

**Required interactions.**
- `FR-SEARCH-001` — A user can search tasks by text.
- `FR-SEARCH-002` — Matching tasks indicate where the match occurred.
- `FR-SEARCH-003` — A user can filter tasks by stage, assignee, and priority. Stage and priority
  filters use the fixed value sets confirmed by resolved **D-09**. At the initial milestone, both
  text search and filters apply to the **current project** (resolved **D-13**).
- `FR-SEARCH-004` — A query with no matches shows an explicit no-results state naming the query
  and offering a way to clear it.
- `FR-SEARCH-005` — Clearing search and filters restores the full, unfiltered set.
- `FR-SEARCH-006` — An active filter is visible and individually removable.
- `FR-SEARCH-007` — Search and filter scope is the **current project** for the initial milestone
  (resolved **D-13**). Widening scope is additive and not exercised at the initial milestone.
- `FR-SEARCH-008` — Filters apply consistently across the board and list views.
- `FR-SEARCH-009` — **Entities:** at the initial milestone, search covers **tasks only**
  (resolved **D-13**).
- `FR-SEARCH-010` — **Searchable fields:** the **task title** and the **task description**
  (resolved **D-13**). No other field is searchable at the initial milestone. Matching is
  case-insensitive and matches on any part of a field's text.
- `FR-SEARCH-011` — **Isolation:** results are limited to the caller's workspaces by the mandatory
  membership check performed on the request (`NFR-SEC-010`, `FR-WS-004`). **No scope choice may
  widen that boundary**, and search must never return a task belonging to a workspace the caller
  does not belong to.
- `FR-SEARCH-012` — **Coming Soon, not implemented:** project-name search, cross-project and
  cross-workspace search, saved or advanced queries, structured boolean queries, search within
  comments, fuzzy or typo-tolerant matching, and relevance ranking. None of these may be
  represented as available.

**Relevant states.** Each is distinct and separately recognizable:

| State | Condition |
|---|---|
| **No query** | Search is available and inactive; the full, unfiltered task set is shown. Not a no-match result |
| **Typing / searching** | A query is in progress; a loading indicator is shown rather than a blank or empty interface (`NFR-STATE-003`) |
| **Results** | At least one matching task, with the matched field indicated (`FR-SEARCH-002`) |
| **No results** | A query returned nothing; the query is named and a way to clear it is offered (`FR-SEARCH-004`). Visually distinct from no-query and from searching (`NFR-STATE-004`) |
| **Filters active** | One or more filters applied; each is visible and individually removable (`FR-SEARCH-006`) |
| **Failure** | The search could not be completed; an error is reported, the query is preserved, and the result set is not presented as a genuine no-match (`NFR-ERR-001`, `NFR-ERR-003`) |

**Dependencies.** `FR-TASK` (searchable title and description); `FR-KAN` and `FR-LIST` (both
respect the filter state); `FR-WS` and `NFR-SEC-010` (results are isolated by the mandatory
membership check on the request).

**Acceptance criteria.**
- `AC-SEARCH-01` — A text query returns only tasks matching that text in the **task title or task
  description**, within the current project (`FR-SEARCH-009`, `FR-SEARCH-010`, `FR-SEARCH-007`).
- `AC-SEARCH-02` — A no-match query shows an explicit no-results state that names the query, and
  that state is distinguishable from both the no-query state and the searching state.
- `AC-SEARCH-03` — Filtering by stage restricts both the board and the list to matching tasks.
- `AC-SEARCH-04` — Multiple filters combine, and each is individually removable.
- `AC-SEARCH-05` — Clearing all filters restores the complete task set.
- `AC-SEARCH-06` — The board reports how many tasks the active filter is hiding.
- `AC-SEARCH-07` — **Failure.** A search that cannot be completed reports an error, preserves the
  entered query, and does **not** present the result set as a genuine no-match (`NFR-ERR-001`,
  `NFR-ERR-003`).
- `AC-SEARCH-08` — **Match indication.** A task returned by a text query indicates which searchable
  field matched — title or description (`FR-SEARCH-002`, `FR-SEARCH-010`).
- `AC-SEARCH-09` — **Isolation.** A user searching in one workspace never receives a task belonging
  to a workspace they do not belong to, regardless of query or filters (`FR-SEARCH-011`,
  `NFR-SEC-010`, `AC-WS-04`).
- `AC-SEARCH-10` — **Coming Soon honesty.** No project-name search, cross-project or
  cross-workspace search, saved or advanced query, comment search, fuzzy matching, or relevance
  ranking is presented as available (`FR-SEARCH-012`, `AC-CS-06`).

**Initial delivery state: Working** (target — Day 2, §7). Scope, entities, and searchable fields
are confirmed by resolved **D-13**. Advanced search capabilities remain **Coming Soon**
(`FR-SEARCH-012`) and must not be represented as functional.

### 5.11 Light and dark themes — `FR-THEME`

**Purpose.** The interface can be used comfortably under the user's lighting conditions.

**Expected user behavior.** A user selects a theme and it applies consistently and persistently.

**Required interactions.**
- `FR-THEME-001` — The application provides a light theme and a dark theme.
- `FR-THEME-002` — A user can switch themes from within the application.
- `FR-THEME-003` — The selection applies across every view without a manual reload.
- `FR-THEME-004` — The selection persists across a reload.
- `FR-THEME-005` — **Proposed:** the theme respects the operating system preference on first
  visit. *Default-resolution behavior is* **`OPEN DECISION` D-15**.
- `FR-THEME-006` — Theme switching does not change any layout, content, or capability — only
  presentation.
- `FR-THEME-007` — Contrast requirements are met in both themes (`NFR-ACCESS-002`).

**Relevant states.** Light; dark; switching; persisted; unpersisted.

**Dependencies.** Applies to every view; constrained by the design system, which is **PLANNED**
and does not yet exist (`AGENTS.md` §2.1).

**Acceptance criteria.**
- `AC-THEME-01` — Switching theme changes presentation across all views without a reload.
- `AC-THEME-02` — The selected theme persists across a reload.
- `AC-THEME-03` — Switching theme does not alter layout, data, or available actions.
- `AC-THEME-04` — Text and interactive controls meet contrast requirements in both themes.

**Initial delivery state: Working** (target — Day 3, §7), **Blocked by D-15** for the default
theme rule.

### 5.12 Advanced analytics — `FR-ANLYT`

**Purpose.** Teams can analyze performance trends beyond basic progress.

**Expected user behavior.** A user inspects trends over time rather than only current state.

**Required interactions.**
- `FR-ANLYT-001` — Analytics include time-based trends derived from task history.
- `FR-ANLYT-002` — Analytics include workload distribution across workspace members.
- `FR-ANLYT-003` — Analytics include throughput measures over a selectable period.
- `FR-ANLYT-004` — The metric set, period selection, and comparison behavior are
  **`OPEN DECISION` D-05**.
- `FR-ANLYT-005` — Every displayed measure is derived from recorded task data and is labeled
  with its basis.

**Relevant states.** Insufficient data; single period; multiple periods; loading; no recorded
history.

**Dependencies.** `FR-CMT` (requires recorded task history); `FR-DASH`; **Blocked by D-05**.

**Acceptance criteria.**
- `AC-ANLYT-01` — When this feature is represented, its interface is explicitly labeled
  **Coming Soon** and is not operable.
- `AC-ANLYT-02` — The representation does not display fabricated or sample metric values as if
  they were real.
- `AC-ANLYT-03` — No control in the Coming Soon representation performs an action.

**Initial delivery state: Coming Soon.** Represented, non-operable, honestly labeled
(`AGENTS.md` §7.1 forbids representing it as functional). **Blocked by D-05**.

### 5.13 Roles and permissions — `FR-ROLE`

**Purpose.** Authority within a workspace is explicit and enforceable.

**Expected user behavior.** A user performs only the operations their role permits.

**Required interactions.**
- `FR-ROLE-001` — A workspace has an owner.
- `FR-ROLE-002` — A member can be granted an administrative role.
- `FR-ROLE-003` — Administrative operations — member management, workspace settings, workspace
  deletion — are distinguishable from ordinary member operations.
- `FR-ROLE-004` — An operation outside a user's role is not performed, and the restriction is
  communicated.
- `FR-ROLE-005` — The permission model — which roles exist, what each may do, and how access is
  enforced — is **deferred for the initial milestone** (resolved **D-03**). This is a deliberate
  deferral, not an unresolved mechanism.
- `FR-ROLE-006` — During the initial milestone, **Confirmed:** all members have equivalent
  capability and no role-based enforcement is claimed.
- `FR-ROLE-007` — **Role authorization is deferred; workspace membership scoping is not.** Every
  read and every write is checked against the actor's workspace membership at the time of the
  request (`NFR-SEC-010`, `FR-WS-004`). Deferring roles does not relax membership scoping.
- `FR-ROLE-008` — **UI presentation is not enforcement.** Hiding or disabling a control is a
  presentation choice and does not satisfy any access-control requirement. Where a restriction
  exists it must be enforced when the request is made, and independently of what the interface
  renders.

**Relevant states.** Owner; administrator; member; restricted operation attempted; role
assignment.

**Dependencies.** `FR-WS` (roles exist within a workspace). Role behavior **deferred** by resolved
**D-03**; membership scoping enforced independently (`NFR-SEC-010`).

**Acceptance criteria.**
- `AC-ROLE-01` — When represented, role management is explicitly labeled **Coming Soon** and is
  not operable.
- `AC-ROLE-02` — The representation does not imply that permissions are already enforced.
- `AC-ROLE-03` — No control in the Coming Soon representation performs an action.
- `AC-ROLE-04` — Membership scoping is enforced independently of the Coming Soon representation:
  a user who does not belong to a workspace cannot read or write its resources, regardless of what
  the interface shows.

**Initial delivery state: Coming Soon.** Role behavior **deferred** by resolved **D-03**. The
initial milestone must not claim role-based enforcement it does not have (`FR-ROLE-006`,
`NFR-SEC-008`). Membership scoping is enforced and is **not** covered by this Coming Soon state
(`FR-ROLE-007`, `AC-ROLE-04`).

### 5.14 Real-time collaboration — `FR-RT`

**Purpose.** Concurrent users see a current, consistent view of shared work.

**Expected user behavior.** A user's changes become visible to others without manual refresh.

**Required interactions.**
- `FR-RT-001` — A change made by one user becomes visible to other users in the same workspace
  without manual refresh.
- `FR-RT-002` — Conflicting concurrent edits are resolved predictably and surfaced to the user
  rather than silently discarded.
- `FR-RT-003` — A user can see when the view they are looking at is current or stale.
- `FR-RT-004` — **Proposed:** presence indicators showing who else is viewing a project.
- `FR-RT-005` — The synchronization mechanism is an architecture decision and is **not**
  specified in this document (§12).

**Relevant states.** Connected; disconnected; reconnecting; conflict; stale view.

**Dependencies.** `FR-TASK`, `FR-KAN` (shared mutable state); **architecture document
PLANNED**.

**Acceptance criteria.**
- `AC-RT-01` — When represented, real-time collaboration is explicitly labeled **Coming Soon**
  and is not operable.
- `AC-RT-02` — The representation does not claim that other users' changes appear
  automatically.
- `AC-RT-03` — No control in the Coming Soon representation performs an action.

**Initial delivery state: Coming Soon.**

### 5.15 Automated workflows — `FR-AUTO`

**Purpose.** Repetitive status and assignment transitions are handled by rule.

**Expected user behavior.** A user defines rules that act on task events without manual effort.

**Required interactions.**
- `FR-AUTO-001` — A rule pairs a trigger — a task event — with an action.
- `FR-AUTO-002` — A user can create, edit, disable, and delete rules.
- `FR-AUTO-003` — Rule execution is visible and traceable — a user can see that a rule fired.
- `FR-AUTO-004` — A failing rule reports its failure and does not silently discard work.
- `FR-AUTO-005` — The available triggers, actions, and conditions are **`OPEN DECISION` D-16**.

**Relevant states.** Rule list; rule editing; rule fired; rule failed; rule disabled.

**Dependencies.** `FR-TASK`; `FR-CMT` (activity history supports traceability). **Blocked by
D-16.**

**Acceptance criteria.**
- `AC-AUTO-01` — When represented, automated workflows are explicitly labeled **Coming Soon**
  and are not operable.
- `AC-AUTO-02` — The representation does not display sample rule results as if they had executed.
- `AC-AUTO-03` — No control in the Coming Soon representation performs an action.

**Initial delivery state: Coming Soon.** **Blocked by D-16.**

### 5.16 Timeline / Gantt functionality — `FR-TL`

**Purpose.** Work is understood as scheduled duration and sequence.

**Expected user behavior.** A user views tasks as a schedule with start, end, and dependencies.

**Required interactions.**
- `FR-TL-001` — A timeline view presents tasks as scheduled bars across a time axis.
- `FR-TL-002` — A task's bar reflects its dates and duration.
- `FR-TL-003` — A user can inspect and, where permitted, adjust a task's dates from the
  timeline.
- `FR-TL-004` — Task dependencies can be expressed and are reflected in the schedule.
- `FR-TL-005` — The timeline's granularity and its delivery state at the initial milestone are
  **`OPEN DECISION` D-07**.
- `FR-TL-006` — The timeline presents the same task data as the board and list; it is an
  alternative view, not a separate source of truth.

**Relevant states.** No scheduled tasks; scheduled; partially scheduled; loading; unpermitted
adjustment.

**Dependencies.** `FR-TASK` (requires task dates); `FR-PRJ`. **Blocked by D-07.**

**Acceptance criteria.**
- `AC-TL-01` — When represented, the timeline is explicitly labeled **Coming Soon** and is not
  operable.
- `AC-TL-02` — The representation does not display fabricated schedule data.
- `AC-TL-03` — No control in the Coming Soon representation performs an action.
- `AC-TL-04` — If D-07 resolves to Working, task data shown in the timeline matches the board and
  list for the same tasks.

**Initial delivery state: Coming Soon.** **Blocked by D-07.**

### 5.17 External integrations — `FR-INT`

**Purpose.** TaskForge connects to other tools rather than becoming another silo.

**Expected user behavior.** A user connects external services and receives or sends work
updates.

**Required interactions.**
- `FR-INT-001` — A user can connect an external service to a workspace.
- `FR-INT-002` — Connected services exchange defined notifications or task data.
- `FR-INT-003` — A user can view and revoke a connection.
- `FR-INT-004` — A revoked connection stops exchanging data and its credentials are no longer
  used.
- `FR-INT-005` — **Proposed:** a sending service that is unavailable must not block core task
  management.
- `FR-INT-006` — The set of supported services and the data exchanged are **`OPEN DECISION`
  D-17**.

**Relevant states.** Not connected; connected; authorization pending; revoked; service
unavailable.

**Dependencies.** `FR-WS`; `FR-NOTIF`. **Blocked by D-17.** Security and privacy requirements
apply (`NFR-SEC-003`).

**Acceptance criteria.**
- `AC-INT-01` — When represented, external integrations are explicitly labeled **Coming Soon**
  and are not operable.
- `AC-INT-02` — The representation does not display mock connection states as if a service were
  connected.
- `AC-INT-03` — No control in the Coming Soon representation performs an action or requests
  credentials.

**Initial delivery state: Coming Soon.** **Blocked by D-17.**

### 5.18 Notifications — `FR-NOTIF`

**Purpose.** A user learns about events affecting their work.

**Expected user behavior.** A user is informed of relevant events through chosen channels.

**Required interactions.**
- `FR-NOTIF-001` — Notification-worthy events include assignment, stage change, mention, and
  comment on a task the user cares about.
- `FR-NOTIF-002` — A notification identifies its event and links to the related task.
- `FR-NOTIF-003` — A user can view and mark notifications as read.
- `FR-NOTIF-004` — A user can control notification preferences (`FR-PREF`).
- `FR-NOTIF-005` — Delivery channels — in-app, email, or others — and their scope are
  **`OPEN DECISION` D-04**.
- `FR-NOTIF-006` — A user must be able to disable a channel (`NFR-SEC-004`).

**Relevant states.** Unread; read; empty; delivery pending; delivery failed; channel disabled.

**Dependencies.** `FR-TASK`, `FR-CMT`, `FR-WS`. **Blocked by D-04.**

**Acceptance criteria.**
- `AC-NOTIF-01` — When represented, notifications are explicitly labeled **Coming Soon** and are
  not operable.
- `AC-NOTIF-02` — The representation does not display fabricated notification entries.
- `AC-NOTIF-03` — No control in the Coming Soon representation performs an action.

**Initial delivery state: Coming Soon.** **Blocked by D-04.**

### 5.19 Settings and preferences — `FR-PREF`

**Purpose.** Personal and workspace configuration is reachable and takes effect.

**Expected user behavior.** A user changes their preferences and sees them applied.

**Required interactions.**
- `FR-PREF-001` — A user can change personal preferences, including theme (`FR-THEME`).
- `FR-PREF-002` — A preference change takes effect without a manual reload.
- `FR-PREF-003` — A preference persists across a reload.
- `FR-PREF-004` — Workspace settings are viewable by workspace members.
- `FR-PREF-005` — A setting change that fails to save reports the failure and does not display
  the new value as saved.
- `FR-PREF-006` — A setting the user cannot change is not presented as editable. **Presentation
  only:** hiding or disabling a control is not enforcement (`FR-ROLE-008`). Where a restriction
  exists it must additionally be enforced when the request is made (`NFR-SEC-010`). Which settings
  are restricted is **deferred** with role behavior (resolved **D-03**).
- `FR-PREF-007` — Which workspace settings require administrative authority is **`OPEN DECISION`
  D-03**.

**Relevant states.** Default; changed; persisting; save failure; restricted.

**Dependencies.** `FR-AUTH`; `FR-WS`; `FR-THEME`.

**Acceptance criteria.**
- `AC-PREF-01` — A preference change takes effect without a manual reload.
- `AC-PREF-02` — A preference persists across a reload.
- `AC-PREF-03` — A failed preference save shows an error and does not display the new value as
  saved.
- `AC-PREF-04` — Settings are reachable from the application shell.
- `AC-PREF-05` — A restricted setting is not presented as editable to a user without authority.
  **Presentation-only check.** This criterion does not establish enforcement; enforcement is
  `NFR-SEC-010`, which applies independently of what the interface shows. Not exercisable at the
  initial milestone while restriction rules are deferred (resolved **D-03**).

**Initial delivery state: Working** for personal preferences (target — Day 3, §7).
**Coming Soon** for administrative workspace settings, **deferred** with role behavior (resolved
**D-03**). Personal preferences remain **Working**; membership scoping applies regardless
(`NFR-SEC-010`).

---

## 6. Delivery State Model

These definitions implement `docs/00_PROJECT_OVERVIEW.md` §6.3 and are used identically
throughout this document. Every feature in §5 carries exactly one initial delivery state.

### 6.1 Working

- Functionality is **implemented**.
- Core behavior has been **tested**.
- Relevant acceptance criteria have been **verified**.

A feature may only be described as Working when its acceptance criteria have actually been
exercised and confirmed (`AGENTS.md` §7.1 and `AGENTS.md` §15.4). Being written is not being
Working.

### 6.2 Coming Soon

- The feature is **intentionally represented** in the interface.
- Its incomplete functionality is **clearly communicated**.
- It **must not falsely appear operational**.
- Any available preview or interaction **must be explicitly described**.

A Coming Soon feature may be visible, but every control within it is inert and labeled. A
control that looks operable but does nothing is a **defect**, not a Coming Soon state.

**Coming Soon must not disguise broken functionality.** If a feature is represented as Coming
Soon because it does not work rather than because it is deliberately deferred, that is an
incorrect state assignment and a reportable defect.

### 6.3 Planned

- The feature is part of the product vision.
- It is **not implemented** and **not represented as available** in the interface.

A Planned feature has no presence in the interface. Representing a Planned feature as though it
were available is a defect.

### 6.4 State assignment summary

| Feature | Area | Initial state | Note |
|---|---|---|---|
| Authentication and profiles | `FR-AUTH` | **Working** | Foundation |
| Workspaces and membership | `FR-WS` | **Working** | Invitations and joining are **Coming Soon** by decision (**D-10** resolved); create, empty-state routing, owner assignment, and switching (`FR-WS-006`) are Working |
| Project management | `FR-PRJ` | **Working** | Archive, Archived view, and restore are Working targets (**D-19** resolved, Day 3); permanent deletion **Planned**, no control |
| Task management | `FR-TASK` | **Working** | Stage model and priority set confirmed (**D-09** resolved) |
| Kanban board | `FR-KAN` | **Working** | Stage set, column order, terminal stage confirmed (**D-09** resolved) |
| List view | `FR-LIST` | **Working** | Inline editing is **Planned**, excluded from the initial milestone (**D-09** resolved) |
| Task detail drawer | `FR-DRAWER` | **Working** | |
| Comments and activity | `FR-CMT` | **Working** | Deletion and retention Coming Soon (D-12) |
| Dashboard and progress | `FR-DASH` | **Working** | Basic indicators only |
| Search and filtering | `FR-SEARCH` | **Working** | Task-only, current-project scope, title + description confirmed (**D-13** resolved); advanced search Coming Soon |
| Light and dark themes | `FR-THEME` | **Working** | Default rule blocked by D-15 |
| Advanced analytics | `FR-ANLYT` | **Coming Soon** | Blocked by D-05 |
| Roles and permissions | `FR-ROLE` | **Coming Soon** | Role behavior deferred (**D-03** resolved); membership scoping enforced regardless (**NFR-SEC-010**) |
| Real-time collaboration | `FR-RT` | **Coming Soon** | |
| Automated workflows | `FR-AUTO` | **Coming Soon** | Blocked by D-16 |
| Timeline / Gantt | `FR-TL` | **Coming Soon** | Blocked by D-07 |
| External integrations | `FR-INT` | **Coming Soon** | Blocked by D-17 |
| Notifications | `FR-NOTIF` | **Coming Soon** | Blocked by D-04 |
| Settings and preferences | `FR-PREF` | **Working** | Personal preferences Working; administrative settings deferred (**D-03** resolved) |

**Twelve features are targeted Working; seven are Coming Soon.** All twenty-one requirements in
§5.12–§5.18 that are Coming Soon carry acceptance criteria requiring honest, inert, labeled
representation.

---

## 7. Three-Day Implementation Priorities

**These are planning targets, not guaranteed completion claims.** Nothing here asserts that any
day's work will be finished (`docs/00_PROJECT_OVERVIEW.md` §6.1).

### 7.1 Day 1 — Foundation

**Target areas.**
- Application foundation and shared layout
- Authentication flow (`FR-AUTH`)
- Workspace and project foundation (`FR-WS`, `FR-PRJ`)
- Core visual system
- Basic dashboard structure (`FR-DASH`)

**Rationale.** Every later day depends on an authenticated user inside a workspace containing a
project. Nothing on Day 2 can be verified without Day 1 foundations.

**Dependencies.** `FR-AUTH` → `FR-WS` → `FR-PRJ`. All three are prerequisites for `FR-TASK`.

**Blocked.** Theme depends on a design system that does not yet exist (§12); basic dashboard
structure depends on task data that will not exist until Day 2. The zero-workspace onboarding path
is confirmed by resolved **D-11** and no longer blocks Day 1.

**Verification note.** The **Join a workspace** presentation must be built as an honest
**Coming Soon** surface: visibly unavailable, non-interactive, with an explanation, and no operable
affordance (resolved **D-10**, `AC-WS-03`, `AC-CS-02`). A dead or operable-looking join control is
a defect. Workspace switching (`FR-WS-006`, `AC-WS-08`) is a Day 1 target exercisable by creating a
second workspace; it does **not** depend on invitations.

### 7.2 Day 2 — Core productivity

**Target areas.**
- Task CRUD (`FR-TASK`)
- Kanban interactions (`FR-KAN`)
- List view (`FR-LIST`)
- Task details (`FR-DRAWER`)
- Assignment, priority, and deadlines (`FR-TASK-007`, `FR-TASK-009`)
- Search and filtering (`FR-SEARCH`)

**Rationale.** These are the capabilities that make the product usable. A coherent core matters
more than breadth (`docs/00_PROJECT_OVERVIEW.md` §6.4).

**Dependencies.** Requires Day 1. `FR-SEARCH` applies to both views and therefore requires both.

**Blocked.** The task stage model and priority set are **resolved (D-09)** and no longer block Day
2. Role authority over assignment is **deferred (D-03)**; every member may assign to any workspace
member. Still blocked: nothing.

**Verification note.** Task assignment is exercisable at Day 2 with a **single-member** workspace:
`FR-TASK-007` and `AC-TASK-05` can be satisfied by one member, and `AC-TASK-06` covers the
unassigned state. **Multi-member** assignment coverage — an assignee list containing someone other
than the current user — is **deferred** with invitations (resolved **D-10**) because it requires
either an invitation or a second account; it is not verified at the initial milestone
(`DEP-03`, §9.2).

**Verification note.** Every read and write must verify workspace membership at the time of the
request (`NFR-SEC-010`). A control being hidden is **not** evidence of enforcement and must not be
reported as such (`FR-ROLE-008`).

### 7.3 Day 3 — Completion and polish

**Target areas.**
- Comments and activity (`FR-CMT`)
- Progress indicators and basic analytics (`FR-DASH`)
- Theme behavior (`FR-THEME`)
- Responsive refinement (`NFR-RESP`)
- Advanced feature Coming Soon states (§6.2)
- Project archive, Archived view, and restore (`FR-PRJ-006`, `FR-PRJ-010` — resolved **D-19**)
- Functional testing and bug fixing

**Rationale.** Presentation, honesty about deferred features, and verification of the whole.

**Dependencies.** Comments and activity require `FR-DRAWER`. Progress indicators require real
task data. Project archiving requires `FR-PRJ` and is authorized through `NFR-SEC-010`; the Archived
view depends on archive and restore both being Working. Coming Soon representations should only be
built once the corresponding feature's Working scope is settled, so they do not misrepresent it.

**Blocked.** Advanced analytics representation is **Blocked by D-05** for the metric set;
Coming Soon representations for D-04, D-07, D-16, and D-17 features require only a label
and inert controls. The **D-03** role representation also requires only a label and inert
controls, and must not imply that permissions are enforced (`AC-ROLE-02`).

### 7.4 Priority adjustment rules

1. **Adjust priorities openly.** Reordering to match actual progress is permitted and expected.
2. **Never silently remove requirements.** A requirement deferred from its day moves to Coming
   Soon or Planned with a recorded reason — it does not disappear (§6.2, §6.3).
3. **Never downgrade honesty to save time.** If a feature cannot be Working, it is Coming Soon
   or Planned — never represented as functional (§6.1).
4. **Record every reassignment** in this document's §13 change history.
5. **Foundations are not negotiable.** A day that skips `FR-AUTH`, `FR-WS`, or `FR-PRJ` produces
   a Day 2 that cannot be verified.

---

## 8. Non-Functional Requirements

These are product-level quality requirements. Numerical targets are **Proposed** unless marked
Confirmed, and are not measurement commitments.

### 8.1 Responsive behavior — `NFR-RESP`

- `NFR-RESP-001` — The interface is usable at every supported screen size without horizontal
  scrolling, clipped content, or overlapping elements.
- `NFR-RESP-002` — Layout adapts at the supported breakpoints. **The breakpoint set is
  `OPEN DECISION` D-02.**
- `NFR-RESP-003` — The Kanban board remains usable at narrow widths; its adaptation is
  **Proposed** horizontal scrolling of columns.
- `NFR-RESP-004` — The task detail drawer adapts to the viewport and remains fully operable at
  every supported size.
- `NFR-RESP-005` — Touch interaction is not required to exceed keyboard and pointer
  operability.
- `NFR-RESP-006` — **Proposed:** the primary task-management flow is completable at the smallest
  supported width.

**Acceptance.** At each supported width: no clipping, no horizontal page scroll, all primary
actions reachable, and the board usable. *Blocked by D-02 — supported sizes are not yet fixed.*

### 8.2 Accessibility — `NFR-ACCESS`

- `NFR-ACCESS-001` — Content is structured with semantic elements and a logical heading order.
- `NFR-ACCESS-002` — Text and interactive controls meet a stated contrast requirement.
  **Proposed:** WCAG 2.1 AA contrast. *Conformance level is* **`OPEN DECISION` D-18**.
- `NFR-ACCESS-003` — All functionality is operable by keyboard, with a visible focus indicator.
- `NFR-ACCESS-004` — Modal and drawer surfaces trap focus while open and restore it on close.
- `NFR-ACCESS-005` — Interactive controls have accessible names that describe their purpose.
- `NFR-ACCESS-006` — Status and validation messages are programmatically associated with the
  control they concern.
- `NFR-ACCESS-007` — Drag-and-drop is never the only way to perform an action (`FR-KAN-006`).
- `NFR-ACCESS-008` — Coming Soon representations are conveyed in text, not by color or visual style
  alone.

**Acceptance.** Keyboard-only traversal of each primary journey succeeds; focus is visible
throughout; controls have accessible names; drawer focus is trapped and restored. Where a
required tool or environment is unavailable, report the requirement as unverified
(`AGENTS.md` §15.5) — never claim compliance.

### 8.3 Performance — `NFR-PERF`

No measured target is committed here. Establishing one requires a testing strategy, which does
not exist (§12).

- `NFR-PERF-001` — **Proposed:** interactive views respond to user input without a perceptible
  delay. A specific threshold is deferred until `docs/testing.md` exists.
- `NFR-PERF-002` — **Proposed:** data loading states are shown rather than a blank interface.
- `NFR-PERF-003` — Animation does not block interaction (`AGENTS.md` §16.5).
- `NFR-PERF-004` — **Proposed:** long task lists remain scrollable without degrading
  interaction.
- `NFR-PERF-005` — No performance claim may be reported as met without a measurement performed
  after the final change (`AGENTS.md` §7.7 and `AGENTS.md` §15.4).

### 8.4 Consistent visual design — `NFR-VIS`

- `NFR-VIS-001` — Visual values are drawn from a shared token set, not one-off values.
- `NFR-VIS-002` — The same concept looks the same way in every view.
- `NFR-VIS-003` — Existing components are extended before new ones are introduced.
- `NFR-VIS-004` — The visual system applies in both themes (`FR-THEME-007`).

**Status.** This requirement depends on a design system document that does **not** yet exist.
It is stated as a product constraint; the tokens themselves are out of scope (§12).

### 8.5 Error handling — `NFR-ERR`

- `NFR-ERR-001` — A failed operation is reported to the user in specific, actionable language.
- `NFR-ERR-002` — A failure never leaves the interface showing a state that did not occur.
- `NFR-ERR-003` — User input is preserved across a failed submission.
- `NFR-ERR-004` — A destructive action requires confirmation. **Task deletion is destructive**
  (`FR-TASK-006`). **Project archiving is consequential but non-destructive** (resolved **D-19**):
  it also requires confirmation (`FR-PRJ-006`, `AC-PRJ-08`), but it preserves all project data
  (`FR-PRJ-009`) and is reversible (`FR-PRJ-010`). **Permanent project deletion would be
  destructive and is excluded from the initial milestone** (`FR-PRJ-012`, `AC-PRJ-14`).
- `NFR-ERR-005` — **Proposed:** an unexpected failure presents a recoverable state rather than a
  dead end.
- `NFR-ERR-006` — **Proposed:** a retry is offered where retrying is meaningful.
- `NFR-ERR-007` — Error messages do not disclose internal implementation detail.

### 8.6 Data integrity — `NFR-DATA`

- `NFR-DATA-001` — A confirmed change persists and is shown consistently in every view.
- `NFR-DATA-002` — The board and list views present the same task state (`FR-TASK-011`).
- `NFR-DATA-003` — Indicators are derived from actual data, never estimated (`FR-DASH-003`).
- `NFR-DATA-004` — Deletion requires confirmation and reports its outcome.
- `NFR-DATA-005` — **Proposed:** a failed save never appears successful.
- `NFR-DATA-006` — Undo is **not** claimed at the initial milestone; it is recorded as follow-up
  (**D-14**).
- `NFR-DATA-007` — Retention and export expectations are **`OPEN DECISION` D-08**.

### 8.7 Loading, empty, success, and failure states — `NFR-STATE`

- `NFR-STATE-001` — Every data-bearing view defines all four states: loading, empty, success, and
  failure.
- `NFR-STATE-002` — An empty state explains what is absent and offers a next action.
- `NFR-STATE-003` — A loading state is shown rather than an empty interface.
- `NFR-STATE-004` — An empty state is never visually indistinguishable from a loading state.
- `NFR-STATE-005` — A success is confirmed where the user made a change.
- `NFR-STATE-006` — **Proposed:** an empty state is never rendered as a misleading zero-value
  metric (`FR-DASH-004`).

### 8.8 Reduced-motion support — `NFR-MOTION`

- `NFR-MOTION-001` — When the user preference for reduced motion is set, non-essential animation
  is suppressed or replaced.
- `NFR-MOTION-002` — Functionality is never dependent on motion to be understood.
- `NFR-MOTION-003` — Where a motion token and the reduced-motion requirement conflict, the
  reduced-motion requirement wins.
- `NFR-MOTION-004` — Drag-and-drop and drawer transitions provide a non-motion equivalent.

**Acceptance.** With the reduced-motion preference set, all functionality remains operable and
understood, and non-essential motion does not play.

### 8.9 Security and privacy considerations — `NFR-SEC`

Stated as product-level constraints. Implementation controls belong to the architecture and
technical documents (§12).

- `NFR-SEC-001` — Only authenticated users may reach protected views.
- `NFR-SEC-002` — A user sees only the workspaces and projects they belong to (`FR-WS-004`).
- `NFR-SEC-003` — External service credentials are never displayed in the interface, never
  logged, and are revocable (`FR-INT-004`).
- `NFR-SEC-004` — A user can disable a notification channel (`FR-NOTIF-006`).
- `NFR-SEC-005` — Passwords are never displayed after entry.
- `NFR-SEC-006` — Sign-out ends the session such that protected views are not reachable
  (`FR-AUTH-006`, `AC-AUTH-05`).
- `NFR-SEC-007` — Secrets and credentials are never committed to the repository
  (`AGENTS.md` §11).
- `NFR-SEC-008` — Role-based enforcement is **not claimed** at the initial milestone
  (`FR-ROLE-006`). Deferring roles does not relax membership scoping, which remains mandatory
  (`NFR-SEC-010`).
- `NFR-SEC-010` — **Mandatory at the initial milestone and not deferred.** Every read and every
  write verifies that the actor belongs to the workspace owning the resource, at the time of the
  request. Hiding, disabling, or omitting a control in the interface **does not** satisfy this
  requirement and must not be reported as if it did (`FR-WS-004`, `FR-ROLE-007`, `FR-ROLE-008`).
  Role-level authorization beyond membership is deferred by resolved **D-03**.
- `NFR-SEC-009` — **Proposed:** personal data export and deletion behavior is **`OPEN DECISION`
  D-08**.

---

## 9. Feature Dependencies

These are **product-level** relationships: which features must exist before others can be
verified. Implementation structure is out of scope (§12).

### 9.1 Foundational chain

```
FR-AUTH  →  FR-WS  →  FR-PRJ  →  FR-TASK  →  { FR-KAN, FR-LIST, FR-DRAWER }
                                        ↓                    ↓
                                   FR-SEARCH            FR-CMT
                                        ↓                    ↓
                                     FR-DASH  ←──────────────┘
```

### 9.2 Relationship register

| # | Relationship | Consequence if unmet |
|---|---|---|
| **DEP-01** | Workspace membership affects project access | A user's visible project set cannot be scoped correctly |
| **DEP-02** | Projects contain tasks | Task creation and every task view are unverifiable. Archiving preserves the project's tasks rather than removing them (resolved **D-19**) |
| **DEP-03** | Task assignment depends on workspace membership | The assignee candidate list cannot be populated. **Single-member** coverage is exercisable at the initial milestone; **multi-member** coverage requires an invitation or a second account and is deferred (resolved **D-10**) |
| **DEP-04** | Dashboard metrics depend on project and task data | Indicators cannot be verified as accurate |
| **DEP-05** | Role permissions affect workspace and project operations | **Split.** **Membership scoping** is enforced and verifiable at the initial milestone (`NFR-SEC-010`). **Role-based access control** is deferred with resolved **D-03** and is not verifiable while a workspace cannot hold a second member |
| **DEP-06** | Kanban stage movement depends on tasks | Drag-and-drop cannot be verified |
| **DEP-07** | The task detail drawer depends on tasks, board, and list | Context cannot be verified in one place |
| **DEP-08** | Comments and activity depend on the drawer and on authentication | Discussion cannot be verified in context |
| **DEP-09** | Search and filtering depend on tasks and apply to both views | Neither view can show a correct filtered set. Scope, entities, and searchable fields are confirmed by resolved **D-13**; result isolation is enforced by `FR-SEARCH-011` and `NFR-SEC-010` |
| **DEP-10** | Progress indicators depend on recorded task history | Trends cannot be derived |
| **DEP-11** | Advanced analytics depend on activity history | Trends have no data source |
| **DEP-12** | Automated workflows depend on task events | Rules have no trigger |
| **DEP-13** | Timeline depends on task dates | Bars have no duration to represent |
| **DEP-14** | Themes apply to every view | Visual consistency cannot be verified across views |
| **DEP-15** | Notifications depend on tasks, comments, and membership | Events have no defined audience |
| **DEP-16** | External integrations depend on workspaces and notifications | Connections have no scope |
| **DEP-17** | Accessibility requirements apply to every feature | No feature is acceptable independently of `NFR-ACCESS` |

**Critical path to a coherent initial milestone:** `DEP-01` → `DEP-02` → `DEP-06`/`DEP-07` →
`DEP-09` → `DEP-04`. Every seven Coming Soon features depend on the Working chain being
established first.

---

## 10. Acceptance Criteria

### 10.1 Framework

Acceptance for the initial working implementation is assessed in five categories. Per-feature
criteria are stated in §5; this section states what a coherent, acceptable application means
overall.

**A category passes only on demonstrated evidence.** Where a required check cannot be performed,
it is reported as unverified — never as passed (`AGENTS.md` §15.5).

### 10.2 Functional acceptance

| Ref | Criterion | Evidence required |
|---|---|---|
| **AC-FUNC-01** | Each of the twelve features assigned **Working** in §6.4 meets its own acceptance criteria in §5 | Each criterion exercised and confirmed |
| **AC-FUNC-02** | The eleven journeys in §4 complete end to end without an unintended dead end | Each journey walked |
| **AC-FUNC-03** | Board and list present identical task state (`FR-TASK-011`) | Compared side by side for the same project |
| **AC-FUNC-04** | No journey reaches a state the product does not define a state for | Reviewed against §8.7 |
| **AC-FUNC-05** | Failed operations are reported and never presented as successful | Each failure path exercised |
| **AC-FUNC-06** | Features blocked by open decisions are not claimed as complete | Compared against §6.4 |

### 10.3 Visual and responsive acceptance

| Ref | Criterion | Evidence required |
|---|---|---|
| **AC-VIS-01** | No clipping, overlap, or horizontal page scroll at any supported width | Checked at each supported width |
| **AC-VIS-02** | The board, list, and drawer are usable at every supported width | Each exercised |
| **AC-VIS-03** | Theme switching changes presentation only — not layout, data, or capability | Compared before and after |
| **AC-VIS-04** | The same concept appears consistently across views | Compared across views |
| **AC-VIS-05** | No one-off visual values appear outside the token set | Review against the design system |

**Blocked.** `AC-VIS-01` and `AC-VIS-02` require the supported width set — **D-02**. `AC-VIS-05`
requires a design system that does not yet exist (§12).

### 10.4 Accessibility acceptance

| Ref | Criterion | Evidence required |
|---|---|---|
| **AC-ACCESS-01** | Every journey in §4 is completable using only the keyboard | Each journey walked |
| **AC-ACCESS-02** | Focus is visible at every interactive stop | Visual inspection |
| **AC-ACCESS-03** | Drawer focus is trapped while open and restored on close | Verified in the drawer |
| **AC-ACCESS-04** | Every interactive control has an accessible name | Reviewed per view |
| **AC-ACCESS-05** | Validation and status messages are associated with their control | Reviewed per form |
| **AC-ACCESS-06** | Drag-and-drop is not the only route to a stage change (`FR-KAN-006`) | Keyboard route exercised |
| **AC-ACCESS-07** | With reduced motion set, all functionality remains operable and understood | Verified with the preference set |

**Blocked.** `AC-ACCESS-02` contrast depends on **D-18**. Where a required tool or environment is
unavailable, report as unverified (`AGENTS.md` §15.5).

### 10.5 Data and interaction integrity acceptance

| Ref | Criterion | Evidence required |
|---|---|---|
| **AC-DATA-01** | A change made in any view is reflected in every other view of the same data | Cross-view comparison |
| **AC-DATA-02** | A change survives a reload | Reloaded and re-checked |
| **AC-DATA-03** | An interrupted drag leaves task state unchanged | Interrupted and verified |
| **AC-DATA-04** | A failed save is not displayed as saved | Each failure path exercised |
| **AC-DATA-05** | Deleting requires confirmation, and declining changes nothing | Both paths exercised |
| **AC-DATA-09** | Archiving a project mutates no task, comment, or history data, and restoring returns that data unaltered | Compared before archiving and after archiving and restoring |
| **AC-DATA-06** | Indicators match the underlying task data, and archived projects are excluded from dashboard summaries | Recomputed and compared |
| **AC-DATA-07** | Empty states are distinguishable from loading states | Both states produced |

### 10.6 Coming Soon presentation requirements

| Ref | Criterion | Evidence required |
|---|---|---|
| **AC-CS-01** | Each of the seven **Coming Soon** features (§6.4) is visibly and explicitly labeled | Reviewed per feature |
| **AC-CS-02** | No control inside any Coming Soon representation performs an action | Each control exercised |
| **AC-CS-03** | No Coming Soon representation displays fabricated data, metrics, or connection states | Reviewed per feature |
| **AC-CS-04** | Coming Soon status is conveyed in text, not by visual style or color alone | Reviewed per feature |
| **AC-CS-05** | A Coming Soon feature is not labeled because it is broken rather than deferred | Reviewed against §6.2 |
| **AC-CS-06** | No **Planned** feature appears in the interface as available — in particular, no permanent project-deletion control is presented (`FR-PRJ-012`, `AC-PRJ-14`) | Reviewed against §6.3 |

---

## 11. Open Decisions

### 11.1 Carried forward from the project overview

These are **not** silently resolved. Source: `docs/00_PROJECT_OVERVIEW.md` §6.6 (*Open
decisions*).

| ID | Decision | Impact if unresolved | Must be determined before |
|---|---|---|---|
| **D-02** | Supported screen sizes and breakpoints | `NFR-RESP-002`, `AC-VIS-01`, `AC-VIS-02` cannot be evaluated | Any visual or responsive acceptance |
| **D-04** | Notification delivery channels | `FR-NOTIF-005`; channel requirement cannot be specified | Notification implementation |
| **D-05** | Analytics depth and metric set | `FR-DASH-006`, `FR-ANLYT-004`; DEP-10, DEP-11 unverifiable | Analytics implementation; limits the Day 3 analytics scope |
| **D-06** | Supported browsers and versions | Verification targets undefined; no browser-specific acceptance possible | The first functional verification pass |
| **D-07** | Timeline delivery state at the initial milestone | `FR-TL-005`; AC-TL-04 conditional | Timeline representation and Day 3 Coming Soon scope |
| **D-08** | Data retention and export | `NFR-DATA-007`, `NFR-SEC-009`; also the retention period for archived projects, which **D-19 deliberately did not decide** | Any data lifecycle, export, or archived-project retention work |

### 11.2 New to this document

| ID | Decision | Impact if unresolved | Must be determined before |
|---|---|---|---|
| **D-12** | Comment deletion, editing, and retention | `FR-CMT-009` | Day 3 comments |
| **D-14** | Whether undo is required at the initial milestone | `NFR-DATA-006`; currently out of scope | Destructive-action design |
| **D-15** | Default theme resolution — system preference or user choice | `FR-THEME-005` | Theme implementation |
| **D-16** | Automated workflow triggers, actions, and conditions | `FR-AUTO-005` | Any workflow implementation |
| **D-17** | Supported external services and exchanged data | `FR-INT-006`; `NFR-SEC-003` | Any integration implementation |
| **D-18** | Accessibility conformance level | `NFR-ACCESS-002`, `AC-ACCESS-02` | Accessibility acceptance |

### 11.3 Blocking summary

**Resolved** and recorded in §11.5: **D-03** (role permissions deferred for the initial
milestone), **D-09** (stage and priority model), **D-10** (invitations deferred for the initial
milestone), **D-11** (zero-workspace onboarding), **D-13** (search scope), and **D-19** (project
archive semantics). **D-08** (data retention and export) remains open and is **not** decided by
D-19: archived-project retention is unresolved.

**Blocks Day 1:** nothing. D-03 no longer blocks administrative scope.
**Blocks Day 2:** nothing. D-13 no longer blocks search scope.
**Blocks Day 3:** D-12, D-15, D-05.
**Blocks acceptance:** D-02, D-06, D-18.
**No open decision now blocks any day.**

**D-03 attribution correction.** D-03 previously appeared to block `FR-PRJ` and to gate
`FR-WS-004`. Both attributions were wrong and are corrected:

| Concern | Status |
|---|---|
| **Workspace membership scoping** (`FR-WS-004`, `AC-WS-04`, `NFR-SEC-010`) | **Required and enforced.** Not a role concern; not deferred |
| **UI presentation** (`FR-PREF-006`, `AC-PREF-05`) | Presentation only — **never** evidence of enforcement (`FR-ROLE-008`) |
| **Role authorization** (`FR-ROLE-004`, `FR-WS-007`, `FR-PREF-007`) | **Deferred** by resolved **D-03** |
| **Project requirements** (`FR-PRJ-001`–`FR-PRJ-008`) | **Not role-gated.** Every project operation is owner-or-member; archiving is **D-19**, not D-03 |
| **Role management surface** (`FR-ROLE`) | **Coming Soon** |

**D-10 wording correction.** D-10 previously read as blocking any membership growth beyond one
user. That conflated two separable things, now corrected:

| Consequence of deferring invitations | Status |
|---|---|
| Invitation and joining (`FR-WS-003`) | **Coming Soon** — deferred by decision, not blocked |
| The **Join a workspace** presentation | Honest, visibly unavailable, non-interactive — required, not optional |
| Multi-member collaboration and invited-member coverage | Deferred with **D-10** |
| **Multi-member** assignment candidate list (`DEP-03`) | Deferred — needs an invitation or a second account |
| Workspace **switching** (`FR-WS-006`, `AC-WS-05`, `AC-WS-08`) | **Working** — exercisable by creating a second workspace; **independent of D-10** |
| **Single-member** assignment (`FR-TASK-007`, `AC-TASK-05`) | **Working** — exercisable at the initial milestone |

D-10 no longer blocks Day 1 or Day 2. It defers team use cases only.

### 11.4 Proposed interim position

To keep the initial milestone buildable without pre-empting the remaining decisions, the following
are **Proposed**, not confirmed:

| Decision | Proposed interim position |
|---|---|
| **D-15** | Default theme follows the operating system preference; the user may override it. |
| **Advanced search** | **Unapproved proposal — not a decision.** Widening search beyond the current project — project-name search, cross-project and cross-workspace search, saved and structured queries, comment search, fuzzy matching, or relevance ranking — is the candidate direction for a future milestone. **It is not approved, not scheduled, and must not be treated as decided or implemented.** |
| **Permanent project deletion** | **Unapproved proposal — not a decision.** Deleting a project and its tasks permanently remains part of the long-term product vision but has **no interface control** at the initial milestone and is recorded as **Planned** (`FR-PRJ-012`, `AC-PRJ-14`). Retention for archived projects is governed by unresolved **D-08**. |
| **Future invitations** | **Unapproved proposal — not a decision.** A minimal invitation-link flow, with an explicitly authorized inviter, single use, and a defined expiry, is one candidate mechanism for a future milestone. It is recorded here only so the deferral has a candidate direction. **It is not approved, not scheduled, and must not be treated as decided.** It also depends on **D-04** (whether any email channel is involved), which is not resolved, and it **requires D-03 to be reopened** first, because who may invite is a role-authorization question that the current deferral deliberately leaves open (§3.2, `FR-ROLE-007`). |

Each must be confirmed or replaced before the corresponding feature is described as complete.

The former interim entries for **D-03**, **D-09**, **D-11**, **D-13**, and **D-19** have been
removed: all five are now resolved and recorded in §11.5. The **Future invitations**, **Advanced search**, and **Permanent project deletion** rows above are
unapproved proposals, not decisions.

### 11.5 Resolved decisions

Recorded so a settled question is not reopened. Identifiers are retained for traceability and are
not reused.

| ID | Decision | Recorded in |
|---|---|---|
| **D-03** | **RESOLVED.** Role-based permissions are **deferred for the initial milestone**. `FR-ROLE` remains **Coming Soon**, and no role-based enforcement is claimed (`FR-ROLE-006`, `NFR-SEC-008`). **Workspace membership scoping is mandatory and is NOT deferred:** every read and every write verifies membership at the time of the request (`FR-WS-004`, `NFR-SEC-010`, `AC-ROLE-04`). **UI presentation is not enforcement** — hiding or disabling a control must not be reported as access control (`FR-ROLE-008`, `FR-PREF-006`, `AC-PREF-05`). Project requirements are not role-gated; archiving remains **D-19**. `FR-WS-007` leaving a workspace, and restricted administrative settings, are deferred with role behavior. **Reopen condition:** D-03 must be reopened before invitations or multi-member collaboration are implemented. | `§3.2`, `J-03`, `J-05`, `J-11`, `FR-WS-004`, `FR-WS-007`, `FR-ROLE-005`, `FR-ROLE-006`, `FR-ROLE-007`, `FR-ROLE-008`, `AC-ROLE-04`, `FR-PREF-006`, `AC-PREF-05`, `NFR-SEC-008`, `NFR-SEC-010`, `DEP-05`, §6.4, §7.2, §7.3, §11.3 |
| **D-13** | **RESOLVED.** Search at the initial milestone covers **tasks only**, is scoped to the **current project**, and matches the **task title** and **task description** (case-insensitive, partial match). The previously dangling reference in `AC-SEARCH-01` to *"the fields defined at product level"* is resolved to this explicit field list. Results are **isolated** to the caller's workspaces by the mandatory membership check on the request (`FR-SEARCH-011`, `NFR-SEC-010`); no scope choice widens that boundary. Six states are defined distinctly: no query, typing/searching, results, no results, filters active, and failure. Failure and match-indication acceptance criteria are added (`AC-SEARCH-07`, `AC-SEARCH-08`), together with isolation (`AC-SEARCH-09`) and Coming Soon honesty (`AC-SEARCH-10`). Advanced search capabilities — project-name search, cross-project and cross-workspace search, saved and structured queries, comment search, fuzzy matching, and relevance ranking — are **Coming Soon and not implemented** (`FR-SEARCH-012`). | `J-10`, `FR-SEARCH-003`, `FR-SEARCH-007`, `FR-SEARCH-009`, `FR-SEARCH-010`, `FR-SEARCH-011`, `FR-SEARCH-012`, `AC-SEARCH-01`, `AC-SEARCH-02`, `AC-SEARCH-07`, `AC-SEARCH-08`, `AC-SEARCH-09`, `AC-SEARCH-10`, `DEP-09`, §6.4, §7.2, §11.3 |
| **D-19** | **RESOLVED.** Project archiving is a **reversible** state change, not a deletion: tasks, comments, and history are preserved and never modified (`FR-PRJ-009`), and an archived project can be restored with its data intact (`FR-PRJ-010`). Archiving **requires confirmation**, and declining leaves the project active and unchanged (`AC-PRJ-08`). Archived projects are excluded from the active project list (`FR-PRJ-002`) and from workspace dashboard summaries (`FR-DASH-002`), and are reachable through a separate **Archived** view. The project currently being viewed cannot be archived; the user is told to navigate away first (`FR-PRJ-011`, `AC-PRJ-12`). **Permanent project deletion is excluded** from the initial milestone and has **no interface control** — **Planned**, not a disabled control (`FR-PRJ-012`, `AC-PRJ-14`). Archive and restore enforce server-side workspace membership authorization (`FR-PRJ-013`, `AC-PRJ-15`). **"Complete" is not a separate lifecycle action.** Archiving is reclassified in `NFR-ERR-004` as **consequential but non-destructive**, while task deletion remains destructive. **Retention policy for archived projects remains `OPEN DECISION` D-08 and is not decided here.** | `J-03`, `FR-PRJ-002`, `FR-PRJ-006`, `FR-PRJ-009`, `FR-PRJ-010`, `FR-PRJ-011`, `FR-PRJ-012`, `FR-PRJ-013`, `AC-PRJ-08`, `AC-PRJ-09`, `AC-PRJ-10`, `AC-PRJ-11`, `AC-PRJ-12`, `AC-PRJ-13`, `AC-PRJ-14`, `AC-PRJ-15`, `FR-DASH-002`, `AC-DASH-04`, `NFR-ERR-004`, `DEP-02`, §6.4, §7.3, §11.3 |
| **D-09** | **RESOLVED.** Stages are a fixed, system-wide, ordered set: **Backlog → In Progress → In Review → Done**. **Done is the only terminal stage**, and a task is reopened by moving it out of Done. Stage belongs to the **task**; new tasks default to **Backlog**; projects define no stages. Priority values are **High**, **Medium**, **Low**, and **No priority**, defaulting to **No priority**. Within a column, cards are ordered **newest first**; manual reordering is excluded from the initial milestone. `FR-LIST-008` inline editing moves from Coming Soon to **Planned**. Project archive semantics were separated into **D-19** and are resolved there. Dashboard metric selection remains **D-05**. | `J-04`, `J-06`, `FR-PRJ-006`, `FR-PRJ-008`, `FR-TASK-002`, `FR-TASK-009`, `FR-TASK-010`, `FR-TASK-012`, `FR-KAN-002`, `FR-KAN-009`, `FR-LIST-002`, `FR-LIST-008`, `FR-DRAWER-002`, `FR-SEARCH-003`, `FR-DASH-006`, `AC-TASK-09`, `AC-TASK-10`, `AC-KAN-08`, `AC-PRJ-07`, §6.4, §7.2 |
| **D-10** | **RESOLVED.** Workspace invitations and joining are **deferred for the initial milestone** and are **Coming Soon**. `FR-WS-003` is an explicit deferral, not an unresolved mechanism. The **Join a workspace** presentation remains visibly unavailable and non-interactive with an honest explanation, never a dead button and never an implication that invitations work. Workspace **creation** remains **Working**. Workspace **switching** (`FR-WS-006`) is **independent of invitations** and is **Working**: a user can create two workspaces and switch between them. Multi-member collaboration and invited-member coverage are deferred with this decision. **D-03** (invitation authority) and **D-04** (notification channels) remain unresolved and are **not** decided here. | `J-01`, `J-02`, `FR-WS-003`, `FR-WS-005`, `FR-WS-006`, `AC-WS-03`, `AC-WS-05`, `AC-WS-08`, `DEP-03`, §6.4, §7.1, §7.2, §11.3 |
| **D-11** | **RESOLVED.** A workspace is **required** before a project or task can exist. Every authenticated user with **zero** workspaces — arriving from registration **or** from sign-in — sees the empty workspace state. Workspace creation is **Working** and assigns the creator as **owner**. **Join a workspace** is **Coming Soon** because invitations are deferred (resolved **D-10**), and its presentation must be visibly unavailable and non-interactive: never a dead button, and never an implication that invitations work. There is **no skip option**. `AC-WS-03` is amended so it remains testable while honestly distinguishing available from unavailable actions. A testable zero-workspace path is preserved for both registration and subsequent sign-in. | `J-01`, `J-02`, `FR-WS-005`, `FR-WS-008`, `AC-WS-03`, `AC-WS-07`, §6.4, §7.1 |

**None of these resolutions changes any delivery state.** Working means implemented, tested, and
verified (§6.1). These decisions make the affected features **verifiable**, not verified — no
feature may be described as Working on the strength of an approved decision alone (`AGENTS.md`
§7.1, §15.4). Deferring a role system does **not** defer membership scoping, which remains a
mandatory Working obligation (`NFR-SEC-010`). Narrowing search scope for the initial milestone
does **not** relax result isolation, which remains mandatory (`FR-SEARCH-011`).

---

## 12. Out of Scope for This Document

The following belong to their own documents and are **deliberately absent**. Nothing written here
should be inferred to specify any of them.

| Concern | Belongs to | Status |
|---|---|---|
| Design tokens, component specifications, interaction patterns | Design system document | PLANNED — does not exist |
| System architecture, module boundaries, data flow | Architecture document | PLANNED — does not exist |
| Database schemas, entity models, field definitions | Technical implementation document | PLANNED — does not exist |
| API contracts, endpoints, data formats | Technical implementation document | PLANNED — does not exist |
| Technology, framework, language, hosting, tooling | Technical implementation document | PLANNED — does not exist |
| Synchronization mechanism for `FR-RT` | Architecture document | PLANNED — does not exist |
| Test strategy, required checks, CI | Testing document | PLANNED — does not exist |
| Deployment, observability, runbooks | Operations document | PLANNED — does not exist |
| Measured performance thresholds | Testing document | PLANNED — does not exist |
| Pricing, packaging, commercial terms | Not covered by any current document | Unassigned |

**Specific restraints observed in this document.** No backend endpoint, no database field, no
framework, and no technology-specific mechanism is specified anywhere above. Where a mechanism
would be a technology decision — for example how `FR-RT` synchronization works — this document
defines the required *behavior* and defers the *mechanism*.

The authoritative registry is maintained in `AGENTS.md` §2.1.

---

## 13. Change History

| Version | Date | Change | Basis |
|---|---|---|---|
| **v1.0** | Initial creation | Created as the product requirements document. Established §2 goals, §3 user types, §4 journeys, §5 functional requirements with stable IDs, §6 delivery state model, §7 three-day priorities, §8 non-functional requirements, §9 dependencies, §10 acceptance criteria, §11 open decisions, and §12 boundaries. Assigned each feature an initial delivery state. | `docs/00_PROJECT_OVERVIEW.md` (ACTIVE) — confirmed decisions D-01 and the delivery-state definitions in its §6.3. `AGENTS.md` (ACTIVE) — workflow, verification, and reporting rules. |
| **v1.1** | D-09 and D-11 approved | Recorded both approved decisions in §11.5 and updated every dependent reference: `J-01`, `J-02`, `J-04`, `J-06`; `FR-WS-005/006/008`, `FR-PRJ-006/008`, `FR-TASK-002/009/010/012`, `FR-KAN-002/009`, `FR-LIST-002/008`, `FR-DRAWER-002`, `FR-SEARCH-003`, `FR-DASH-006`; `AC-WS-03/05/07`, `AC-PRJ-07`, `AC-TASK-09/10`, `AC-KAN-08`; the §6.4 register, §7.1, §7.2, §11.2, §11.3, and §11.4. `FR-LIST-008` moved Coming Soon → **Planned**. Project archive semantics separated out of D-09 into new **D-19**, which remains unresolved. `AC-WS-03` amended; `FR-WS-006` and `AC-WS-05` marked conditional on **D-10**. | Explicit user approval of the D-09 and D-11 proposals, with the stated clarifications. `AGENTS.md` §2.1 registry unchanged — no new document was created. **No delivery state was changed to imply implementation; no feature was marked verified.** |
| **v1.2** | D-10 approved — invitations deferred | Recorded D-10 as resolved in §11.5 and corrected the blocker wording that had conflated invitation-dependent team use with independently testable switching. Updated `J-01` and `J-02`; `FR-WS-003` (explicit deferral), `FR-WS-005`, `FR-WS-006` (**independent of invitations**); `AC-WS-03`, `AC-WS-05` (conditional marker removed), and new **`AC-WS-08`** for switching between two workspaces created by the same user; the §6.4 `FR-WS` note; §7.1 and §7.2 verification and blocker notes; `DEP-03` split into single-member and multi-member coverage; §11.2, §11.3, §11.4, §11.5. Invitations and joining are **Coming Soon**; the join presentation must stay visibly unavailable and non-interactive with an honest explanation. Workspace creation and switching remain **Working** targets. | Explicit user approval of Option A with independent workspace switching. A future invitation-link mechanism is recorded in §11.4 as an **unapproved proposal only** — Option C is not committed. `AGENTS.md` §2.1 registry unchanged. **No feature was marked implemented or verified.** |
| **v1.3** | D-03 approved — role permissions deferred | Recorded D-03 as resolved in §11.5. §3.2 rewritten to separate **membership scoping**, **UI presentation**, and **role authorization**, with the reopen condition stated. `FR-ROLE-005` re-pointed from `OPEN DECISION` to an explicit deferral; `FR-ROLE-006` confirmed; new **`FR-ROLE-007`** (scoping not deferred), **`FR-ROLE-008`** (presentation is not enforcement), and **`AC-ROLE-04`** (scoping enforced independently of the Coming Soon representation). New **`NFR-SEC-010`** makes server-side membership checks on every read and write mandatory. `FR-WS-004` restated as the minimum enforcement obligation; `FR-WS-007` deferred. `FR-PREF-006` and `AC-PREF-05` reworded as presentation-only. **Blocker attributions corrected:** `J-03` no longer marks `FR-WS-004` as D-03-blocked, `J-05` and `J-11` restated, and `FR-PRJ` no longer attributed to D-03. `DEP-05` split into enforceable membership scoping and deferred role authorization. §6.4, §7.2, §7.3, §11.1, §11.3, §11.4, §11.5 updated. | Explicit user approval of D-03 Option A **including the mandatory membership-scoping safeguards**. `AGENTS.md` §2.1 registry unchanged. **D-04, D-13, and D-19 remain unresolved and untouched. `FR-ROLE` remains Coming Soon; no delivery state was changed; no feature was marked implemented or verified.** |
| **v1.4** | D-13 approved — search scope | Recorded D-13 as resolved in §11.5. Confirmed **task-only** search scoped to the **current project**, matching **title** and **description**. `FR-SEARCH-003` and `FR-SEARCH-007` re-pointed from `OPEN DECISION`; new **`FR-SEARCH-009`** (entities), **`FR-SEARCH-010`** (searchable fields + matching semantics), **`FR-SEARCH-011`** (result isolation via `NFR-SEC-010`), **`FR-SEARCH-012`** (advanced search Coming Soon). Six states defined distinctly. `AC-SEARCH-01`'s dangling *"fields defined at product level"* reference resolved; new **`AC-SEARCH-07`** (failure), **`AC-SEARCH-08`** (match indication), **`AC-SEARCH-09`** (isolation), **`AC-SEARCH-10`** (Coming Soon honesty). Dependencies, `J-10`, the §6.4 `FR-SEARCH` note, the §7.2 blocker list, and `DEP-09` updated. D-13 removed from §11.1, §11.3, and §11.4; recorded in §11.5. | Explicit user approval of D-13 Option 1 including the two required corrections. `AGENTS.md` §2.1 registry unchanged. **`FR-SEARCH` remains targeted Working; nothing was marked implemented or verified. D-04, D-05, D-12 and other open decisions remain unresolved and untouched.** |
| **v1.5** | D-19 approved — project archive semantics | Recorded D-19 as resolved in §11.5. Archiving is **reversible**; tasks, comments, and history are preserved unaltered (`FR-PRJ-009`, `AC-DATA-09`); archived projects leave the active list (`FR-PRJ-002`) and dashboard summaries (`FR-DASH-002`) and are reachable via a separate Archived view; restore returns them intact (`FR-PRJ-010`); archiving the currently viewed project is prevented with an explanation (`FR-PRJ-011`, `AC-PRJ-12`); **permanent deletion excluded with no interface control** (`FR-PRJ-012`, `AC-PRJ-14`, `AC-CS-06`); archive and restore enforce server-side membership authorization (`FR-PRJ-013`, `AC-PRJ-15`). `FR-PRJ-006` resolved and reclassified in `NFR-ERR-004` as **consequential but non-destructive**, with task deletion remaining destructive. **"Complete" is not a separate lifecycle action.** New criteria `AC-PRJ-08`–`AC-PRJ-15` cover confirmation, list/dashboard exclusion, data preservation, restore, blocked-current-project, archive and restore failure reporting, no-deletion-control, and authorization. `J-03`, §5.3, §5.9, §6.4, §7.3, `DEP-02`, §8.5, §10.5, §10.6, §11.2, §11.3, §11.4, §11.5 updated. D-19 removed from the open and interim registers; recorded in §11.5. | Explicit user approval of the D-19 decision report. **`AGENTS.md` and `docs/00_PROJECT_OVERVIEW.md` not modified. D-08 retention remains unresolved and was deliberately not decided here. `FR-PRJ` was already a Working feature, so `FR-PRJ-006` moving from a Coming Soon exception to a Working target leaves feature totals unchanged — recalculated as 12 Working / 7 Coming Soon across 18 features. Nothing was marked implemented or verified.** |

### 13.1 Relationship to confirmed product decisions

This document **implements**, and does not reopen, the confirmed decisions in
`docs/00_PROJECT_OVERVIEW.md`:

- All ten product areas remain in scope; nothing is excluded (§6.4 covers all of them).
- The initial target is a working application within a 3-day window (§7) — recorded as a planning
  target, not a completion claim.
- Advanced functionality uses Coming Soon states (§6.2, §6.4) rather than being removed from
  scope.
- No feature is represented as functional unless implemented and verified (§6.1, `AGENTS.md`
  §7.1).

### 13.2 Expected future revisions

This document will require revision when:

1. Any decision in §11 is resolved — the affected requirements are updated and the change
   recorded here.
2. Day-by-day progress requires priority adjustment — recorded here per §7.4 rule 4.
3. A feature's delivery state changes — recorded here with the reason and evidence.
4. A new project document becomes ACTIVE and constrains this one.

Every revision must be recorded in this table. An unrecorded change to this document is a defect.

---

**Final principle:** A requirement that cannot be verified is not met, and a feature that is not
implemented is not Working. Where this document states an initial delivery state, it states an
intent — never a claim about what exists.