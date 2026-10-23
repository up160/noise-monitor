# plan-work

## Purpose

Turn an owner conversation about an idea, feature or fix into a durable,
authoritative GitHub work item that carries a Product Requirements Record (PDR)
proportionate to its planning tier.

The canonical product-planning flow is:

`owner/ChatGPT conversation -> PDR in GitHub issue -> ADR disposition -> ADR if required -> dependency/Ready gates -> orchestrator dispatch`

The conversation is discovery and transport. GitHub becomes authoritative for the
work item as soon as the PDR/issue is written.

## Inputs

- the owner's request or conversation in natural language, including answers given
  during grilling;
- current refreshed project state from GitHub when an existing project is involved,
  obtained through the canonical `project-state` procedure once it is registered;
- the existing issue and PDR when this is an update rather than a new work item;
- the pinned `engineering_system_version` from `.ai/project.yml`.

The owner is never required to complete a form, template or document by hand.
ChatGPT asks only the questions needed to remove material ambiguity, challenge
scope and establish acceptance criteria, then writes the durable record itself.

## Authoritative sources

- global policy, planning tiers, ADR disposition and dependency contract:
  [`playbook/ENGINEERING_PLAYBOOK.md`](../../playbook/ENGINEERING_PLAYBOOK.md) and
  [`playbook/PLANNING_PROTOCOL.md`](../../playbook/PLANNING_PROTOCOL.md);
- broader product truth: [`docs/spec.md`](../../docs/spec.md);
- architecture truth: [`docs/adr/`](../../docs/adr/), with the disposition contract
  in [ADR-0004](../../docs/adr/0004-enforce-adr-disposition.md);
- skills contract and precedence: [ADR-0005](../../docs/adr/0005-shared-skills-layer.md)
  and [`skills/README.md`](../README.md);
- dependency and readiness semantics:
  [ADR-0009](../../docs/adr/0009-dependency-aware-readiness.md);
- current work item: the GitHub issue and its linked PR/review context.

Chat history is never project state. Later discussion does not change the work item
until ChatGPT updates the issue, PDR and any affected spec or ADR.

## Procedure

1. Classify the planning tier as `tiny-fix`, `small-feature`, `major-feature` or
   `new-project` using the playbook tiers. Do not over-document tiny work.
2. Refresh authoritative project state before planning against an existing project.
   Plan against refreshed GitHub truth, not remembered conversation.
3. Grill only where it is useful: unresolved problem, user, outcome, scope
   boundaries, acceptance criteria, constraints, risk and cost. Stop when the work
   is build-ready; do not continue for theoretical completeness.
4. Detect likely scope and architecture change. A material change to component
   responsibilities, persistent state, trust boundaries, deployment topology, shared
   contracts, agent authority or recurring cost is an architecture signal.
5. Draft the PDR at the tier-proportionate level of detail and derive testable
   acceptance criteria for every requirement.
6. Assign exactly one ADR disposition under ADR-0004. When the conversation exposes
   a material architecture decision, create or cause creation of the concise ADR and
   link it from the issue before protected implementation proceeds.
7. Declare dependencies as hard dependencies, gate dependencies and ordering links,
   using the issue-template vocabulary the dependency gate consumes. Do not infer
   hard dependencies from ordering prose.
8. Decompose larger work into dependency-ordered follow-up issues, each with its own
   PDR and ADR disposition.
9. Write or update the GitHub issue itself, including the PDR and the declaration
   block. For `major-feature` and `new-project` work, also update or create the
   canonical `docs/spec.md` sections and reference them from the issue; the issue
   still carries a concise PDR.
10. Record every material requirement that remains unresolved as an explicit
    unresolved entry. Missing material requirements fail closed; they are never
    reconstructed from chat.
11. When later discussion materially changes requirements, update the issue/PDR, and
    the spec or ADR where needed, before implementation resumes.

## Output contract/schema

**PDR = Product Requirements Record.** It is the canonical requirements record for
one work item.

The GitHub issue body is the canonical PDR for normal work. For a new project or an
unusually large feature, `docs/spec.md` remains the broader canonical product
specification, but the initiating issue still contains a concise PDR with outcome,
scope, acceptance criteria and links to the canonical spec sections.

The machine-readable contract is [`schema.json`](schema.json), with fixtures in
[`examples/`](examples/) covering a tiny fix, a small feature, a major feature, an
existing-project extension, an ADR-required case and a material scope change.

Proportional to tier, the PDR captures: problem and desired outcome; intended user
and value; agreed scope; explicit out of scope; requirements and behaviour;
acceptance criteria; key constraints and known risks; dependencies and ordering
where known; planning tier; ADR disposition and references; and owner decisions that
materially shaped scope; and the repository paths the implementation may write. A
`tiny-fix` requires only outcome, acceptance criteria, writable paths and an ADR
disposition.

Do not paste chat transcripts. Preserve decisions and requirements, not
conversational noise. The `source` block records the conversation as
non-authoritative provenance only and can never be marked authoritative.

The issue declaration block uses the form the dependency gate parses:

