# AGENTS.md — TaskForge

> Master instruction file for autonomous agents and contributors working on TaskForge.
> This file is authoritative for all AI-assisted and human-directed work in this repository.

**How to read references:** `§4` refers to a whole section. `§5.3` refers to a named
subsection of section 5. `§10.5` refers to numbered rule 5 *within* section 10 — the number
after the section identifies the rule, not a subsection. Subsection headings are always named
in prose (e.g. §15.5 *Unverifiable Requirements*); rule numbers are always plain numbers.

---

## 1. Project Definition

TaskForge is a **professional project management SaaS application**. It is a production-grade,
commercial product — not a prototype, demo, or learning exercise.

Every implementation decision must reflect that standard:

- Work must be reliable, maintainable, and trustworthy for real users.
- Features must be complete and coherent, not partially stubbed to "pass" a check.
- Quality, clarity, and correctness take precedence over speed.

---

## 2. Role of This File

`AGENTS.md` is the **master instruction file** for the project. It defines the non-negotiable
rules of engagement for any agent or contributor operating in this repository.

It applies to **all** work regardless of topic. More specific project documentation
(architecture, design system, API contracts, data models, testing strategy, deployment) will
be created later; those documents govern their own topics and never override this file.

### 2.1 Documentation Registry

Documentation is **topic-based**, not tier-based. Each topic has exactly one owning document.
There is no global "higher tier wins" ranking — authority comes from topic ownership, not
position or depth. The document that owns testing rules has no authority over design or
architecture decisions, and vice versa.

| Document | Status | Owns |
|---|---|---|
| `AGENTS.md` | **ACTIVE** | All work: workflow, scope, safety, integrity, authorization, reporting |
| `docs/00_PROJECT_OVERVIEW.md` | **ACTIVE** | Product identity, concept, target users, product principles, high-level product areas, product boundaries, success criteria |
| `docs/01_PRODUCT_REQUIREMENTS.md` | **ACTIVE** | User journeys, functional and non-functional requirements, delivery state assignment, implementation priorities, feature dependencies, acceptance criteria |
| `README.md` | PLANNED | Orientation, setup, and entry points |
| `CONTRIBUTING.md` | PLANNED | Human contribution, PR, and review process |
| `docs/architecture.md` | **ACTIVE** | System structure, module boundaries, data flow, technology decisions, trust boundaries, local development |
| `docs/design-system.md` | **ACTIVE** | Design tokens, component specifications, interaction, motion, accessibility, and iconography. **Specified, not implemented** — see note below |
| `docs/api.md` | **ACTIVE** | Endpoint contracts, request and response schemas, error formats, and the deliberate absence of routes |
| `docs/testing.md` | PLANNED | Test strategy, required checks, CI expectations |
| `docs/operations.md` | **ACTIVE** | Deployment support, backup/restore runbook, schema-change policy |

Actual repository layout (siblings are siblings — none is nested under another):

```
taskforge/
├── AGENTS.md                (ACTIVE — this file)
├── docs/                    (exists)
│   ├── 00_PROJECT_OVERVIEW.md  (ACTIVE)
│   ├── 01_PRODUCT_REQUIREMENTS.md  (ACTIVE)
│   ├── architecture.md      (ACTIVE)
│   ├── design-system.md     (ACTIVE — specified, not implemented)
│   ├── api.md               (ACTIVE)
│   ├── testing.md           (PLANNED — does not exist yet)
│   └── operations.md        (PLANNED — does not exist yet)
├── server/                  (exists — Express API, Prisma schema)
├── src/                     (exists — React client)
├── README.md                (PLANNED — does not exist yet)
└── CONTRIBUTING.md          (PLANNED — does not exist yet)
```

**Status values:**

- **ACTIVE** — the document exists and is a valid rule source.
- **Specified, not implemented** — the document exists and is authoritative for its topic, but the
  behaviour it describes has **not** been built. `docs/design-system.md` is in this state: its
  specifications are documented, but application implementation and runtime behaviour have **not**
  been verified. ACTIVE status means the document may be cited as a rule source; it never means
  the described behaviour exists in an application.
- **PLANNED** — the document does not exist yet. A PLANNED document **must never be cited**
  as a rule source, quoted, or used to justify a decision. Its intended purpose is recorded
  here only so the registry stays complete.

