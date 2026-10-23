# Canonical Skills Layer

This directory is the single maintained source for reusable engineering procedures.
A skill describes how to perform one workflow job; it does not create project state,
change agent authority or replace the global operating model.

ADR-0005 defines this architecture. It becomes authoritative for downstream work
only when the independently reviewed, PM-gated Issue #39 pull request is merged.
Until then, this directory is a non-executable contract and authorizes no downstream
skill execution.

## Canonical layout

```text
skills/
  README.md
  registry.json
  templates/
    SKILL.md
    EXTENSION.md
  <skill-name>/
    SKILL.md
    schema.json       # optional
    examples/         # optional and small
```

There is one canonical `SKILL.md` for each registered name. Do not maintain separate
Codex, Claude Code, Gemma or ChatGPT copies. Tool-native files may only be generated
thin pointers or renderers for this source.

## Registry contract

`registry.json` is the discovery index for the checked-out engineering-system
release. It contains:

- `schemaVersion`: registry format version;
- `engineeringSystemVersion`: exact SemVer of the containing release;
- `canonicalRoot`: always `skills`;
- `projectExtensionRoot`: always `.ai/skills`;
- `skills`: registered canonical entries.

Each future entry has a unique lowercase kebab-case `name`, a repository-relative
`path` to its canonical `SKILL.md`, and an optional repository-relative
`outputSchema`. Paths must remain inside the canonical root. An absent entry means
the skill is not implemented and must not be invoked.

The registry holds `project-state` from Issue #40, `plan-work` from Issue #56,
`prepare-task` from Issue #41, `implement-issue` from Issue #42 and `review-pr` from
Issue #43. The acting-job layer is complete; a future skill adds its entry only when its
canonical procedure and validation evidence exist.

## Canonical skill format

Every canonical `SKILL.md` uses the headings in
[`templates/SKILL.md`](templates/SKILL.md):

1. Purpose
2. Inputs
3. Authoritative sources
4. Procedure
5. Output contract/schema
6. Allowed actions
7. Stop/escalation conditions

Skills reference global rules in the playbook and accepted ADRs. They do not copy
the complete policy text. Machine-readable schemas and examples are added only when
they make an output contract more deterministic.

## Resolution and precedence

A consumer resolves a job as follows:

1. Refresh project truth and read `engineering_system_version` from
   `.ai/project.yml`.
2. Load exactly that immutable engineering-system release; never substitute a
   mutable branch or latest version.
3. Require the registry version to match the project pin exactly.
4. Resolve exactly one canonical registry entry for the requested skill name and
   validate that its path remains inside `skills/`.
5. Load the canonical skill and validate its required inputs and output contract.
6. If `.ai/skills/<skill-name>/EXTENSION.md` exists, validate and compose that one
   project extension after the canonical procedure.
7. Let the adapter render only the resolved procedure and bounded authoritative
   inputs, then record skill name and engineering-system version in run/audit
   evidence.

Precedence is global policy and accepted ADRs, then the pinned canonical skill, then
one compatible project extension, then thin adapter rendering. Lower layers may
specialize or strengthen higher layers; they cannot weaken or replace them.

Resolution fails closed and routes to `needs-pm` for a missing/mutable pin, registry
version mismatch, unknown or duplicate skill, path escape, multiple extensions,
tool-specific replacement copy, incompatible output contract or ambiguity about a
policy conflict. Consumers do not guess, merge competing sources or silently fall
back to another version.

## Project-specific extensions

Projects may specialize a skill at `.ai/skills/<skill-name>/EXTENSION.md` using
[`templates/EXTENSION.md`](templates/EXTENSION.md). An extension declares the exact
canonical skill and engineering-system version it extends.

An extension may add project-specific inputs, stricter validation, narrower allowed
actions, extra stop conditions or stack-specific steps. It may not change role or
approval authority, make non-authoritative state authoritative, weaken security,
cost, permissions, review, ADR, dependency or escalation policy, relax the canonical
output contract, or broaden the job beyond its issue.

## Consumers

- The local orchestrator resolves the project pin and registry, validates the
  composed contract and records the selected name/version in audit evidence.
- Codex and Claude Code receive the same canonical procedure plus refreshed inputs;
  neither maintains a fork.
- Gemma/local workers receive only a runner-selected procedure and bounded inputs;
  they do not discover skills or explore repositories themselves.
- ChatGPT reads the canonical procedure from the pinned GitHub release for
  interactive PM/architecture jobs. Local automation does not require a paid
  ChatGPT API merely to resolve a skill.

Generated prompts, rendered contexts and task packets are transport. GitHub issues,
PRs, committed specs/ADRs and GitHub workflow state remain authoritative.

## Policy versus procedure

The playbook and accepted ADRs own invariant authority, safety, cost, permission,
review, dependency, merge/deploy, escalation and project-completion rules. Skills
provide the repeatable procedure for applying those rules to one job. When a skill
and global policy appear inconsistent, global policy wins and resolution stops for
PM assessment.

## Initial implementation order

1. `project-state` (#40)
2. `plan-work` / Product Requirements Record (#56)
3. `prepare-task` (#41)
4. `implement-issue` (#42) and `review-pr` (#43)

The resulting flow is:

`owner/ChatGPT conversation -> plan-work/PDR -> authoritative GitHub issue -> prepare-task -> implementation and independent review`.

Issue #39 implements none of these procedures. The #13 bootstrap E2E must later
prove that every stage resolves and records its canonical skill from the project pin.
