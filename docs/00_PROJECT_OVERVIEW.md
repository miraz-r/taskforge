# 00 — TaskForge Project Overview

> **Status:** ACTIVE
> **Role in the documentation set:** Product identity, concept, scope boundaries, and success
> criteria. This document defines *what TaskForge is*, not how it is built.
> **Master instruction file:** `AGENTS.md` — governs all work, including this document.

This document contains no feature specifications, data models, interface contracts, or
technology choices. Feature-level detail belongs to `docs/01_PRODUCT_REQUIREMENTS.md`
(**ACTIVE**); the remaining design and technical documents do not yet exist. Anything not
settled here is recorded as `OPEN DECISION` rather than guessed.

---

## 1. Product Identity

| Field | Value |
|---|---|
| **Product name** | TaskForge |
| **Product category** | Project Management SaaS |
| **Product type** | Professional, production-grade commercial web application |

**Vision.** TaskForge gives teams a single, dependable place to see what is being worked on,
who owns it, and whether it is on track — so project status is understood at a glance instead
of assembled from scattered conversations and spreadsheets.

**Core purpose.** To let a team organize projects and tasks, assign responsibility, track
progress, and understand project health through one focused workspace.

---

## 2. Product Concept

TaskForge is a unified workspace for organizing **projects, tasks, teams, and progress**.

It brings together four capabilities that teams otherwise stitch together across separate
tools:

1. **Project boards** — visual organization of work and its state.
2. **Task management** — discrete, assignable units of work with clear ownership and status.
3. **Team collaboration** — shared awareness of what changed and who is responsible.
4. **Project insights** — an accurate view of status, workload, and progress.

The combination is deliberately focused. TaskForge is not intended to be an all-purpose
collaboration suite; it is a project and task workspace that does its core jobs thoroughly.

**Reference posture.** The category is well established, and TaskForge draws on proven
interaction ideas from successful productivity products. It takes **no** branding, visual
assets, proprietary designs, or copied interface assets from any existing product. Interaction
patterns may be informed by category convention; identity and expression are original.

---

## 3. Target Users

| Audience | Primary need |
|---|---|
| **Small teams** | Lightweight coordination without administrative overhead |
| **Startups** | Fast setup, visible progress, and shared context as the team grows |
| **Software development teams** | Structured work tracking from planning through delivery |
| **Individual users** | Managing personal projects with the same tools a team would use |

These audiences shape product priorities. A design that serves one of them at the cost of
clarity for the others is out of alignment with the product concept in §2.

---

## 4. Core Product Principles

These are enduring product qualities. They are not tied to any particular feature, and they
constrain how features are designed and built.

1. **Clarity over clutter.** Every element must earn its place. Reduce, remove, or simplify
   before adding. A dense interface is a failure, not a feature.
2. **Functional simplicity.** Prefer the obvious path over the configurable one. Depth where
   it matters; not complexity for its own sake.
3. **Professional visual quality.** The product should look deliberate, considered, and
   trustworthy — not experimental or playful at a user's expense.
4. **Consistent user experience.** The same concept behaves the same way everywhere it
   appears. Consistency outranks local optimization.
5. **Reliable interactions.** Actions must respond predictably, preserve user input, and never
   leave a user uncertain about whether something happened.
6. **Responsive design.** The interface remains usable across the supported screen sizes
   (see `OPEN DECISION` D-02).
7. **Accessibility.** The product is usable by people with a wide range of abilities and
   assistive technologies. Accessibility is a requirement of the product, not an enhancement.
8. **Performance-conscious animation.** Motion serves comprehension — it is never decoration
   for its own sake, never blocks interaction, and never becomes a cost to the user.

Detailed expression of these principles — tokens, components, interaction specifications — is
not defined here and remains `OPEN DECISION` until a design document exists.

---

## 5. High-Level Product Areas

These are the **conceptual areas** the product is organized around. They describe the product's
shape and vocabulary.

**All ten areas remain part of TaskForge's intended product scope.** No advanced feature is
permanently excluded from the product. Inclusion here does **not** by itself confirm that an
area is functionally complete at the initial implementation milestone — see §6.1 for the
initial target and §6.2 for how a feature's delivery state is expressed.

1. **Authentication and user accounts** — identity, sign-in, sign-out, and account lifecycle.
2. **Workspaces and teams** — the organizational container for people and their work.
3. **Project management** — projects as first-class entities with their own lifecycle.
4. **Task management** — tasks, their properties, ownership, status, and dates.
5. **Kanban board** — a visual, column-based view of work in progress.
6. **List and timeline views** — alternative presentations of the same underlying work.
7. **Collaboration and activity** — how work is assigned, discussed, and tracked over time.
8. **Dashboard and analytics** — summaries and indicators of project status.
9. **Notifications** — awareness of events a user needs to know about.
10. **User and workspace settings** — configuration of personal preferences and workspace
    behavior.

**Product scope is confirmed; delivery timing is not.** The intended scope of the product
(§2, §5) is settled. What is not settled is which features are functionally complete at the
initial milestone — a delivery question, not a scope question.

---

## 6. Product Boundaries

### 6.1 Initial implementation target

