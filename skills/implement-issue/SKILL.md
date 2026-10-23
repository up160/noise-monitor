# implement-issue

## Purpose

Deliver exactly one bounded GitHub work item from a validated `prepare-task` packet, and
hand the result to an independent reviewer.

This skill implements. It does not plan, decide scope, resolve architecture, review its
own output or approve anything. The packet is the job; widening it is a stop condition,
not a decision.

## Inputs

Required:

- `task_packet` — the validated packet produced by the Issue #41 `prepare-task` skill,
  with `acting_job` equal to `implement-issue`. It is consumed as given. This procedure
  never rebuilds project state, re-derives requirements, re-selects scope or restates the
  dependency, ADR, permission or review rules the packet and the shared contracts already
  carry.
- `refreshed_state` — a `project-state` snapshot refreshed immediately before the first
  meaningful action, used only to detect drift since the packet was prepared.
- `attempt` — the observed delivery evidence: the issue branch, the pull request and its
  exact head SHA, acceptance-criteria evidence, the results of the packet's required
  checks, the change summary, deviations, discoveries and follow-ups.

Chat history, pasted prompts, a previous handoff and the packet's own rendered `handoff`
string are transport, never requirements. When the packet and repository truth disagree,
the procedure stops instead of reconciling them.

## Authoritative sources

In precedence order:

1. the refreshed `project-state` snapshot and its freshness, conflict and eligibility
   records;
2. the `prepare-task` packet, which carries the authoritative issue, PDR, acceptance
   criteria, allowed scope, required checks and risk flags;
3. the GitHub issue and its Product Requirements Record under the Issue #56 contract;
4. the committed `docs/spec.md` sections the packet references;
5. applicable `docs/adr/*` with `Status: Accepted`, under the
   [ADR-0004](../../docs/adr/0004-enforce-adr-disposition.md) disposition rule;
6. project and stack configuration for the allowlisted verification commands.

Global policy and accepted ADRs outrank this procedure. The packet's `handoff` is never
authoritative; the GitHub issue, PDR, committed specification and accepted ADRs are.

## Procedure

1. Validate the packet and require `acting_job` to be `implement-issue`. An invalid
   packet or another job's packet is not authority to act.
2. Refresh authoritative state immediately before the first meaningful action and refuse
   material drift: a different repository, work item or engineering-system pin, a
   workflow status that has moved to a blocked or paused state, dependency ineligibility
   for `dispatch`, a newly recorded conflict or security flag, or an ADR disposition that
   has become unresolved. Stale or missing evidence in the refreshed snapshot is itself a
   refusal; a snapshot that merely has a newer identifier is not drift.
3. Create or reuse the bounded issue branch for this work item, or an isolated worktree
   on it. A branch that does not belong to the packet's issue is out of contract.
4. Implement only the packet's explicit acceptance criteria, inside the packet's allowed
   paths. A change outside that scope is an escape, not a judgement call.
5. Stop and escalate on discovery. A newly discovered material architecture decision, a
   scope change, a security concern or a protected change stops delivery and routes to
   the named authority. Discoveries are never silently implemented, and an `adr-required`
   packet must reference an ADR the repository records as accepted.
6. Record a separate follow-up issue for every valid out-of-scope discovery. The
   follow-up is the deliverable; expanding this pull request is not.
7. Run every required check from the packet's trusted configuration and record its exact
   result. A failing check blocks delivery, and a check that was not run is never
   evidence that it passed.
8. Collect acceptance-criteria evidence. Every criterion needs concrete, locatable
   evidence; an unproven criterion blocks delivery and is never assumed satisfied.
9. Prepare the pull request under the shared PR contract, pinned to the exact head SHA,
   with the change summary, deviations stated explicitly, risks and follow-ups, and the
   ADR disposition and references.
10. Hand off to independent review. This procedure never records a review, an approval or
    a merge for its own work.

## Output contract/schema

`skills/implement-issue/schema.json` is the closed contract. A delivery returns either a
report or a refusal carrying auditable reason codes and the handling authority.

The report records the repository, issue, branch, pull request and exact head SHA, the
acceptance-criteria evidence mapping, the checks run and their results, the change
summary, deviations (explicitly `none` when there were none), risks, follow-up issues,
the ADR disposition and references, and the next expected job.

`self_review_permitted` is always `false` and `next_job` is always `review-pr`: the
implementer cannot mark its own work reviewed, approved or merged.

## Allowed actions

Within the packet's bounded scope, and subject to the orchestrator's permission policy:

- read the packet, refreshed snapshot, referenced specification sections and accepted
  ADRs;
- create or reuse the issue branch or worktree for this work item;
- edit files inside the packet's allowed paths;
- run the packet's required checks and record their results;
- commit the bounded change and push the approved issue branch;
- open or update the pull request for this work item and post implementation evidence;
- open follow-up issues for valid out-of-scope discoveries.

Not permitted: editing outside the allowed paths, changing the acceptance criteria,
resolving an architecture or owner decision, altering policy or approval authority,
reviewing or approving this work, or merging it.

## Stop/escalation conditions

Delivery stops and routes to the named authority when:

- the packet is invalid, or prepared for a different job;
- refreshed state is unreliable, conflicting, ineligible, or has materially drifted from
  the packet;
- the branch does not belong to the packet's work item;
- a change falls outside the packet's allowed paths;
- an acceptance criterion has no evidence;
- a required check failed or was not run;
- a material architecture decision, scope change, security concern or protected change is
  discovered;
- an `adr-required` work item references no accepted ADR;
- valid out-of-scope work was implemented instead of raised as a follow-up, or was raised
  as neither;
- the pull request or its exact head SHA is missing;
- review or approval of this work is claimed by the implementer.

Ambiguity is never resolved here. Each refusal carries a reason code and whether it routes
to `needs-pm` or `needs-owner`.
