# prepare-task

## Purpose

Turn refreshed authoritative project state plus one authoritative GitHub work item into a
bounded, validated task packet for an acting agent. Every acting job consumes this one
procedure instead of independently rebuilding task context.

This skill prepares work. It does not implement, review, decide scope or change workflow
state.

## Inputs

Required:

- `project-state` — the refreshed snapshot produced by the Issue #40 skill. It is
  consumed as given; this skill never re-derives project state.
- `work_item` — the authoritative GitHub issue and its Product Requirements Record,
  produced or updated through the Issue #56 planning contract, and read from the live issue
  body by the canonical GitHub-PDR reader. The reader is deterministic and model-free, and
  its output is derived transport: the issue remains the record. A caller-authored packet,
  PDR or snapshot file is never accepted in its place — a job that supplies its own
  requirements is authorising itself.
- `acting_job` — `implement-issue` or `review-pr`.
- `implementer` and `reviewer` — the acting role and the independent reviewing role.
- `required_checks` — the project's verification commands, resolved from the versioned stack
  command rules before the packet is emitted. They are configuration held by the process that
  owns the permission policy, not a parameter of the call: a check that is not a plain command,
  or that matches no versioned rule, blocks the run rather than travelling in a packet the
  broker would refuse to grant.

The packet's `allowed_paths` are **derived here** and are never supplied by the calling job.
ADR-0011 makes them the job's writable roots, so a job that could name them would be choosing
what it may write. They come from the work item's own `Writable paths` section — a planning
decision, recorded in the authoritative issue — intersected with the project's versioned
readable roots, so a record can narrow a job's write scope and can never widen it past the
reviewed policy. `spec_references` is context to read and never contributes write authority.
An implementation run left with no writable scope is refused as `writable-scope-undeclared`
rather than dispatched to gate on its first edit; review declares none and needs none.

Chat history, pasted prompts and previously generated handoffs are never authoritative
inputs. If the issue/PDR is missing, or materially conflicts with the canonical
specification or ADR state, the procedure stops rather than reconstructing requirements
from conversation.

## Authoritative sources

In precedence order:

1. the refreshed `project-state` snapshot, including its freshness and conflict records;
2. the GitHub issue and its PDR under the Issue #56 contract;
3. the committed `docs/spec.md` sections the work item references;
4. applicable `docs/adr/*` with `Status: Accepted`;
5. project configuration and stack profile for allowlisted verification commands.

GitHub and committed repository truth override chat transcripts, local caches and model
inference.

## Procedure

1. Require a refreshed `project-state` snapshot and validate it. An invalid snapshot is
   not evidence and stops preparation.
2. Refuse to proceed on unreliable or conflicting state: any non-fresh source or recorded
   conflict fails closed.
3. Require the snapshot to be eligible for the protected action the job needs, using the
   shared action-scoped gate. Both acting jobs are agent dispatches, so both require
   `dispatch`-scoped dependency evidence: `dispatch` is evaluated immediately before a
   worker is invoked, and launching the independent reviewer is such an invocation.
   `building` is the protected transition into the Building state and is never authority
   to launch a reviewer. An eligibility result for another action is never reused.
4. Require an authoritative work item. A missing PDR stops the procedure; an invalid or
   not-ready PDR stops it with the underlying validation reasons.
5. Require the PDR to target the same issue the snapshot reports.
6. Require explicit acceptance criteria. Materially absent criteria stop the procedure;
   they are never invented.
7. Verify the ADR disposition against repository truth. `needs-pm-adr` stops for
   architecture assessment. An `adr-required` decision proceeds only when the refreshed
   snapshot records one of the ADRs the work item names among the applicable accepted
   decisions; a citation the work item supplies for itself is not approval, so an
   unaccepted required decision stops for the PM gate.
8. Detect protected, security, cost, scope and owner-decision triggers. An outstanding
   owner decision or an unapproved protected change stops before any agent is dispatched.
   Owner decisions the work item records as already settled are binding context, not
   blockers: they travel in the packet and are never re-opened by the acting agent.
9. Enforce reviewer independence: the implementer may never be the reviewer. Review
   preparation additionally requires a pull request to review.
10. Select the minimum applicable context. Allowed paths come from the work item's own
    `Writable paths` declaration, intersected with the project's versioned readable roots;
    they are repository-relative and capped. The packet never dumps the repository or the
    whole documentation set, and an implementation run with no writable scope is refused.
11. Emit the bounded packet with explicit exclusions, required checks, the next gate and
    its stop conditions.

## Output contract/schema

`skills/prepare-task/schema.json` is the closed contract. A preparation returns either a
packet or a refusal carrying auditable reason codes and the handling authority.

The packet records project and work-item identifiers, source freshness, the skill and
pinned engineering-system version, the acting job, implementer and reviewer, the
objective, acceptance criteria, settled owner decisions, applicable PDR/spec/ADR
references, allowed scope with
explicit out-of-scope and protected areas, required checks, the reviewer or next-gate
expectation, risk and protected-change flags, stop conditions, and a rendered handoff.

The rendered handoff is transport only. `handoff_is_authoritative` is always `false`: the
GitHub issue/PDR, committed specification and accepted ADRs remain authoritative, and an
adapter may re-render the handoff without changing procedure semantics.

## Allowed actions

This procedure is read-only with respect to project state. It performs no mutation of
GitHub, the workflow board or the repository.

- Read the refreshed snapshot, work item, specification and ADR references it is given.
- Evaluate the packet's preconditions against those authoritative records.
- Select a bounded subset of repository-relative paths already declared as relevant.
- Return the packet or a refusal with reason codes to the requesting consumer.

## Stop/escalation conditions

Preparation stops and routes to the named authority when:

- the snapshot is invalid, unreliable, conflicting or ineligible for the required action;
- no active work item is recorded;
- the authoritative PDR is missing, invalid, not ready, or targets a different issue;
- acceptance criteria are materially missing;
- the ADR disposition is unresolved, or a required decision names no ADR the repository
  records as accepted;
- an outstanding owner decision is required, or a security flag is recorded;
- a protected change has no recorded approval;
- the proposed reviewer is not independent of the implementer;
- review preparation has no pull request to review;
- an implementation run's writable scope is undeclared, or nothing it declares survives the
  project's versioned roots;
- a required check is not a plain command, or matches no versioned stack command rule.

Ambiguity is never resolved here. Each refusal carries a reason code and whether it
routes to `needs-pm` or `needs-owner`.
