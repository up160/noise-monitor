# review-pr

## Purpose

Independently review one pull request at an exact head SHA and return a normalized
result the PM gate and the capped review loop can act on.

This skill reviews. It does not implement, fix, re-plan, approve its own work or decide
whether the change merges. Its product is findings and a result, not a commit.

## Inputs

Required:

- `task_packet` — the validated packet produced by the Issue #41 `prepare-task` skill,
  with `acting_job` equal to `review-pr`. It carries the authoritative issue, PDR,
  acceptance criteria, allowed scope, required checks and ADR disposition. It is consumed
  as given: this procedure never builds a second project-state model, re-derives
  requirements or rediscovers the repository.
- `refreshed_state` — a `project-state` snapshot refreshed immediately before the review,
  supplying the current pull request, its head SHA, its check and review evidence.
- `review` — the observed review: the pull request and the exact head SHA actually
  inspected, the findings, the undocumented material decisions detected, and whether any
  fix was applied during the job.

Chat history, an earlier review, the implementer's own summary and the packet's rendered
`handoff` are transport, never authority. A finding is evidence the reviewer produced by
inspecting the pinned head, not a claim it was given.

## Authoritative sources

In precedence order:

1. the refreshed `project-state` snapshot, including the current pull request head SHA,
   check evidence and freshness/conflict records;
2. the `prepare-task` packet's authoritative issue, PDR, acceptance criteria and scope;
3. the committed `docs/spec.md` sections the packet references;
4. applicable `docs/adr/*` with `Status: Accepted`, under the
   [ADR-0004](../../docs/adr/0004-enforce-adr-disposition.md) disposition rule;
5. the pull request diff at the pinned head SHA.

The severity vocabulary, the reviewer-independence rule and the two-attempt review-loop
limit are global policy in
[`playbook/ENGINEERING_PLAYBOOK.md`](../../playbook/ENGINEERING_PLAYBOOK.md). This
procedure applies them; it does not restate, extend or count them.

## Procedure

1. Validate the packet and require `acting_job` to be `review-pr`. Another job's packet is
   not authority to review.
2. Refresh project and pull-request state before reviewing. Unreliable, conflicting or
   ineligible state stops the review rather than producing a result from stale evidence.
3. Pin the review to the exact current head SHA. If the head moved between reading the
   diff and reporting, the review is stale and its findings are discarded, not adjusted:
   a result that names the wrong commit is worse than no result.
4. Enforce reviewer independence. The acting reviewer must be the packet's reviewer and
   must never be its implementer.
5. Verify alignment against the authoritative records: every acceptance criterion, the
   referenced specification requirements, the ADR disposition and the accepted ADRs the
   work relies on.
6. Inspect correctness, security, simplicity, test and check evidence, and architecture
   conformance at the pinned head.
7. Classify every finding using only the global severities — `blocking`, `should-fix`,
   `suggestion`, `out-of-scope`. No new severity, no local reinterpretation.
8. Identify undocumented material scope or architecture decisions, and ADR
   inconsistencies. A material decision the pull request makes but does not record is a
   blocking finding, not a note.
9. Never implement a fix. Applying a change during the review job destroys independence
   and is a refusal, whatever the change was.
10. Emit the normalized result: the pull request and exact SHA reviewed, the authority
    references, findings with evidence, acceptance-criteria and check/security concerns,
    architecture conformance, blocker fingerprints, the overall result and the next
    action and owner.

## Output contract/schema

`skills/review-pr/schema.json` is the closed contract. A review returns either a result or
a refusal carrying auditable reason codes and the handling authority.

The result records the repository, issue, pull request and exact head SHA reviewed; the
PDR, specification and ADR references; findings with severity, concise evidence and
affected area; acceptance-criteria concerns; check and security concerns; the
architecture/ADR conformance verdict; the unresolved blocker fingerprints; the overall
result; and the next action and its owner.

`result` is exactly one of `blocking-findings`, `should-fix-findings` or `ready-for-pm`.

Acceptance criteria are the primary completion yardstick, so `result` is derived from the
findings *and* the acceptance evidence together. An acceptance criterion the reviewer could
not confirm at the pinned head is normalized into a blocking `acceptance-criteria` finding
unless an unresolved acceptance-criteria finding already carries it, and a review holding
acceptance concerns is never `ready-for-pm`. This is the existing severity model applied to
acceptance evidence, not a second acceptance policy.

Each unresolved blocker carries a `fingerprint` derived only from its severity, affected
area, locator and normalized summary — never from the head SHA. A blocker that survives a
new commit therefore keeps its fingerprint, which is what lets the existing two-attempt
loop guard recognise the *same* blocker. This procedure supplies the fingerprints; the
loop limit and its escalation remain global policy.

`fixes_applied` is always `false`, and `reviewer_may_approve_own_work` is always `false`.

## Allowed actions

Within the packet's bounded scope, and subject to the orchestrator's permission policy:

- read the packet, refreshed snapshot, referenced specification sections and accepted
  ADRs;
- read the pull request diff, its checks and its existing review state at the pinned head;
- read GitHub issue, pull-request, check and review state;
- post the review result and its findings to the pull request.

Not permitted: editing any file, committing, pushing, applying or suggesting a committed
fix, merging, approving, changing the acceptance criteria, resolving an architecture or
owner decision, or reviewing work this role implemented.

## Stop/escalation conditions

Review stops and routes to the named authority when:

- the packet is invalid, or prepared for a different job;
- refreshed state is unreliable, conflicting or ineligible;
- refreshed state records no pull request to review;
- the reviewed head SHA is not the current head, or is not a full commit SHA;
- the acting reviewer is the implementer, or is not the packet's reviewer;
- a finding uses a severity outside the global vocabulary;
- a fix was applied during the review job;
- an approval or merge is claimed by the reviewer.

Ambiguity is never resolved here. Each refusal carries a reason code and whether it routes
to `needs-pm` or `needs-owner`.
