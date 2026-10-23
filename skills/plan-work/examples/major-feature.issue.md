## Planning tier
`major-feature`

## Problem
Owners plan preconstructed-deck purchases in spreadsheets because the product only tracks single boosters, so precon prices and stock are never compared with the sealed products they replace.

## Outcome
An owner tracks preconstructed decks beside boosters, with the same price history, alerts and availability view.

## User and value
The owner sees one comparable view of sealed product value instead of maintaining a parallel spreadsheet.

## Scope
- Model preconstructed decks as a first-class sealed product type.
- Ingest precon listings from the existing supported retailers.
- Extend price history, alerts and availability to precons.

## Out of scope
- Single-card pricing.
- Retailers not already supported.
- Deck-contents analysis or card-by-card valuation.

## Requirements
- A precon is stored with set, product code, release date and retailer listings.
- Price history records precon prices on the existing collection schedule.
- Alerts support precons using the existing threshold rules.
- Search and availability views filter by sealed product type.

## Acceptance criteria
- [ ] A precon can be created, listed and opened with its retailer listings.
- [ ] Precon price history is recorded and rendered on the existing chart.
- [ ] An alert on a precon fires under the existing threshold rules.
- [ ] Search filters results by sealed product type.
- [ ] Existing booster behaviour is unchanged by the new product type.

## Constraints
- Reuse the existing ingestion schedule; no additional recurring provider cost.
- No inbound network exposure.

## Risks
- Retailer precon listings may not expose a stable product code.
- Product-type modelling may force a migration of existing booster rows.

## Dependencies
**Hard dependencies:** None
**Gate dependencies:** owner:scope-signoff@ready
**Ordering / coordination links:** #128

## ADR disposition
**ADR disposition:** `adr-existing` — ADR-0001

## Owner decisions
- Precons reuse the booster ingestion schedule rather than a new collector.
- Deck-contents analysis is deferred out of this work item.

## Context / spec link
- docs/spec.md#requirements
- docs/spec.md#out-of-scope

## Writable paths
- src/catalog/sealed
- src/ingest/retailers

## Roles
Primary implementer: Codex\
Independent reviewer: Claude Code\
PM/architecture gate: ChatGPT
