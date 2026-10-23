# project-state

## Purpose

Produce one normalized, read-only snapshot of current authoritative project state for
a registered project or repository, with optional issue or pull-request focus. Every
consumer derives status from this single procedure instead of reconstructing it
independently.

This skill reports state. It does not decide scope, approve a gate, change workflow
state or perform work.

## Inputs

Required:

- `repository` — `owner/name` of a registered repository.
- `engineering_system_version` — the exact pin read from the project
  `.ai/project.yml`. A missing or mutable pin stops the procedure.

Optional:

- `issue_number` — the issue to treat as the focus of the snapshot.
- `pull_request_number` — an explicit linked pull request when the issue link is
  ambiguous.
- `observed_at` — caller-supplied observation timestamp for deterministic runs.

Inputs are validated before any source is read. Chat context, local working-tree
state and prior snapshots are never inputs to authority; they may only be reported as
non-authoritative evidence.

## Authoritative sources

Read in this precedence order. Earlier sources win when evidence disagrees, and any
disagreement is recorded rather than resolved silently:

1. project `.ai/project.yml` and the registered project metadata — pin, phase,
   `paused`, owner-set lifecycle;
2. `AGENTS.md` — local agent instructions;
3. `docs/spec.md` — product truth and requirement references;
4. applicable `docs/adr/*` with `Status: Accepted`;
5. the active GitHub issue, its labels and its dependency/ADR declarations;
6. the linked pull request, its current head SHA and merge state;
7. independent review state and recorded findings;
8. CI/check runs for that head SHA;
9. GitHub Project workflow state as defined by `.ai/workflow.json`;
10. release/deploy evidence where deployment applies.

GitHub and committed repository truth override chat transcripts, local caches and
model inference. Local dependency and workflow caches are audit data only. See
`playbook/ENGINEERING_PLAYBOOK.md` section 2 and ADR-0009 for the authority rules
this skill applies.

## Procedure

1. Validate the inputs and resolve the engineering-system pin. Stop if the pin is
   missing, mutable or does not match `skills/registry.json`.
2. Refresh every applicable source immediately before building the snapshot. A
   snapshot is never produced from a previous read.
3. Normalize project identity: repository, pinned `engineering_system_version`,
   `phase` from `.ai/project.yml`, and `lifecycle_state`. `maintenance` and
   `archived` are set only from explicit owner evidence; without that evidence the
   lifecycle is `active`, `paused` or `unknown`. Project completion is never inferred
   from an absent backlog, a quiet board or merged pull requests.
4. Normalize active work: issue number, title, purpose, workflow status and detailed
   transition, and the implementation owner when authoritative state determines it. The
   status and transition must describe the same position under the `.ai/workflow.json`
   `transitionStatus` mapping; a snapshot whose two fields disagree is incoherent and is
   rejected rather than resolved.
   Use the `.ai/workflow.json` status vocabulary — `Backlog`, `Ready`, `Building`,
   `Review`, `PM Gate`, `Deploying`, `Done`, `Blocked` — and the detailed transition
   names `planned`, `ready-for-build`, `building`, `ready-for-review`,
   `changes-requested`, `ready-for-pm`, `mergeable`, `deploying`, `done` and
   `blocked`.
5. Normalize the linked pull request: number, current head SHA, state, merge state
   and check summary. Report `null` with a recorded source when no pull request
   exists.
6. Normalize review state and unresolved findings using the playbook severities
   `blocking`, `should-fix`, `suggestion` and `out-of-scope`. Only `blocking` and
   `should-fix` count as unresolved review blockers.
7. Normalize CI/check status for the current head SHA, including per-check entries.
   An unread or unavailable check set is `unknown`, never `passing`.
8. Copy dependency evidence from the dependency gate defined by ADR-0009 and
   implemented in Issue #45. The `DependencyEvaluation` fields `action`, `state`,
   `eligible`, `blockerIds`, `reasonCodes`, `blockers[].{id,reasonCode,detail,
   routeToPm,escalation}`, `snapshotId` and `observedAt` are reported as received.
   This skill does not re-derive, re-order or reinterpret them.

   A #45 evaluation is scoped to exactly one protected action — `ready`, `claim`,
   `building` or `dispatch` — so `eligible` is evidence **only** for the recorded
   `action`. Publishing eligibility without its action would let a consumer reuse a
   `ready` result as `dispatch` authority. A snapshot that omits `action` is invalid.

   An unblocked snapshot is **not** authority for a protected action. A consumer decides
   whether an action may proceed by asking whether the snapshot's evaluation is scoped to
   that action, is eligible, and has nothing else blocking; the published summary carries
   the evaluation's action and result so a summary-only consumer can apply the same rule.

   "Nothing else blocking" includes the authoritative stop states below: an absent,
   `Blocked`, `unknown` or internally contradictory workflow position, and an ADR
   disposition of `needs-pm-adr`, `unknown`, `adr-not-required` without its rationale, or
   `adr-existing`/`adr-required` with no applicable accepted ADR. A dependency evaluation
   never overrides them, and an invalid snapshot is never evidence at all.

   The evaluation `state` is the authority, not the `eligible` boolean. Any non-satisfied
   ADR-0009 state fails closed even if the published boolean claims eligibility;
   contradictory evidence of that kind is rejected outright rather than trusted.
