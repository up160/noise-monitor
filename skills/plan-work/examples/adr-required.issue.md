## Planning tier
`major-feature`

## Problem
Retailer price collection runs inside the web process, so a slow retailer delays user requests and a restart loses in-flight collection.

## Outcome
Price collection runs as a separate scheduled worker with its own durable queue, so user requests stay fast and a restart resumes collection.

## User and value
The owner keeps a responsive product and complete price history even when a retailer is slow or the host restarts.

## Scope
- Move retailer collection out of the request path into a scheduled worker.
- Persist the collection queue so work resumes after restart.

## Out of scope
- Changing which retailers are supported.
- Real-time push updates to the browser.

## Requirements
- Collection work is enqueued durably and processed outside the request path.
- A restart resumes pending collection without duplicating recorded prices.
- Collection failures are recorded and retried with a bounded policy.

## Acceptance criteria
- [ ] A user request completes without waiting for retailer collection.
- [ ] Restarting the worker mid-run resumes pending items exactly once.
- [ ] A failing retailer is retried within the bounded policy and then recorded as failed.

## Constraints
- No additional recurring hosting cost beyond the existing plan.
- No inbound network listener.

## Risks
- Queue durability choice affects future hosting portability.
- Exactly-once recording depends on idempotent write keys.

## Dependencies
**Hard dependencies:** #131
**Gate dependencies:** pm:architecture-review@ready
**Ordering / coordination links:** None

## ADR disposition
**ADR disposition:** `adr-required` — ADR-0010

## Owner decisions
- Accept a background worker rather than extending request timeouts.

## Context / spec link
- docs/spec.md#architecture-summary

## Writable paths
- src/ingest/worker
- src/ingest/queue

## Roles
Primary implementer: Codex\
Independent reviewer: Claude Code\
PM/architecture gate: ChatGPT