Do not fabricate references to documents, files, rules, or specs that do not exist. If a
needed document is missing, state the gap explicitly.

### 2.2 Precedence by Topic

Resolution order for any question:

1. The **user's latest explicit instruction** (see §3.1 for its limits).
2. **This file** — `AGENTS.md`, for anything it covers.
3. **The ACTIVE document that owns the topic**, if one exists.
4. **Supporting ACTIVE documents** on the same topic.

If the codebase contradicts an ACTIVE document, the document governs the intended design;
the contradiction is a defect to **report**, not a licence to rewrite the code (§12).

### 2.3 Registry Maintenance

When a new project-level document is created, update the registry table in §2.1 in the **same
change**: set its status to ACTIVE, fill in what it owns, and add it to the tree if it sits in
a new location. A document that exists but is absent from the registry has no authority.

---

## 3. Precedence and Conflict Resolution

### 3.1 Order of Precedence

1. **The user's latest explicit instruction takes precedence over all repository-level
   instructions** — this file and every document in the registry. "Latest" means a later
   instruction supersedes an earlier one on the same topic.

   **Non-waivable limits.** Two groups of rules cannot be set aside by any instruction:
   - **§7 (honesty and integrity)** — a request to report unverified work as verified, or to
     omit a failure, is declined. This is not a style preference; it is the premise that makes
     every other rule checkable.
   - **§11 (secrets and sensitive values)** — a request to print, log, or commit a secret is
     declined (§11.6).

   **Gates the user *can* satisfy.** §10 (destructive operations) and the other §5.3 gates are
   not barriers to user authority — they are authorization requirements. An instruction that
   names the action explicitly **is** the explicit authorization §5.1 demands, and it is
   governed by §5.2's scope limit. What is forbidden is *inferring* that approval (§5.1) or
   stretching it past the named scope (§5.2).

   If obeying an instruction would require a §7 or §11 violation, follow the safety rule, do
   not perform the action, and say plainly what was declined and why.
2. **`AGENTS.md`** governs everything not settled by the user's instruction.
3. **The owning ACTIVE document** for the topic in question.
4. **Supporting ACTIVE documents** on the same topic, with the more narrowly scoped one
   taking precedence.

### 3.2 Sibling Documents

Sibling documents — documents that own different topics — **do not outrank one another**.

- A document may speak only within the topic it owns. Statements outside that scope are
  disregarded.
- If a sibling document addresses a topic it does not own, treat it as non-authoritative and
  report the overreach.
- If two ACTIVE documents genuinely overlap on one topic, prefer the more specific
  (narrower-scoped) statement. If neither is more specific, go to §3.3.

### 3.3 Ambiguity Procedure

When instructions or documents conflict, or a rule does not clearly apply:

1. **Identify the conflict.** Name the specific documents or instructions involved and state
   where they disagree. Do not guess which one is meant.
2. **Preserve scope.** Do **not** resolve the ambiguity by dropping, deferring, or narrowing
   requested work, and do not silently substitute a smaller task. Partial delivery must be
   stated, never implied.
3. **Separate what is unambiguous and proceed with it** if that work does not depend on the
   unresolved decision.
4. **Ask the user** when a decision is necessary: present the conflicting positions, state
   which you recommend and why, and describe what each option would mean for the result.
5. **Record the outcome** in the report (§18) so the decision is not re-litigated.

A quick clarification is always cheaper than a large wrong change.

---

## 4. Mandatory Workflow

### 4.1 The Sequence

```
Read → Inspect → Plan → Identify Approval Gates → Obtain Required Approval
      → Implement → Verify → Fix → Report → Propose Checkpoint
```