```text
**Hard dependencies:** #39
**Gate dependencies:** None
**Ordering / coordination links:** #41
**ADR disposition:** `adr-existing` — ADR-0005
```

### Canonical issue-body sections

The issue body is read back deterministically by the canonical GitHub-PDR reader, so its
sections are a contract rather than a layout. Every PDR field has exactly one `##` heading,
and every heading has exactly one shape:

| `##` heading | PDR field | Shape |
| --- | --- | --- |
| `Planning tier` | `planning_tier` | one canonical tier, on one line |
| `Problem` | `problem` | prose |
| `Outcome` | `outcome` | prose |
| `User and value` | `intended_user_value` | prose |
| `Scope` | `scope` | list |
| `Out of scope` | `out_of_scope` | list |
| `Requirements` | `requirements` | list |
| `Acceptance criteria` | `acceptance_criteria` | list; task checkboxes are allowed |
| `Constraints` | `constraints` | list |
| `Risks` | `risks` | list |
| `Owner decisions` | `owner_decisions` | list |
| `Context / spec link` | `spec_references` | list |
| `Writable paths` | `writable_paths` | list |
| `Project state` | `project_state_refs` | list |
| `Unresolved` | `unresolved` | list in the escalation grammar below |

`dependencies` and `adr_disposition` have no heading of their own. They are read from the
declaration lines above, wherever in the body they appear, by the same parser the dependency
gate uses — one reading, so the record and the gate can never disagree.

Every rule below fails closed; none of them guesses:

- prose is preserved verbatim; a list section holds only list items, one requirement per
  item, with wrapped text indented beneath its own item. Nested items are refused: joining
  them to the item above produced one entry that was neither of the two written;
- a section that is present but records nothing is refused — omit it instead;
- a heading or a declaration stated twice is refused, never chosen between — and a
  declaration line inside a fenced block still counts, because the dependency gate reads the
  whole body and would otherwise block on an example;
- a tier that requires `dependencies` declares all three classes, stating `None` where a
  class is empty. A label written with nothing after it is refused, because an empty
  declaration means "nobody considered this", not "there is nothing";
- a declaration value is read whole or not at all. `#39, #41` and `None` are complete;
  `#39 and #41 once the reader lands`, `None or #39` and `#39 plus whatever the owner
  decides` are refused, because the part nobody read is the part that changes the meaning.
  Separate entries with commas and put the explanation in prose, not in the declaration;
- ordering / coordination links name issues. A pull request there is refused rather than
  silently dropped;
- `Writable paths` names the repository-relative paths the implementation may change. These
  become the agent's writable roots under ADR-0011, so name the narrowest set that can do the
  work, and keep read-only references under `Context / spec link` — a document worth reading
  is not thereby a file the job may change. The project's versioned policy bounds the
  declaration: a path outside the reviewed roots is dropped, so this can narrow a job's write
  scope and never widen it. An implementation run with no writable scope is refused rather
  than dispatched, so every issue that will be implemented declares this — including a
  `tiny-fix`, which explains nothing and still has to say where it writes;
- an unresolved entry reads
  `<topic> — material: yes|no; escalation: needs-pm|needs-owner|needs-pm-adr`, because an
  unresolved *material* requirement is what keeps the record out of Ready;
- headings the contract does not name are ignored, so an unrecognised section can never
  contribute a requirement. Requirements live in the sections above or nowhere.

A `tiny-fix` needs only `Planning tier`, `Outcome`, `Acceptance criteria`, `Writable paths`
and the ADR disposition line. [`examples/`](examples/) carries the canonical body for a tiny fix, a small
feature, a major feature and an ADR-required case beside the structured record each one reads
back as.

Generated prompts, task packets and agent handoffs are transport, not project state.
`prepare-task`, implementation and independent review consume the GitHub issue/PDR
and the linked canonical spec and ADRs, never a copied chat prompt. The parsed PDR is derived
transport in exactly the same way: it carries `issue_is_canonical` and a non-authoritative
`source` because the GitHub issue it was read from remains the record.

## Allowed actions

- ask the owner the minimum useful clarifying questions;
- create or update the GitHub issue and its PDR;
- create or link an ADR required by the disposition;
- update or create canonical `docs/spec.md` sections for major or new-project work;
- create dependency-ordered follow-up issues;
- record unresolved material requirements and route them for decision.

This procedure creates requirements records. It does not implement code, approve its
own architecture decision, change workflow state past a protected gate, or widen
scope without owner approval.

## Stop/escalation conditions

Stop and route rather than guessing when:

- a material product decision is unresolved or belongs to the owner;
- architecture need is uncertain — record `needs-pm-adr` and stop for ChatGPT
  architecture assessment;
- an `adr-required` decision has no accepted, linked ADR;
- material cost, risk, security or scope increase is implied;
- refreshed GitHub truth conflicts with the conversation, or the issue conflicts with
  `docs/spec.md`, `docs/adr/` or the portfolio dependency graph;
- required inputs are missing, stale or ambiguous.

Missing material requirements fail closed: the PDR is not Ready-eligible and no
implementation is dispatched until the record is complete in GitHub.
