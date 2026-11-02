import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseReadings } from "../src/readings.js";
import { windowLevels } from "../src/windows.js";

function readingsAt(start, levels) {
  const epoch = Date.parse(start);
  const offset = start.match(/Z$|[+-]\d{2}:\d{2}$/)[0];
  const localEpoch = Date.parse(start.replace(/Z$|[+-]\d{2}:\d{2}$/, "Z"));
  const rows = levels.map((dba, second) => {
    const timestamp = new Date(localEpoch + second * 1000).toISOString().replace(".000Z", offset);
    return { timestamp, epochSeconds: epoch / 1000 + second, dba, band63: 0, band125: 0 };
  });
  return rows;
}

test("constant 50 dBA produces 50.0 for all levels in a complete window", () => {
  const readings = readingsAt("2026-10-23T19:00:00+00:00", Array(900).fill(50));
  const original = structuredClone(readings);
  assert.deepEqual(windowLevels(readings), [{
    start: "2026-10-23T19:00:00+00:00", end: "2026-10-23T19:15:00+00:00",
    count: 900, complete: true, laeq: 50.0, lamax: 50.0, la90: 50.0,
  }]);
  assert.deepEqual(readings, original);
});

test("one minute at 60 dBA among fourteen at 40 dBA uses the energy average", () => {
  const levels = [...Array(840).fill(40), ...Array(60).fill(60)];
  const [window] = windowLevels(readingsAt("2026-10-23T19:00:00Z", levels));
  assert.equal(window.laeq, 48.8);
  assert.equal(window.lamax, 60.0);
  assert.equal(window.la90, 40.0);
  assert.equal(window.complete, true);
});

test("evening fixture marks only its five-minute gap window incomplete", () => {
  const readings = parseReadings(readFileSync(new URL("fixtures/evening.csv", import.meta.url), "utf8"));
  const windows = windowLevels(readings);
  assert.equal(windows.length, 24);
  assert.equal(windows.reduce((sum, window) => sum + window.count, 0), readings.length);
  const incomplete = windows.filter((window) => !window.complete);
  assert.equal(incomplete.length, 1);
  assert.equal(incomplete[0].start, "2026-10-23T21:00:00+00:00");
  assert.equal(incomplete[0].count, 600);
  for (const window of windows) {
    assert.equal(window.count, window.complete ? 900 : 600);
    for (const key of ["laeq", "lamax", "la90"]) assert.ok(Number.isFinite(window[key]));
  }
});

for (const offset of ["Z", "+05:40", "-03:20"]) {
  test(`clock alignment, exclusive boundaries and empty windows preserve ${offset} across midnight`, () => {
    const readings = [
      ...readingsAt(`2026-10-23T23:59:59${offset}`, [40]),
      ...readingsAt(`2026-10-24T00:30:00${offset}`, [60]),
    ];
    assert.deepEqual(windowLevels(readings), [
      { start: `2026-10-23T23:45:00${offset}`, end: `2026-10-24T00:00:00${offset}`,
        count: 1, complete: false, laeq: 40, lamax: 40, la90: 40 },
      { start: `2026-10-24T00:00:00${offset}`, end: `2026-10-24T00:15:00${offset}`,
        count: 0, complete: false, laeq: null, lamax: null, la90: null },
      { start: `2026-10-24T00:15:00${offset}`, end: `2026-10-24T00:30:00${offset}`,
        count: 0, complete: false, laeq: null, lamax: null, la90: null },
      { start: `2026-10-24T00:30:00${offset}`, end: `2026-10-24T00:45:00${offset}`,
        count: 1, complete: false, laeq: 60, lamax: 60, la90: 60 },
    ]);
  });
}

test("completeness starts at exactly 80% and partial windows retain their levels", () => {
  for (const [count, complete] of [[719, false], [720, true]]) {
    const [window] = windowLevels(readingsAt("2026-10-23T19:00:00Z", Array(count).fill(42)));
    assert.equal(window.count, count);
    assert.equal(window.complete, complete);
    assert.deepEqual([window.laeq, window.lamax, window.la90], [42, 42, 42]);
  }
});

test("LA90 uses nearest-rank on sorted levels, and results round to one decimal", () => {
  const levels = [90, 80, 70, 60, 50, 40, 30, 20, 10.26, 0.14];
  const [ten] = windowLevels(readingsAt("2026-10-23T19:00:00Z", levels));
  const [eleven] = windowLevels(readingsAt("2026-10-23T19:00:00Z", [...levels, 100.26]));
  assert.equal(ten.la90, 0.1);
  assert.equal(eleven.la90, 10.3);
  assert.equal(eleven.lamax, 100.3);
  const [single] = windowLevels(readingsAt("2026-10-23T19:00:00Z", [42.26]));
  assert.deepEqual([single.laeq, single.lamax, single.la90], [42.3, 42.3, 42.3]);
});

test("custom window duration controls alignment, boundaries and expected seconds", () => {
  const windows = windowLevels(readingsAt("2026-10-23T19:00:00+05:30", Array(60).fill(50)), { windowSeconds: 60 });
  assert.equal(windows.length, 1);
  assert.equal(windows[0].start, "2026-10-23T19:00:00+05:30");
  assert.equal(windows[0].end, "2026-10-23T19:01:00+05:30");
  assert.equal(windows[0].count, 60);
  assert.equal(windows[0].complete, true);
});

test("empty input returns no windows", () => {
  assert.deepEqual(windowLevels([]), []);
});

test("invalid durations are rejected", () => {
  for (const windowSeconds of [0, -1, 0.5, NaN, Infinity, "900"]) {
    assert.throws(() => windowLevels([], { windowSeconds }), /positive safe integer/);
  }
});