| Step | Requirement |
|---|---|
| **Read** | Read the relevant documentation. Check the registry (§2.1) for an ACTIVE document that owns the topic, and read it. Never treat a PLANNED document as a rule source. |
| **Inspect** | Inspect the existing code. Understand conventions, patterns, and abstractions already in use before changing anything. |
| **Plan** | State concrete, verifiable steps. Identify the files to be created or modified. Call out risks and unknowns. Assign a status label (§8) to each planned item. Capture the verification **baseline** before any edit is made (§15.2). |
| **Identify Approval Gates** | Determine which actions in the plan require authorization (§5.3) — destructive operations, dependency installation, architecture changes, scope expansion, and the rest of that list. |
| **Obtain Required Approval** | Ask for authorization for every gate identified, before implementing. Do not begin gated work while approval is pending. |
| **Implement** | Make the change, only within the approved scope. Follow existing structure, naming, and style (§12). |
| **Verify** | Run the applicable verification standard (§15.1), then compare against the baseline captured at Plan (§15.3). The run must come after the final code change (§15.4). |
| **Fix** | Resolve everything verification surfaces: errors, warnings, failing tests, regressions. Re-verify after fixes (§15.4). |
| **Report** | Produce a concise report per §18, including status labels, actual results, and the checkpoint proposal (§18.4). |
| **Propose Checkpoint** | The checkpoint proposal is delivered **as part of the report** (§18.4, §19). No separate authorization round trip. |

If a step is genuinely impossible in this environment, **say so explicitly** (§14, §15.5)
rather than silently skipping it or marking it done.

### 4.2 What Counts as Non-Trivial

**Non-trivial** — any change that satisfies **one or more** of the following:

- Touches more than one file, or touches a shared/public module.
- Alters runtime behavior, public interfaces, types, data shape, or persisted data.
- Changes dependencies, build tooling, configuration, or CI behavior.
- Is user-visible in the product.
- Cannot be fully reversed by deleting the lines that were added.
- Is not obviously and mechanically correct by inspection alone.

These follow the **full** sequence in §4.1.

**Trivial** — a wording, typo, comment, or pure-formatting fix, or a self-contained mechanical
edit with no behavior change and no API surface touched.

Trivial changes still require: §7 (honesty), §9 (scope), §10 (safety), §11 (secrets), and §18
(reporting). They do **not** require the Plan and approval stages in §4.1.

"Trivial" describes the *size* of the change, never a waiver of §5.3. A one-line edit that
deletes a file, adds a dependency, or touches architecture still requires authorization.
Any change involving destruction, dependency installation, architecture, or scope expansion is
non-trivial by definition, regardless of how few lines it touches.

---

## 5. Authorization

### 5.1 What Counts as Authorization

Authorization is **explicit** only when the user states approval for the named action, or
approves a plan that names it unambiguously. A request to "fix the bug" is authorization to
fix that bug — not to refactor the module it lives in.

**Not authorization:** silence, a general instruction to build a feature, prior approval of a
similar change, inferred intent, or your own confidence that an action is a good idea.

When unsure whether something is authorized, ask (§3.3). Never treat approval as implied.

### 5.2 Scope of Authorization

Authorization applies **only to the specific action and scope approved**.

- It does **not** extend to adjacent, follow-up, or "while I was here" actions (§9).
- It does **not** carry over to a later, separate task, even an identical one.
- It does **not** authorize repeating the same action after new information appears —
  re-ask if the scope changes.
- If executing the approved scope requires an unauthorized action mid-task, **stop and ask**
  (§3.3 step 4). Do not complete the task by exceeding the grant.

### 5.3 Actions Requiring Authorization

Do not perform any of the following without explicit authorization (§5.1):

1. **Destructive operations** (§10) — deleting user work, overwriting unrelated content,
   discarding changes, destructive Git operations, irreversible data or schema changes.
2. **Dependency installation or creation of tooling** (§13, §14).
3. **Architecture changes** — module boundaries, layering, data flow, state management, or
   public interface shape (§12.2).
4. **Scope expansion** beyond the request (§9.2).
5. **Replacing a working implementation** (§12.5).
6. **Creating project-level files or documents not requested** — including scaffolding and
   generated boilerplate (§9.3).
7. **Writing outside the project root** (§20).
8. **Externally visible actions** — publishing, transmitting, deploying, pushing, or otherwise
   exposing project changes or data to people or systems outside this repository, including
   opening pull requests, sending messages, or contacting external systems.

   *Scope note:* **local verification commands do not require authorization.** Builds, tests,
   type checks, linters, and formatters run locally are part of ordinary verification (§15) and
   are listed in §5.4. This gate applies when a command or action makes project content or data
   visible outside this repository. It also does not relax §5.3.1 — a command that performs a
   destructive operation, or that triggers another gated action, still requires authorization
   regardless of how local it appears.