- **Initial implementation target:** a **working application developed within a 3-day project
  window**. This is a **development target, not a guarantee of production readiness.**
- **The 3-day target applies to the initial implementation milestone only.** It does **not**
  imply that every advanced feature will be fully functional within that period.
- **Long-term scope is unchanged.** All areas in §5 remain part of the intended product. An
  advanced feature deferred at the initial milestone is **deferred, not removed.**
- **No claim of production readiness** may be made without the verification appropriate to it
  (`AGENTS.md` §15). Completing the milestone is not itself evidence of production readiness.

The distinction the product draws is between what TaskForge is **for** (§2, §5) and what is
**functionally complete at the initial milestone**. Advanced capability is represented honestly
through Coming Soon states (§6.3) rather than omitted or faked.

### 6.2 Product scope versus delivery state

- **Product scope** — whether a capability belongs to TaskForge at all. **Confirmed:** every
  area in §5 belongs. Nothing is excluded.
- **Delivery state** — how far a capability has progressed toward working functionality.
  Governed by §6.3.
- **Neither concept implies the other.** Being in scope does not make a feature functional;
  not being functional does not remove a feature from scope.

### 6.3 Feature delivery states

Every feature occupies exactly one of three delivery states. These are product-level
definitions; assigning individual features to a state belongs to
`docs/01_PRODUCT_REQUIREMENTS.md` (**ACTIVE**), which performs that assignment in its §6.4.

| State | Meaning |
|---|---|
| **Working** | Implemented **and functionally verified** — the behavior has been exercised and confirmed, not merely written. |
| **Coming Soon** | Intentionally represented in the interface, with full functionality **deferred**. The capability is acknowledged and visible; it is not yet functional. |
| **Planned** | Not yet implemented and **not represented** in the current interface. |

**Honesty requirement.** A Coming Soon feature must carry an honest, visible status indicator.
A control that looks operable but does nothing is a defect, not a Coming Soon state.
Decorative controls that falsely imply working functionality are prohibited. Where a feature is
Planned, it is not shown as though it were available.

### 6.4 Implementation strategy

1. **Coherence over demonstration.** Prioritize a coherent, usable application over isolated
   feature demonstrations. The result should work as a whole, not as a set of impressive
   fragments.
2. **Foundations first.** Implement foundational functionality first, then build outward from
   what works.
3. **Deliberate deferral.** Represent advanced functionality through deliberate Coming Soon
   states (§6.3) where necessary — never through implied or misleading availability.
4. **Vision preserved.** Deferral does not remove an advanced feature from the long-term
   product vision (§5, §6.2).
5. **No unearned readiness claims.** Production readiness is not claimed without appropriate
   verification (`AGENTS.md` §15).

### 6.5 Out of scope for this document

The following are **deliberately absent** and must not be inferred from anything written here:

- Detailed feature requirements, acceptance criteria, or user stories.
- The assignment of individual features to Working, Coming Soon, or Planned (§6.3 defines the
  states; it does not classify features).
- Per-feature scheduling within the 3-day window (§6.1 sets the window, not the plan).
- Database schemas, entity models, or field definitions.
- API contracts, endpoint definitions, or data formats.
- Technology, framework, language, hosting, or tooling decisions.
- Design tokens, component specifications, or interaction details.
- Pricing, packaging, or commercial terms.

Making any of these decisions here would be unsupported. Each requires its own document and,
for technical and design decisions, separate authorization.

### 6.6 Open decisions

Unsettled matters are recorded rather than guessed. Each entry names the question, its
consequence, and what it depends on.

| ID | Open decision | Consequence if unresolved | Depends on |
|---|---|---|---|
| **D-02** | Supported screen sizes and breakpoint range | Responsive behavior (§4.6) cannot be specified | Design decision |
| **D-04** | Notification delivery channels and scope | §5.9 cannot move beyond a concept | Product decision |
| **D-05** | Depth and metric set of dashboard and analytics | §5.8 cannot be specified | Product decision |
| **D-06** | Supported browsers and minimum versions | Verification targets are undefined | Technical decision |
| **D-07** | Delivery state of timeline view — Working or Coming Soon at the initial milestone | §5.6 representation is undefined | Bounded by the initial milestone scope already established in §6.1 |
| **D-08** | Data retention and export expectations | Affects future data and architecture work | Product + architecture decision |

**This table is not the complete register.** `docs/01_PRODUCT_REQUIREMENTS.md` (**ACTIVE**) is
authoritative for the full set of open decisions and additionally carries D-12, D-14, D-15, D-16,
D-17, and D-18, which originate at requirements level and are not restated here. Where this table
and that document differ on any decision, the requirements document governs.

An `OPEN DECISION` is not a blocker for conceptual work in this document. It **is** a blocker
for the specification work that follows.

---

## 7. Product Success Criteria

The product succeeds when:

1. **Users can understand their project status** without reconstructing it from outside the
   product.
2. **Users can organize and update work reliably** — actions take effect predictably, and
   state is never silently lost or ambiguous.
3. **Teams can identify responsibilities and deadlines** — who owns what, and by when, is
   legible at a glance.
