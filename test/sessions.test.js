import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseReadings } from "../src/readings.js";
import { detectSessions } from "../src/sessions.js";

const quiet = { dba: 35, band63: 43, band125: 40 };
const music = { dba: 55, band63: 64, band125: 61 };
const repeat = (count, level) => Array(count).fill(level);

function readingsAt(start, levels) {
  const epoch = Date.parse(start) / 1000;
  const offset = start.match(/Z$|[+-]\d{2}:\d{2}$/)[0];
  const local = Date.parse(start.replace(/Z$|[+-]\d{2}:\d{2}$/, "Z"));
  return levels.map((level, second) => ({
    timestamp: new Date(local + second * 1000).toISOString().replace(".000Z", offset),
    epochSeconds: epoch + second, ...level,
  }));
}

function sequence(levels, options = {}) {
  return detectSessions(readingsAt("2026-10-23T19:00:00Z", levels), options);
}

test("evening fixture detects exactly two sessions, excludes traffic and flags only the late session", () => {
  const readings = parseReadings(readFileSync(new URL("fixtures/evening.csv", import.meta.url), "utf8"));
  const original = structuredClone(readings);
  const sessions = detectSessions(readings);
  assert.deepEqual(sessions.map(({ start, end, durationSeconds, lateNight }) => ({ start, end, durationSeconds, lateNight })), [
    { start: "2026-10-23T20:00:00+00:00", end: "2026-10-23T20:30:00+00:00", durationSeconds: 1800, lateNight: false },
    { start: "2026-10-23T22:50:00+00:00", end: "2026-10-23T23:30:00+00:00", durationSeconds: 2400, lateNight: true },
  ]);
  for (const session of sessions) {
    assert.ok(Number.isFinite(session.laeq) && session.laeq > 54 && session.laeq < 57);
    assert.ok(Number.isFinite(session.lamax) && session.lamax >= session.laeq && session.lamax < 57);
    assert.ok(session.end <= "2026-10-23T20:40:00+00:00" || session.start >= "2026-10-23T20:40:08+00:00");
  }
  assert.deepEqual(readings, original);
});

test("music requires the inclusive dBA margin and inclusive margin on either bass band", () => {
  for (const [level, expected] of [
    [{ dba: 41, band63: 51, band125: 40 }, 1],
    [{ dba: 41, band63: 43, band125: 48 }, 1],
    [{ dba: 40.9, band63: 51, band125: 48 }, 0],
    [{ dba: 41, band63: 50.9, band125: 47.9 }, 0],
    [{ dba: 55, band63: 43, band125: 40 }, 0],
    [{ dba: 35, band63: 64, band125: 61 }, 0],
  ]) {
    assert.equal(sequence([quiet, ...repeat(120, level)]).length, expected, JSON.stringify(level));
  }
});

test("119 music seconds do not qualify; 120 do, excluding trailing quiet readings", () => {
  assert.deepEqual(sequence([quiet, ...repeat(119, music)]), []);
  const [session] = sequence([quiet, ...repeat(120, music), ...repeat(40, quiet)]);
  assert.equal(session.start, "2026-10-23T19:00:01Z");
  assert.equal(session.end, "2026-10-23T19:02:01Z");
  assert.equal(session.durationSeconds, 120);
});

test("empty input and a loud start without an earlier floor produce no sessions", () => {
  assert.deepEqual(detectSessions([]), []);
  assert.deepEqual(sequence(repeat(1200, music)), []);
});

test("the held floor keeps a twenty-minute session open after its original background expires", () => {
  const [session] = sequence([quiet, ...repeat(1200, music)]);
  assert.equal(session.durationSeconds, 1200);
  assert.equal(session.laeq, 55);
  assert.equal(session.lamax, 55);
});

test("floor percentile is nearest-rank per band, excluding the current reading", () => {
  const background = Array.from({ length: 10 }, (_, i) => ({ dba: 30 + i, band63: 40 + i, band125: 50 + i }));
  const level = { dba: 37, band63: 49, band125: 0 };
  assert.equal(sequence([...background, level], { minMusicSeconds: 1 }).length, 1);
  assert.equal(sequence([...background, level], { minMusicSeconds: 1, floorPercentile: 20 }).length, 1);
  assert.equal(sequence([...background, level], { minMusicSeconds: 1, floorPercentile: 30 }).length, 0);
});

test("floor window includes its left boundary and evicts older values in all bands", () => {
  const readings = [
    ...readingsAt("2026-10-23T19:00:00Z", [quiet]),
    ...readingsAt("2026-10-23T19:10:00Z", [music]),
  ];
  assert.equal(detectSessions(readings, { minMusicSeconds: 1 }).length, 1);
  readings[1] = readingsAt("2026-10-23T19:10:01Z", [music])[0];
  assert.deepEqual(detectSessions(readings, { minMusicSeconds: 1 }), []);
  const background = [quiet, ...repeat(9, { dba: 40, band63: 50, band125: 50 }), { dba: 46, band63: 58, band125: 0 }];
  assert.equal(sequence(background, { minMusicSeconds: 1, floorWindowSeconds: 9 }).length, 1);
});

for (const missing of [false, true]) {
  for (const gap of [30, 31]) {
    test(`${gap} ${missing ? "missing" : "quiet"} seconds ${gap === 30 ? "are bridged" : "split candidates"}`, () => {
      let readings = readingsAt("2026-10-23T19:00:00Z", [quiet, ...repeat(120, music), ...repeat(gap, quiet), ...repeat(120, music)]);
      if (missing) readings = readings.filter((_, index) => index <= 120 || index > 120 + gap);
      const sessions = detectSessions(readings);
      assert.equal(sessions.length, gap === 30 ? 1 : 2);
      assert.deepEqual(sessions.map((session) => session.durationSeconds), gap === 30 ? [270] : [120, 120]);
    });
  }
}

