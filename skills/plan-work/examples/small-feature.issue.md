## Planning tier
`small-feature`

## Problem
Owners cannot tell from a booster listing whether a seller ships internationally, so they open every listing to find out.

## Outcome
A listing shows its shipping regions in the results list, so an owner filters out unusable listings without opening them.

## Scope
- Show shipping regions on each result card.
- Filter results by a selected shipping region.

## Out of scope
- Shipping cost estimation.
- Customs or duty calculation.

## Requirements
- Each result card displays the seller's declared shipping regions.
- A region filter narrows results to sellers shipping to that region.
- A listing with no declared regions is shown as unknown rather than excluded.

## Acceptance criteria
- [ ] A result card renders the declared shipping regions.
- [ ] Selecting a region excludes listings that do not ship there.
- [ ] A listing with no declared regions renders as unknown and remains visible.

## Dependencies
**Hard dependencies:** None
**Gate dependencies:** None
**Ordering / coordination links:** None

## ADR disposition
**ADR disposition:** `adr-not-required` — Presentation and filtering over existing listing data; no new component, store or trust boundary.

## Writable paths
- src/search/results
- src/search/filters

## Owner decisions
- Unknown shipping regions stay visible rather than being hidden by default.

## Roles
Primary implementer: Codex\
Independent reviewer: Claude Code\
PM/architecture gate: ChatGPT
