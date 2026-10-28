# Noise monitor

Logs and analyses amplified-music noise from a nearby source. See `docs/spec.md`.

This phase is the **analysis core**: per-second sound-level readings go in, and windowed
levels, detected music sessions and an HTML report come out. Microphone capture comes in a
later epic.

```bash
npm test
```

No dependencies, Node 22 or later.

## How this repo is built

The repo is developed by the AI engineering system (`up160/ai-engineering-system`):

- Work is authorised by epic. An issue labelled `epic` with the `epic:active` label is
  worked through unattended.
- `.ai/` holds the pinned engine version, workflow contract, permission policy and adapter
  policy.
- `skills/` is the canonical skills set, pinned at the version in `.ai/project.yml`. Don't
  edit it by hand; it is replaced when the pin moves.