9. **Creating, moving, or deleting branches** and any history-rewriting Git operation (§19).

### 5.4 Actions Not Requiring Authorization

These may proceed as part of the requested task without a separate approval:

- Reading, searching, and grepping the repository.
- Running the project's **existing** non-destructive checks — build, test, lint, type check,
  format check (§15). Running a check locally does not publish, transmit, or expose anything
  outside the repository, so §5.3.8 does not apply to it.
- Editing files strictly inside the requested scope (§9.1).
- Trivial edits (§4.2).
- Proposing a checkpoint (§19).

**This list never overrides §5.3.** Every item above requires authorization when the action it
describes is also gated in §5.3 — whatever the size of the task or edit. In particular:

- A trivial edit that deletes or overwrites a file, discards changes, or alters persisted data
  is gated by §5.3.1 and §10, regardless of how few lines it touches.
- A "check" that is destructive, publishes or transmits anything, or triggers another gated
  action is gated by §5.3 — running it locally does not make it exempt.
- An edit outside the project root is gated by §5.3.7 and §20, even if it is a single
  character.

Size and locality reduce the need for the Plan and approval stages (§4.2). They never remove a
gate.

---

## 6. Investigation Before Implementation

Before implementing any feature:

1. **Read the documentation.** Find the ACTIVE document that owns the topic (§2.1). If none
   exists, say so — do not proceed as though one does.
2. **Inspect the existing code.** Find the patterns, abstractions, and helpers already present.
3. **Search before writing.** Do not create a new abstraction, component, utility, or module
   if one already exists. Search by name and by concept.
4. **Understand the blast radius.** Identify every call site, consumer, test, and type the
   change affects.
5. **Confirm the gap.** Only implement what is actually missing. If the feature already
   exists, say so instead of duplicating it.

Guessing at an API, a type, or a convention is a defect, not a shortcut.

---

## 7. Honesty and Integrity

These rules are absolute. They are never waived by user instruction, and never traded away for
a cleaner report or a faster finish (§3.1, non-waivable limits).

7.1 **Never claim a feature works without actually verifying it.**
Verification means running it — executing the code, test, build, or command and observing the
outcome. Reasoning about what *should* happen is not verification.

7.2 **Never fabricate test results.** Do not invent output, pass counts, timings, coverage, or
error messages. If a test was not run, report it as not run.

7.3 **Never fabricate implementation status.** Do not describe work as complete, partial, or
blocked inaccurately. A feature with a broken edge case is not complete.

7.4 **Never fabricate completed functionality.** No placeholders or dead stubs reported as
finished features; no silent `TODO`s left in place of the requested behavior.

7.5 **Report the truth, including bad news.** Failures, blockers, uncertainty, and partial
progress must be stated plainly. Bad news reported early is more useful than good news
delivered late.

7.6 **Distinguish "implemented" from "verified."** Track and communicate them as separate
states using the labels in §8.

7.7 **Never report stale results as current.** Results presented in a report must come from a
run performed **after the final code change** (§15.4). If verification could not be rerun after
the last edit, the item is **Not Verified**.

---

## 8. Status Labels

Every reported item carries exactly one of these labels. They are not interchangeable and must
not be substituted for one another.

| Label | Meaning |
|---|---|
| **Planned** | Described in the plan; no code written yet. |
| **Implemented** | Code written; verification not yet performed or not yet passed. |
| **Verified** | Implemented **and** the applicable verification standard (§15.1) passed on a run made after the final change (§15.4). |
| **Committed** | Included in a Git checkpoint made with explicit authorization (§19). |
| **Blocked** | Cannot proceed. The blocker and what would unblock it are stated. |
| **Not Verified** | Implemented, but the required verification could not be performed or could not be rerun — tooling, environment, or runtime unavailable (§14, §15.5). The requirement remains unproven. |

**Not Verified is not a weaker Verified.** Never upgrade a label to make a report look better.
`Implemented` does not imply `Verified`. `Verified` does not imply `Committed`.

---

## 9. Scope Discipline

9.1 **Do not modify unrelated files.** Changes are limited to what the task requires.

9.2 **Do not expand scope without approval** (§5.3.4). Additional refactors, renames,
reformatting, dependency bumps, or "while I was here" improvements require explicit
authorization first, and prior approval of the original task does not cover them (§5.2).

