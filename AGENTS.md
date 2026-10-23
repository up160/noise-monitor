# Agent Instructions

Before every meaningful action, refresh:

1. `.ai/project.yml`
2. `docs/spec.md`
3. applicable `docs/adr/*`
4. the active GitHub issue
5. the linked pull request and review context, when present
6. the relevant canonical skill from the engineering-system version pinned in
   `.ai/project.yml`, when that job is registered

Then apply the engineering playbook version pinned in `.ai/project.yml`.

Rules:

- GitHub is authoritative over chat.
- Work only within the current issue scope.
- Acceptance criteria are the yardstick for success.
- Verify the issue/PR ADR disposition and applicable accepted ADRs.
- Do not expand scope silently.
- Stop and route newly discovered material architecture decisions to ChatGPT.
- Do not expose secrets.
- Follow escalation and protected-change rules in the central playbook.
- Treat project skill extensions as specializations only; they cannot weaken central
  policy, and ambiguous resolution stops for PM assessment.
