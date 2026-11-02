import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseReadings } from "../src/readings.js";

const header = "timestamp,dba,band63,band125";
const row = (timestamp, levels = "35,43,40") => `${timestamp},${levels}`;
const first = row("2026-10-23T19:00:00+00:00");
const fixture = new URL("fixtures/evening.csv", import.meta.url);

test("returns every fixture row in order with numeric levels and preserved gaps", () => {
  const csv = readFileSync(fixture, "utf8");
  const lines = csv.trimEnd().split("\n").slice(1);
  const readings = parseReadings(csv);
  assert.equal(readings.length, 6 * 3600 - 300);
  assert.equal(readings.length, lines.length);
  readings.forEach((reading, i) => {
    const [timestamp, ...levels] = lines[i].split(",");
    assert.deepEqual(reading, {
      timestamp, epochSeconds: Date.parse(timestamp) / 1000,
      dba: Number(levels[0]), band63: Number(levels[1]), band125: Number(levels[2]),
    });
    if (i) assert.ok(reading.epochSeconds > readings[i - 1].epochSeconds);
  });
  assert.equal(readings[0].timestamp, "2026-10-23T19:00:00+00:00");
  assert.equal(readings.at(-1).timestamp, "2026-10-24T00:59:59+00:00");
});

const invalidCases = [
  ["wrong header", "Timestamp,dba,band63,band125\n", 1, /header/],
  ["non-numeric level", `${header}\n${row("2026-10-23T19:00:00Z", "noise,43,40")}`, 2, /dba/],
  ["missing offset", `${header}\n${row("2026-10-23T19:00:00")}`, 2, /explicit offset/],
  ["duplicate timestamp", `${header}\n${first}\n${first}`, 3, /duplicate/],
  ["out-of-order row", `${header}\n${first}\n${row("2026-10-23T18:59:59Z")}`, 3, /out-of-order/],
  ["different offset", `${header}\n${first}\n${row("2026-10-23T21:00:01+01:00")}`, 3, /offset differs/],
  ["missing field", `${header}\n2026-10-23T19:00:00Z,35,43`, 2, /four CSV fields/],
  ["extra field", `${header}\n${first},99`, 2, /four CSV fields/],
  ["internal blank row", `${header}\n${first}\n\n${row("2026-10-23T19:00:01Z")}`, 3, /four CSV fields/],
  ["extra final blank row", `${header}\n${first}\n\n`, 3, /four CSV fields/],
];
for (const [name, csv, line, reason] of invalidCases) {
  test(`rejects ${name} with a line and reason`, () => {
    assert.throws(() => parseReadings(csv), (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, new RegExp(`^Line ${line}:`));
      assert.match(error.message, reason);
      return true;
    });
  });
}

for (const timestamp of [
  "2026-02-30T19:00:00Z", "2026-02-29T19:00:00Z", "1900-02-29T19:00:00Z",
  "2026-00-01T19:00:00Z", "2026-13-01T19:00:00Z", "2026-01-00T19:00:00Z",
  "2026-04-31T19:00:00Z", "2026-10-23T24:00:00Z", "2026-10-23T19:60:00Z",
  "2026-10-23T19:00:60Z", "2026-10-23T19:00:00+24:00", "2026-10-23T19:00:00+00:60",
]) {
  test(`rejects impossible timestamp ${timestamp}`, () => {
    assert.throws(() => parseReadings(`${header}\n${row(timestamp)}`), /^Error: Line 2: invalid/);
  });
}

for (const value of ["", " ", "NaN", "Infinity", "-Infinity", "1e999", "0x10", "12junk"]) {
  for (let column = 0; column < 3; column += 1) {
    test(`rejects invalid level ${JSON.stringify(value)} in column ${column + 2}`, () => {
      const levels = ["35", "43", "40"];
      levels[column] = value;
      assert.throws(() => parseReadings(`${header}\n${row("2026-10-23T19:00:00Z", levels.join(","))}`), /Line 2: .*finite number/);
    });
  }
}

test("accepts CRLF, optional final newline, finite decimal numbers and equivalent zero offsets", () => {
  const csv = `${header}\r\n${row("2026-10-23T19:00:00Z", "-1.5,+2,3e1")}\r\n${row("2026-10-23T19:00:01+00:00")}`;
  const readings = parseReadings(csv);
  assert.equal(readings[1].epochSeconds - readings[0].epochSeconds, 1);
  assert.equal(readings[0].dba, -1.5);
  assert.equal(readings[0].band125, 30);
  assert.deepEqual(parseReadings(`${csv}\r\n`), readings);
  assert.deepEqual(parseReadings(`${header}\n`), []);
});

test("accepts leap dates, early years, fractional seconds and non-zero offsets", () => {
  for (const timestamp of ["2000-02-29T12:00:00Z", "0001-01-01T00:00:00Z", "2026-10-23T19:00:00.125+05:30", "2026-10-23T19:00:00-03:30"]) {
    assert.equal(parseReadings(`${header}\n${row(timestamp)}`)[0].epochSeconds, Date.parse(timestamp) / 1000);
  }
});

test("fixture has two sustained bass sessions, an eight-second traffic spike and an interior five-minute gap", () => {
  const readings = parseReadings(readFileSync(fixture, "utf8"));
  const median = (key) => {
    const values = readings.map((reading) => reading[key]).sort((a, b) => a - b);
    return (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
  };
  const median63 = median("band63");
  const median125 = median("band125");
  const raised = (reading) => reading.band63 >= median63 + 10 && reading.band125 >= median125 + 10;
  const sessions = [];
  for (const reading of readings.filter(raised)) {
    const session = sessions.at(-1);
    if (session && reading.epochSeconds === session.at(-1).epochSeconds + 1) session.push(reading);
    else sessions.push([reading]);
  }
  assert.equal(sessions.length, 2);
  assert.deepEqual(sessions.map((session) => session.length), [1800, 2400]);
  assert.ok(sessions.every((session) => session.length >= 600));
  assert.ok(sessions.some((session) => session.at(-1).epochSeconds > Date.parse("2026-10-23T23:00:00Z") / 1000));
  const traffic = readings.filter((reading) => reading.dba >= 65);
  assert.equal(traffic.length, 8);
  traffic.forEach((reading, i) => {
    assert.ok(reading.band63 < median63 + 10 && reading.band125 < median125 + 10);
    if (i) assert.equal(reading.epochSeconds - traffic[i - 1].epochSeconds, 1);
  });
  const gaps = readings.flatMap((reading, i) => i && reading.epochSeconds - readings[i - 1].epochSeconds > 1
    ? [[readings[i - 1].epochSeconds + 1, reading.epochSeconds]] : []);
  assert.equal(gaps.length, 1);
  const [start, end] = gaps[0];
  assert.equal(end - start, 300);
  const windowStart = Math.floor(start / 900) * 900;
  assert.ok(start > windowStart && end < windowStart + 900);
});

test("generator reproduces committed fixture byte for byte in a temporary file", () => {
  const directory = mkdtempSync(join(tmpdir(), "noise-monitor-evening-"));
  try {
    const output = join(directory, "evening.csv");
    execFileSync(process.execPath, [new URL("fixtures/generate-evening.js", import.meta.url).pathname, output]);
    assert.deepEqual(readFileSync(output), readFileSync(fixture));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