test("61 missing seconds split but exactly 60 do not, independently of a 300-second bridge", () => {
  for (const gap of [60, 61]) {
    const readings = readingsAt("2026-10-23T19:00:00Z", [quiet, ...repeat(120, music), ...repeat(gap, quiet), ...repeat(120, music)])
      .filter((_, index) => index <= 120 || index > 120 + gap);
    const sessions = detectSessions(readings, { maxBridgeSeconds: 300 });
    assert.equal(sessions.length, gap === 60 ? 1 : 2);
    assert.deepEqual(sessions.map((session) => session.durationSeconds), gap === 60 ? [300] : [120, 120]);
  }
});

test("LAeq includes bridged quiet readings, uses energy rather than arithmetic averaging and rounds", () => {
  const loud = { ...music, dba: 55.26 };
  const [session] = sequence([quiet, ...repeat(120, loud), ...repeat(30, quiet), ...repeat(120, loud)]);
  const expected = Math.round(10 * Math.log10((240 * 10 ** (55.26 / 10) + 30 * 10 ** (35 / 10)) / 270) * 10) / 10;
  assert.equal(session.laeq, expected);
  assert.equal(session.lamax, 55.3);
  const [large] = sequence([{ dba: 3900, band63: 0, band125: 0 }, ...repeat(120, { dba: 4000, band63: 20, band125: 20 })]);
  assert.equal(large.laeq, 4000);
  assert.equal(large.lamax, 4000);
});

for (const offset of ["Z", "+05:30", "-03:20"]) {
  for (const [start, count, lateNight] of [
    ["2026-10-23T22:59:59", 1, false], ["2026-10-23T22:59:59", 2, true],
    ["2026-10-24T07:00:00", 1, false], ["2026-10-24T06:59:59", 1, true],
    ["2026-10-24T00:30:00", 1, true],
  ]) {
    test(`late-night boundary at ${start}${offset}, ${count} second(s) preserves offset`, () => {
      const baseline = readingsAt(`${start}${offset}`, [quiet])[0];
      baseline.epochSeconds -= 1;
      const [session] = detectSessions([baseline, ...readingsAt(`${start}${offset}`, repeat(count, music))], { minMusicSeconds: 1 });
      assert.equal(session.start, `${start}${offset}`);
      assert.ok(session.end.endsWith(offset));
      assert.equal(Date.parse(session.end) - Date.parse(session.start), count * 1000);
      assert.equal(session.lateNight, lateNight);
    });
  }
}

test("custom daytime late-night hours use exclusive ends and handle multi-day sessions", () => {
  const options = { minMusicSeconds: 1, lateNightStartHour: 12, lateNightEndHour: 14 };
  for (const [start, levels, expected] of [
    ["2026-10-23T11:59:58Z", [quiet, music], false],
    ["2026-10-23T11:59:59Z", [quiet, music], true],
    ["2026-10-23T13:59:59Z", [quiet, music], false],
    ["2026-10-23T11:59:58Z", [quiet, ...repeat(2 * 86400, music)], true],
  ]) {
    assert.equal(detectSessions(readingsAt(start, levels), options)[0].lateNight, expected);
  }
});

test("results are independent of the process time zone", () => {
  const readings = readingsAt("2026-10-23T22:59:59+05:30", [quiet, ...repeat(120, music)]);
  const script = `import { detectSessions } from ${JSON.stringify(new URL("../src/sessions.js", import.meta.url).href)};
    console.log(JSON.stringify(detectSessions(${JSON.stringify(readings)})));`;
  for (const TZ of ["Pacific/Honolulu", "Asia/Tokyo"]) {
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], { env: { ...process.env, TZ }, encoding: "utf8" });
    assert.deepEqual(JSON.parse(output), detectSessions(readings));
  }
});

test("all invalid options throw RangeError naming the option", () => {
  const cases = {
    floorWindowSeconds: [0, -1, 1.5, NaN, Infinity, "600", Number.MAX_SAFE_INTEGER + 1],
    minMusicSeconds: [0, -1, 1.5, NaN, Infinity, "120", Number.MAX_SAFE_INTEGER + 1],
    maxBridgeSeconds: [-1, 1.5, NaN, Infinity, "30", Number.MAX_SAFE_INTEGER + 1],
    maxReadingGapSeconds: [-1, 1.5, NaN, Infinity, "60", Number.MAX_SAFE_INTEGER + 1],
    floorPercentile: [0, -1, 100.1, NaN, Infinity, "10"],
    dbaMarginDb: [NaN, Infinity, -Infinity, "6"], bandMarginDb: [NaN, Infinity, -Infinity, "8"],
    lateNightStartHour: [-1, 24, 1.5, NaN, Infinity, "23", 7],
    lateNightEndHour: [-1, 24, 1.5, NaN, Infinity, "7", 23],
  };
  for (const [name, values] of Object.entries(cases)) {
    for (const value of values) {
      assert.throws(() => detectSessions([], { [name]: value }), (error) => {
        assert.ok(error instanceof RangeError);
        assert.ok(error.message.includes(name));
        return true;
      });
    }
  }
  assert.deepEqual(detectSessions([], {
    floorPercentile: 100, dbaMarginDb: -1, bandMarginDb: -1,
    maxBridgeSeconds: 0, maxReadingGapSeconds: 0, lateNightStartHour: 0, lateNightEndHour: 23,
  }), []);
});
