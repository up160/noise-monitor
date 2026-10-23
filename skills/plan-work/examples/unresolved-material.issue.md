## Planning tier
`small-feature`

## Problem
The region filter was agreed for a single selected region, but owners buy across two regions and cannot express that.

## Outcome
An owner filters listings by one or more shipping regions, so cross-region buying is expressible in one search.

## Scope
- Filter results by one or more selected shipping regions.

## Out of scope
- Shipping cost estimation.
- Saved region presets.

## Requirements
- The region filter accepts multiple regions and matches any selected region.

## Acceptance criteria
- [ ] Selecting two regions returns listings shipping to either region.
- [ ] Clearing the filter restores the unfiltered result set.

## Dependencies
**Hard dependencies:** None
**Gate dependencies:** None
**Ordering / coordination links:** None

## ADR disposition
**ADR disposition:** `adr-not-required` — Filter semantics change only; no new component, store or trust boundary.

## Unresolved
- Whether a region the seller does not declare counts as excluded — material: yes; escalation: needs-owner
- Whether region selection persists between sessions — material: no; escalation: needs-owner
