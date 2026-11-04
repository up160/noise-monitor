import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { parseReadings } from "./readings.js";
import { windowLevels } from "./windows.js";
import { detectSessions } from "./sessions.js";
import { renderReport } from "./report.js";

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error("Usage: node src/cli.js <readings.csv> <out.html>");
  process.exitCode = 2;
} else {
  try {
    const [input, output] = args;
    const readings = parseReadings(readFileSync(input, "utf8"));
    const windows = windowLevels(readings);
    const sessions = detectSessions(readings);
    writeFileSync(output, renderReport({ sessions, windows, source: basename(input), calibrated: false }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
