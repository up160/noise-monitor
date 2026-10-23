# Project Specification

## Problem

Amplified music from a nearby venue can be heard at home, but there's no record of how loud
it is, when it happens or how often. Without data, it's anecdote: both for knowing whether
it's getting worse and for any complaint made later through the proper channels.

## Users

The owner, reading reports on a computer or phone. Later, possibly a third party receiving an
exported report as supporting evidence.

## Goals

- Turn per-second sound-level readings into a clear account of when music played, how loud
  it was and for how long.
- Produce evidence that's honest about its limits: relative levels from an uncalibrated mic
  until a calibrated one is fitted.

## Requirements

This phase is the analysis core only. It works on recorded or synthetic readings.

- **R1 Readings.** Load per-second readings from CSV with columns `timestamp` (ISO 8601 with
  offset), `dba` (A-weighted level), `band63` and `band125` (63 Hz and 125 Hz octave-band
  levels, dB). Reject malformed rows with a precise error, and never silently drop data.
- **R2 Windowed levels.** For fixed 15-minute windows, compute `LAeq` (energy average),
  `LAmax` (maximum) and `LA90` (the level exceeded 90% of the time; the background floor).
- **R3 Music sessions.** Detect music sessions with deterministic rules: level above the
  background floor plus sustained low-frequency energy, held long enough to count, with
  short gaps bridged. Each session has a start, end, duration, LAeq and LAmax.
- **R4 Report.** Write a self-contained HTML report listing the sessions, flagging any
  session running after 23:00 local time. It must state that levels are relative unless the
  readings come from a calibrated microphone.

## Acceptance Criteria

Defined on each GitHub issue. The issue is authoritative.

## Out of Scope

- Microphone capture, a background service and calibration files (a later epic).
- Weather data, event-calendar matching, trends across weeks, real-time alerts.
- Any network access or hosted service.

## Edge Cases / Failure Behaviour

- Gaps in the readings (the recording machine asleep) are reported as gaps, never filled in.
- Readings out of order or duplicated are an error, not something to repair silently.
- A window with too few readings is marked incomplete rather than given a misleading value.

## Data / Privacy / Security

Numbers only: levels and band energies. No audio, so no recorded speech. Everything stays
on the local machine. The repository contains no location or personal details. Real readings
and reports stay out of version control (`reports/` is ignored).

## Architecture Summary

Plain JavaScript ES modules on Node 22 or later, with no dependencies. `node --test` is the
test runner. Pure functions in `src/`, with fixtures in `test/fixtures/`.

## Deployment / Observability

`deploy: none`. The analysis runs locally and an issue is done once merged with green checks.

## Risks / Unknowns

- Detection thresholds need tuning on real data once capture exists.
- A mic indoors measures what reaches it, not the level at the property boundary.

## Decision History

- The analysis core is built first on synthetic readings, before any calibrated microphone
  is available. A computer's built-in mic can supply relative readings later.