9. Record the applicable specification reference and its revision evidence, and the
   ADR disposition using the ADR-0004 vocabulary `adr-not-required`, `adr-existing`,
   `adr-required` and `needs-pm-adr`, plus each applicable accepted `ADR-NNNN`.
10. Record security or protected-change flags only where authoritative evidence
    exists. Absence of evidence is reported as an empty flag set, not as safety.
11. Determine the next expected workflow state and next action from the normalized
    state, and set `owner_action_required` with a concise reason and action whenever
    the owner is the required decision maker.
12. Record freshness: the observation timestamp and one source entry per consulted
    source with its kind, locator, revision or update time, and a `fresh`, `stale`,
    `missing`, `conflicting` or `not-applicable` state.

    `not-applicable` records an evidence class that legitimately does not exist yet at
    this workflow stage — most commonly the pull request, review and check sources for
    a `Ready` item before its first implementation. Expected absence does not block the
    work item, so a `Ready`, dependency-eligible issue with no pull request stays
    dispatchable. `stale`, `missing` and `conflicting` continue to mean evidence that
    should exist could not be read confidently, and those still fail closed.

    `not-applicable` is accepted only when the absence is genuinely expected, on all
    three counts:

    - **Kind.** Only the `github-pull-request`, `github-review` and `github-checks`
      sources may ever be `not-applicable`. Every other source describes evidence that
      exists whenever the snapshot does, so marking it absent is invalid.
    - **Stage.** Only `Backlog`, `Ready` and `Building` may mark those sources
      `not-applicable`. `Building` is included because the claim moves an item from
      `Ready` to `Building` *before* the implementer opens its pull request, so an early
      `Building` snapshot genuinely has none. From `Review` onward a pull request exists
      and those sources must report real freshness. `Blocked` and `unknown` never
      qualify: neither proves a pre-implementation stage.
    - **Evidence.** The corresponding evidence must actually be absent: a
      `not-applicable` pull-request source requires `pull_request: null`; a
      `not-applicable` review source requires a `not-started`/`not-applicable` review
      status with no unresolved findings; a `not-applicable` checks source requires
      `checks.status: none` with no entries.

    `specification.state` never accepts `not-applicable` — a specification reference is
    expected whenever it is published. Both rules are enforced by the runtime validator
    and by the published schema, so a schema-only consumer reaches the same verdict.
13. Record every conflict as an explicit entry routed to `needs-pm` or `needs-owner`.
    Emit the snapshot without guessing any unresolved value.

Normalization is deterministic where sources are unambiguous: the same refreshed
evidence produces the same snapshot.

## Output contract/schema

The result validates against [`schema.json`](schema.json), a draft 2020-12 JSON
Schema with `schemaVersion` 1 and no additional properties. One representative
snapshot exists per supported case under `examples/`, starting with
[`examples/healthy-active-work.json`](examples/healthy-active-work.json).

The snapshot carries the repository identifier and pinned engineering-system version,
project phase and lifecycle state, active issue and purpose, implementation owner,
linked pull request and head SHA, review status with unresolved findings, check
status, dependency evidence, specification reference, ADR disposition and applicable
ADRs, security flags, next expected workflow state and action,
`owner_action_required` with its reason and action, explicit conflicts, and freshness
sources sufficient to audit the result.

Unknown, missing, stale and conflicting evidence is represented explicitly through an
`unknown` enum value, an evidenced `null`, a non-`fresh` source state or a conflict
entry. A value is never guessed, averaged or carried forward from an earlier
observation.

## Allowed actions

- Read the authoritative sources listed above.
- Refresh those sources immediately before producing the snapshot.
- Normalize and report the evidence found.
- Return the snapshot and its freshness references to the requesting consumer.

This procedure is read-only. It performs no mutation: no issue or pull-request edit,
comment, label, review, merge, workflow-state transition, gate approval, branch
change, deployment or local state write. A consumer that needs a change requests it
through the procedure that owns that change.

## Stop/escalation conditions

Stop and return the recorded evidence without a usable snapshot when:

- the engineering-system pin is missing, mutable or does not match the registry;
- a required authoritative source cannot be refreshed;
- the requested issue or repository is not registered or does not exist.

Report the condition in the snapshot and stop downstream automation where policy
requires when:

- the dependency gate reports `eligible: false`, or any `unknown`, `circular` or
  `conflicting` state;
- issue and portfolio dependency evidence disagree, or any other source conflict is
  recorded — route to `needs-pm`;
- the ADR disposition is missing, invalid or `needs-pm-adr`;
- an unresolved `blocking` or `should-fix` review finding exists;
- required checks fail or their status is `unknown`;
- an authoritative security or protected-change flag is present;
- the project is `paused`, or its lifecycle is owner-set `maintenance` or `archived`;
- `owner_action_required` is true — route to `needs-owner` with the recorded reason
  and action.

Ambiguity is never resolved by this skill. Conflicting or missing evidence fails
closed for ChatGPT PM assessment as required by `playbook/ENGINEERING_PLAYBOOK.md`
and ADR-0005.
