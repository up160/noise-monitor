import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseReadings } from "./readings.js";
import { windowLevels } from "./windows.js";
import { detectSessions } from "./sessions.js";
import { renderReport } from "./report.js";

function isSameFile(input, output) {
  if (!existsSync(output)) return false;
  try {
    const inputStat = statSync(input);
    const outputStat = statSync(output);
    return inputStat.dev === outputStat.dev && inputStat.ino === outputStat.ino;
  } catch {
    return false;
  }
}

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error("Usage: node src/cli.js <readings.csv> <out.html>");
  process.exitCode = 2;
} else if (resolve(args[1]) === resolve(args[0]) || isSameFile(args[0], args[1])) {
  console.error("Output must not resolve to the input file");
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