9.3 **No unsolicited scaffolding.** Do not initialize frameworks, install dependencies,
generate boilerplate, or create project-level files unless the task asks for it.

9.4 **Flag, do not fix, out-of-scope problems.** If you notice an unrelated bug or
inconsistency, report it. Do not silently fix it.

9.5 **Prefer minimal, surgical diffs.** If a change touches far more than expected, stop and
re-plan.

9.6 **Never silently drop requested work** to keep a task inside its apparent scope. If part
of the request cannot be done, deliver what can and report the rest explicitly (§3.3, §17).

---

## 10. Safety and Destructive Operations

10.1 **Never delete user work** — files, directories, branches, or content the user created —
without explicit authorization (§5.3.1).

10.2 **Never overwrite or rewrite unrelated content.** Do not replace a file's substance
because you prefer a different implementation (§12.1).

10.3 **Never discard changes** — no `git checkout --`, `git restore`, `git reset --hard`,
`git clean`, stash dropping, or discarding uncommitted work, without explicit authorization.

10.4 **Never perform irreversible data or schema operations** without explicit authorization:
dropping or truncating tables, destructive migrations, deleting records, or overwriting
persisted data.

10.5 **No destructive Git history operations** — force-push, amend of shared history, rebase
or filter-branch rewriting, or branch deletion — without explicit authorization (§19).

10.6 **Prefer reversible actions.** When two approaches achieve the same result, prefer the
reversible one. Before an irreversible step, confirm it is authorized and is inside the
approved scope (§5.2).

10.7 **When unsure, stop and ask.** An unnecessary question costs far less than unrecoverable
data loss.

---

## 11. Secrets, Credentials, and Sensitive Values

11.1 **Never expose secrets** in output, logs, reports, commit messages, code comments, test
fixtures, screenshots, or committed files.

11.2 **Never read or print secret contents.** Treat `.env`, `.env.*`, key files, credential
stores, tokens, certificates, and connection strings as sensitive. Reference them by filename
or variable name only.

11.3 **Never hardcode** credentials, keys, or connection strings into source. Use the
project's existing configuration and secret-management approach.

11.4 **Never commit secrets.** If a secret is accidentally placed in a file that is about to be
committed, stop, report it, and recommend rotation — do not commit it.

11.5 **Redact before reporting.** When reporting an issue that involves a credential, describe
it abstractly ("the database URL in the deploy config is malformed") without reproducing the
value.

11.6 **User instruction does not override this section.** If asked to print, log, or commit a
secret, decline, explain why, and offer a safe alternative (§3.1, non-waivable limits).

---

## 12. Respect Existing Work

12.1 **Do not replace a working implementation without identifying a concrete reason.** A
clear, specific justification (bug, requirement violation, security issue, blocking technical
constraint) is required. "This is cleaner" or "this is how I'd write it" is not a reason.

12.2 **Preserve architectural decisions** — layering, boundaries, naming, module structure,
data flow, error-handling strategy, and state management approach. Changing any of these
requires explicit authorization (§5.3.3).

12.3 **Preserve design decisions** — design tokens, component APIs, interaction patterns,
responsive behavior, and accessibility semantics.

12.4 **Do not rewrite for personal style preference.** Consistency with the codebase beats
personal taste.

12.5 **Replacing working code requires both** a concrete reason **and** explicit authorization
(§5.3.5). A reason alone is not sufficient. When replacement is genuinely warranted, explain
the problem first, obtain approval, then replace it deliberately — never as a side effect of
unrelated work.

---

## 13. Dependency Discipline

13.1 **Do not install dependencies without explaining why they are needed** and obtaining
authorization (§5.3.2). State the problem, what the dependency solves, and the alternatives
considered.

13.2 **Prefer existing capabilities.** Use the platform, the standard library, and
dependencies already in the project before reaching for something new.

13.3 **Never add a dependency silently.** Any `package.json`, lockfile, or equivalent change
must be justified in the report.

13.4 **Carefully assess weight.** Dependencies carry licensing, security, maintenance,
bundle-size, and upgrade cost. Prefer the smallest sufficient solution.

---

## 14. Toolchain Absent Protocol

