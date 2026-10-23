---
name: Implementation issue
about: One clear delivery outcome with acceptance criteria
---

<!-- These sections are the canonical PDR and are read back deterministically.
     One heading per field, one shape per heading: see the plan-work skill.
     Replace the guidance under a heading; delete an optional section rather than
     leaving it empty, because an empty section fails closed.
     A tiny-fix needs only Planning tier, Outcome, Acceptance criteria and the ADR line. -->

## Planning tier

`small-feature`

## Problem

Describe the problem this work item solves.

## Outcome

Describe one observable delivery outcome.

## User and value

Name the intended user and the value they get. Required for major-feature and
new-project work; delete otherwise.

## Context / spec link

- Link the authoritative requirement or specification sections, one per line.

## Project state

- Record the refreshed GitHub state consulted while planning; delete if none was.

## Scope

- List the work required for this issue only.

## Out of scope

- State explicit boundaries.

## Requirements

- State the required behaviour, one requirement per line.

## Acceptance criteria

- [ ] AC1

## Constraints

- Required for major-feature and new-project work; delete otherwise.

## Risks

- Required for major-feature and new-project work; delete otherwise.

## Owner decisions

- Record the owner decisions that materially shaped scope; delete if there are none.

## Unresolved

- Topic — material: yes; escalation: needs-owner

## Writable paths
<!-- Repository-relative paths the implementation may change. These become the agent's
     writable roots, so name the narrowest set that can do the work; read-only references
     belong under "Context / spec link". -->

## Dependencies

Classify each relationship; state "None" where a class is empty. A label left blank is
refused, and a value is read whole — separate entries with commas and keep prose out of the
declaration line:
- Hard dependencies:
- Gate dependencies:
- Ordering / coordination links:

## ADR disposition

State exactly one disposition with its required evidence on the declaration line:
- ADR disposition: `adr-not-required` — Reason

<!-- The other kinds: `adr-existing` — ADR-0000, `adr-required` — accepted ADR-0000,
     `needs-pm-adr` — the architecture question for ChatGPT. -->

## Roles

Primary implementer: Codex\
Independent reviewer: Claude Code\
PM/architecture gate: ChatGPT
