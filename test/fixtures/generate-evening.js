import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// An optional output path lets tests reproduce the fixture without changing it.
const output = process.argv[2] ?? fileURLToPath(new URL("evening.csv", import.meta.url));
const start = Date.parse("2026-10-23T19:00:00+00:00");
const rows = ["timestamp,dba,band63,band125"];
for (let second = 0; second < 6 * 3600; second += 1) {
  // Missing 21:05–21:10, wholly inside the 21:00–21:15 clock window.
  if (second >= 7500 && second < 7800) continue;
  const music = (second >= 3600 && second < 5400) || (second >= 13800 && second < 16200);
  const traffic = second >= 6000 && second < 6008;
  // Slow deterministic variation gives a quiet background and sustained bass.
  const variation = Math.sin(second / 53) * 0.8 + Math.sin(second / 211) * 0.4;
  const dba = (traffic ? 68 : music ? 55 : 35) + variation;
  const band63 = (music ? 64 : 43) + variation;
  const band125 = (music ? 61 : 40) + variation;
  const timestamp = new Date(start + second * 1000).toISOString().replace(".000Z", "+00:00");
  rows.push(`${timestamp},${dba.toFixed(2)},${band63.toFixed(2)},${band125.toFixed(2)}`);
}
writeFileSync(output, `${rows.join("\n")}\n`);