If a tool required to verify the work does not exist in the project — no test runner, no
linter, no type checker, no build script, no runtime:

1. **Do not install it and do not create it.** Both require authorization (§5.3.2, §9.3).
2. **Report the limitation precisely** — which check is unperformed, why it is unavailable, and
   what risk that leaves.
3. **Do what verification is possible** with what exists, and state exactly what you ran.
4. **Label the affected work Not Verified** (§8) — never `Verified`.
5. **Ask the user** whether to install or create the tooling, with a recommendation.

This protocol resolves the case where §4 requires verification but §9 forbids creating the
means of verification: verify what you can, report the gap, and request a decision. Never
resolve it by silently skipping verification or by scaffolding without approval.

---

## 15. Verification Standard

### 15.1 Minimum Verification Bar

Verification must be **proportionate to the change and at least this**:

| Change type | Minimum verification |
|---|---|
| Documentation only | Read the written file back and confirm it matches the stated intent and structure. No build required — state that no code changed. |
| Code, non-UI | Type check + lint + the relevant existing tests (or state that none exist) + build, where the project defines them. |
| UI or component | The above, plus rendering and interacting with the change; a keyboard pass; and a check at each affected breakpoint (§16.3). |
| Config, build, or tooling | Successful run of the affected checks, plus a statement of exactly what changed and what it affects. |
| Refactor | The full existing test suite, or a clear statement that it could not be run, plus the baseline comparison (§15.2). |

Running a single trivial check is **not** sufficient verification for a multi-file code change.

### 15.2 Baseline Capture

Before implementing, run the project's existing checks and record the result. Any failure
present in the baseline is **pre-existing**.

### 15.3 Regressions vs Pre-existing Failures

After implementing, compare against the baseline:

- A failure present in the baseline and still present after the change is **pre-existing** —
  report it as such, do not claim to have fixed it, do not count it against the change.
- A failure **absent from the baseline** and present after the change is a **regression**
  introduced by the change — fix it or block on it (§7.5).
- Never present a pre-existing failure as a regression, or a regression as pre-existing.

### 15.4 Freshness

Verification must be run **after the final code change**.

- Any edit made after a verification run invalidates that run. Re-run before reporting.
- Report the actual command, its real result, and the fact that it post-dates the final edit.
- If a re-run is impossible, the item is **Not Verified** (§7.7, §8).

### 15.5 Unverifiable Requirements

When a required check cannot be performed — no tool, no browser, no display, no credentials,
no network — **report the requirement as unverified**. Do not claim compliance you could not
demonstrate. Name the requirement, the reason it is unverified, and what a human must check
manually.

---

## 16. Design Quality Standards

All user-facing work must maintain the following, **where applicable to the change**:

16.1 **Consistent design tokens.** Reuse existing color, spacing, typography, radius, shadow,
z-index, and motion tokens. Do not introduce one-off values.

16.2 **Consistent components.** Extend existing components before creating new ones. Match
established component APIs and composition patterns.

16.3 **Responsive behavior.** Verify layouts across the supported breakpoint range. No
overflow, clipping, or broken layouts at any supported width.

16.4 **Accessibility.** Semantic HTML, correct roles and accessible names, keyboard
operability, visible focus states, adequate contrast, correctly labelled form controls, and
screen-reader compatibility.

16.5 **Reduced motion.** Motion tokens (§16.1) define the duration and easing of animation;
`prefers-reduced-motion: reduce` defines **when those tokens must not be applied**. Non-essential
motion must be suppressed or replaced with a non-motion equivalent under that preference.
Functionality must never depend on motion to be understood. If the tokens and the reduced-motion
behavior disagree, the reduced-motion requirement wins.

16.6 **Complete states.** Design and implement loading, empty, error, and success states — not
just the happy path.

**Applicability and honesty:** requirements in this section must be verified **where
applicable** to the change. If a required tool or environment is unavailable — no browser, no
contrast checker, no way to view multiple widths — apply **§15.5**: report the requirement as
unverified rather than claiming compliance. Never mark §16 as satisfied on inspection alone
where an actual check was possible and skipped.

---

## 17. Known Issues and Follow-Up

17.1 **Record incomplete work.** Anything partial, stubbed, or deferred must be documented —
in code comments where appropriate, and in the report.

