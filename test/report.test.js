import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { renderReport } from "../src/report.js";

const session = {
  start: "2026-10-23T20:00:00+00:00", end: "2026-10-23T20:30:00+00:00",
  durationSeconds: 1800, laeq: 55, lamax: 56.2, lateNight: false,
};
const window = {
  start: "2026-10-23T20:00:00+00:00", end: "2026-10-23T20:15:00+00:00",
  count: 900, laeq: 55, lamax: 56.2, la90: 54.1, complete: true,
};
const render = (options = {}) => renderReport({ sessions: [session], windows: [window], source: "evening.csv", ...options });
const root = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));

test("report is a complete self-contained document and escapes hostile source text", () => {
  const source = '<script>alert("x")</script> & \'quoted\'';
  const html = render({ source });
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<html lang="en-GB">/);
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /<meta name="viewport"/);
  assert.equal((html.match(/<style>/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<script|<link|<img|src\s*=|href\s*=|url\(/i);
  assert.ok(html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quoted&#39;"));
  assert.ok(!html.includes(source));
  assert.equal((html.match(/<table>/g) ?? []).length, 2);
});

test("every interpolated table value is escaped, including timestamp, number and level fields", () => {
  const hostile = '<b title="x">&\'</b>';
  const html = render({
    source: hostile,
    sessions: [{ ...session, start: hostile, end: hostile, laeq: hostile, lamax: hostile }],
    windows: [{ ...window, start: hostile, end: hostile, count: hostile, laeq: hostile, lamax: hostile, la90: hostile }],
  });
  assert.ok(!html.includes(hostile));
  assert.equal((html.match(/&lt;b title=&quot;x&quot;&gt;&amp;&#39;&lt;\/b&gt;/g) ?? []).length, 11);
});

test("relative-level notice is shown unless calibrated is strictly true", () => {
  for (const calibrated of [undefined, false, null, "true", 1]) {
    const html = render({ calibrated });
    assert.match(html, /Levels are relative/);
    assert.match(html, /uncalibrated microphone/);
  }
  const html = render({ calibrated: true });
  assert.doesNotMatch(html, /Levels are relative/);
  assert.match(html, /Levels are from a calibrated microphone/);
});

test("each late-night row has a visible marker; other rows do not, with readable durations and levels", () => {
  const html = render({ sessions: [session, { ...session, lateNight: true }, { ...session, lateNight: true, durationSeconds: 3661 }] });
  const rows = html.match(/<tr>.*?<\/tr>/g).slice(1, 4);
  assert.doesNotMatch(rows[0], /Late night/);
  assert.equal((rows[1].match(/Late night/g) ?? []).length, 1);
  assert.equal((rows[2].match(/Late night/g) ?? []).length, 1);
  assert.match(rows[0], /30 min 0 s/);
  assert.match(rows[2], /1 h 1 min 1 s/);
  assert.match(rows[0], /<td>55\.0<\/td><td>56\.2<\/td>/);
  assert.match(html, /background: #E69F00; color: #222/);
});

test("incomplete windows and null levels are clear and empty sessions have an explicit message", () => {
  const html = render({ sessions: [], windows: [window, { ...window, complete: false, count: 0, laeq: null, lamax: null, la90: null }] });
  assert.match(html, /No music sessions detected\./);
  assert.equal((html.match(/Incomplete/g) ?? []).length, 1);
  assert.match(html, /<td>0<\/td><td>—<\/td><td>—<\/td><td>—<\/td><td>Incomplete<\/td>/);
  assert.match(html, /— means no readings/);
});

test("CLI writes both fixture sessions, late-night and relative notices, and only the input basename", () => {
  const directory = mkdtempSync(join(tmpdir(), "noise-monitor-report-"));
  try {
    const output = join(directory, "report.html");
    const input = fileURLToPath(new URL("fixtures/evening.csv", import.meta.url));
    const result = spawnSync(process.execPath, [cli, input, output], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    const html = readFileSync(output, "utf8");
    for (const timestamp of ["20:00:00", "20:30:00", "22:50:00", "23:30:00"]) assert.ok(html.includes(`2026-10-23T${timestamp}+00:00`));
    const sessionTable = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
    assert.equal((sessionTable.match(/<tr>/g) ?? []).length, 2);
    assert.equal((sessionTable.match(/Late night/g) ?? []).length, 1);
    assert.match(html, /Levels are relative/);
    assert.match(html, /Source: evening\.csv/);
    assert.ok(!html.includes(dirname(input)));
    assert.doesNotMatch(html, /<script|<link|<img|src\s*=|href\s*=|url\(/i);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("CLI wrong argument counts exit 2 with usage on stderr", () => {
  for (const args of [[], ["one"], ["one", "two", "three"]]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage: node src\/cli\.js <readings\.csv> <out\.html>/);
  }
});

test("CLI read, parse and write failures exit 1 with their reason on stderr", () => {
  const directory = mkdtempSync(join(tmpdir(), "noise-monitor-errors-"));
  try {
    const malformed = join(directory, "malformed.csv");
    writeFileSync(malformed, "timestamp,dba,band63,band125\ninvalid,35,43,40\n");
    const fixture = fileURLToPath(new URL("fixtures/evening.csv", import.meta.url));
    for (const [input, output, reason] of [
      [join(directory, "missing.csv"), join(directory, "report.html"), /ENOENT/],
      [malformed, join(directory, "report.html"), /Line 2: timestamp must be ISO 8601/],
      [fixture, join(directory, "missing", "report.html"), /ENOENT/],
    ]) {
      const result = spawnSync(process.execPath, [cli, input, output], { encoding: "utf8", cwd: root });
      assert.equal(result.status, 1);
      assert.match(result.stderr, reason);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