4. **The interface remains usable across supported screen sizes** (see `OPEN DECISION` D-02)
   without broken, clipped, or degraded layouts.
5. **The product maintains consistent visual and interaction patterns** — the same concept
   looks and behaves the same way everywhere it appears.

These criteria describe outcomes, not measurements. No metric, threshold, or analytics
instrumentation is defined here.

**Current state:** no application exists yet. None of these criteria is satisfied at present,
and none may be reported as satisfied without the verification described in `AGENTS.md` §15.

---

## 8. Document Relationships

### 8.1 Governing authority

`AGENTS.md` is the **master instruction file** for TaskForge. It defines the workflow, scope
discipline, safety rules, authorization gates, verification requirements, and reporting
standards for all work, including this document. It takes precedence over this document on
every matter it covers.

This document is subordinate to `AGENTS.md` and does not modify, relax, or reinterpret it.

### 8.2 What this document owns

- Product identity, vision, and concept.
- Target audiences.
- Core product principles.
- High-level product areas.
- Product scope, the initial implementation target, delivery states, and implementation
  strategy.
- Product boundaries and open decisions.
- Product-level success criteria.

### 8.3 Related documents

The following areas are **not** covered here. Each has its own document. Status below matches
the authoritative registry in `AGENTS.md` §2.1. A **PLANNED** document does not exist and must
not be cited as an authority; an **ACTIVE** document may be cited for its own topic.

An **ACTIVE** status means the document exists and is authoritative for its topic. It does **not**
mean the behaviour it describes has been built. `docs/design-system.md` is **ACTIVE and specified
but not implemented**: its design-system specifications are documented, while application
implementation and runtime behaviour have **not** been verified.

| Area | Document | Expected content | Status |
|---|---|---|---|
| Product requirements | `docs/01_PRODUCT_REQUIREMENTS.md` | Features, scope, acceptance criteria, delivery-state assignment | **ACTIVE** |
| Design system | `docs/design-system.md` | Tokens, components, interaction and accessibility patterns | **ACTIVE** — specified, not implemented |
| Architecture | `docs/architecture.md` | System structure, module boundaries, data flow, trust boundaries | **ACTIVE** |
| Technical implementation | `docs/api.md` | Endpoint contracts, request/response schemas, error formats | **ACTIVE** |
| Testing | `docs/testing.md` | Test strategy, required checks, CI expectations | PLANNED — does not exist |
| Operations | `docs/operations.md` | Deployment, observability, runbooks | PLANNED — does not exist |

The authoritative registry of all project documents, including their status, is maintained in
`AGENTS.md` §2.1. A document that exists but is absent from that registry has no authority.

### 8.4 Relationship to future documents

When a future document is created, it governs its own topic and does not override this
document's product-level statements — nor does this document grant it authority over topics
it does not own. Where a future document and this one appear to disagree on a product question,
that is a defect to report, not a licence to decide unilaterally.

`docs/01_PRODUCT_REQUIREMENTS.md` (**ACTIVE**) is the existing case of this relationship: it
governs requirements detail — journeys, functional and non-functional requirements, delivery
states, priorities, and acceptance criteria — while the product-level decisions in §1–§7 of this
document remain upstream and are implemented rather than reopened by it.

---

## Open Decision Summary

Consolidated for convenience; §6.6 is authoritative for the decisions listed here.

Open at this document's level — **6**:

- **D-02** — Supported screen sizes and breakpoint range
- **D-04** — Notification delivery channels and scope
- **D-05** — Dashboard and analytics depth
- **D-06** — Supported browsers and minimum versions
- **D-07** — Delivery state of timeline view at the initial milestone
- **D-08** — Data retention and export expectations

Open at the requirements level and carried in `docs/01_PRODUCT_REQUIREMENTS.md` §11.2 — **6**:
D-12, D-14, D-15, D-16, D-17, D-18. See that document for the authoritative register.

## Resolved Decisions

Recorded so a settled question is not reopened. Identifiers are retained for traceability and
are not reused.

| ID | Decision | Recorded in |
|---|---|---|
| **D-01** | **RESOLVED.** All ten product areas in §5 remain in TaskForge's intended product scope; no advanced feature is permanently excluded. The initial implementation target is a working application within a 3-day development window — a target, not a guarantee of production readiness. What remains open is per-feature delivery state, not scope. | §5, §6.1, §6.2 |
| **D-03** | **RESOLVED.** Role-based permissions are **deferred for the initial milestone**: there is no role-permission system, and role administration surfaces are Coming Soon. **Workspace membership scoping is mandatory and is not deferred** — every read and every write verifies workspace membership at the time of the request. **Hiding or disabling a control is not enforcement** and must never be reported as access control. Project operations are not role-gated. **Reopen condition:** D-03 must be reopened before invitations or multi-member collaboration are implemented. | `docs/01_PRODUCT_REQUIREMENTS.md` §3.2, §5.13, §8.9 (`NFR-SEC-010`), §11.5 |

---

**Final principle:** A smaller, verified, honestly-reported change over a larger, unverified,
or overstated one. When something cannot be verified, say so. When something is undecided,
say so. When it matters and is unknown, ask.