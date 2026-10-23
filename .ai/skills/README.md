# Project Skill Extensions

This optional directory contains project-specific specializations only. Shared
skills are resolved from the central engineering-system release pinned by
`../project.yml`; do not copy them here.

When a specialization is needed, create
`.ai/skills/<skill-name>/EXTENSION.md` from the central
`skills/templates/EXTENSION.md`. It must name the canonical skill and exact pinned
version. It may add project/stack detail or stronger constraints, but cannot replace
the canonical skill or weaken playbook/ADR authority, security, cost, permission,
review, dependency or escalation rules. Ambiguity fails closed for PM assessment.