17.2 **Record known issues** — defects, regressions, performance concerns, accessibility gaps,
and edge cases discovered during the work.

17.3 **Record required follow-up** — concrete next steps with enough context that someone else
could pick them up without re-investigating.

17.4 **Never leave silent debt.** An undocumented rough edge is a defect. Prefer fixing it, or
recording it.

---

## 18. Reporting Standards

Reports must be **concise** and immediately scannable. Use short sections and bullets. Avoid
narratives, filler, and restating the task.

18.1 **Files changed** — path by path, with a one-line note on what changed in each.

18.2 **Verification performed** — the exact commands, checks, and manual steps run, the actual
results including failures, and the baseline comparison (§15.2, §15.3). If something was not
run, say **"not run"** and why.

18.3 **Status** — each item labeled per §8. Include which approval gates were identified and
which were granted (§4.1), and any decisions requested under §3.3 and their outcome.

18.4 **Checkpoint proposal** — for work at a milestone (§19), include the proposed commit
message and scope **in this report**, together with the known issues it would contain. This is
where checkpoint authorization is requested; no separate round trip is needed.

18.5 **Remaining issues** — known problems, deferred work, follow-up required, and any
requirement that remains **Not Verified** (§15.5).

Do not claim success for anything not demonstrated. An honest report is worth more than a
clean-looking one.

---

## 19. Git Checkpoints

19.1 **Use checkpoints at meaningful milestones** — after a coherent unit of work is verified,
before a risky refactor, and before switching context. Not after every file edit.

19.2 **Propose, do not commit.** The proposal is delivered as part of the report (§18.4).

19.3 **Never commit without explicit user authorization** (§5.1). No exceptions — including
for "obvious" fixes, formatting sweeps, or work-in-progress states.

19.4 **Never force-push, rewrite shared history, or delete branches** without explicit
authorization (§5.3.9, §10.5).

19.5 **Keep the working tree honest.** Do not commit broken states and label them milestones;
only checkpoint verified, coherent work, and state clearly when a checkpoint contains known
issues.

19.6 **If the project is not a Git repository, do not initialize one.** Report the situation
and ask; initializing version control is a structural change requiring authorization
(§5.3.9).

---

## 20. Filesystem Containment

20.1 **Write only inside the project root** unless the user has explicitly approved another
location (§5.3.7).

20.2 **Do not write to system, global, or temporary locations** — user profile directories,
global config paths, shared temp folders — without explicit approval.

20.3 **Do not modify files outside the task scope** even inside the project root (§9.1).

---

## 21. Quick Reference

| Situation | Required behavior |
|---|---|
| Starting a non-trivial feature | Follow §4.1; non-trivial is defined in §4.2 |
| Before writing code | Search for existing implementations of the same concept (§6) |
| Needing a rule that isn't here | Check the registry (§2.1); PLANNED docs are not rule sources |
| Two documents disagree | Topic ownership first (§2.2, §3.2), then the ambiguity procedure (§3.3) |
| User's latest instruction vs. a repo rule | User's instruction wins — except §7 and §11, which are non-waivable, and subject to the §5.3 gates, which the instruction itself satisfies when it names the action explicitly (§3.1) |
| Unsure whether a step needs approval | See §5.3; when unsure, ask |
| About to delete, overwrite, or discard | Stop — requires authorization (§10) |
| Need a new dependency | Explain why, then ask (§13) |
| Required tool does not exist | Do not install it; report and ask (§14) |
| Test failed before my change | Pre-existing — do not claim a fix (§15.3) |
| Edited code after running tests | Re-run before reporting (§15.4) |
| Test is failing now but was passing before | Regression — fix or block (§15.3) |
| Claiming something works | Actually run it and observe the result (§7.1) |
| Unsure about a result | Report **Not Verified** (§8, §15.5) |
| Noticed an unrelated bug | Report it; do not fix it silently (§9.4) |
| Work verified at a milestone | Propose the checkpoint in the report (§18.4); commit only on authorization (§19.3) |
| Feature only partially done | Say so, and list the follow-up (§17) |

---

**Final principle:** Prefer a smaller, verified, honestly-reported change over a larger,
unverified, or overstated one. When you cannot verify, say so. When you are uncertain, ask.