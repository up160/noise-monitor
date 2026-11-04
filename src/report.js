function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function duration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${hours ? `${hours} h ` : ""}${minutes} min ${seconds % 60} s`;
}

/** Render a self-contained report with escaped text and no external resources. */
export function renderReport({ sessions, windows, source, calibrated }) {
  const cell = (value) => `<td>${escapeHtml(value)}</td>`;
  const level = (value) => cell(value === null ? "—" : typeof value === "number" ? value.toFixed(1) : value);
  const sessionRows = sessions.map((session) => `<tr>${cell(session.start)}${cell(session.end)}${cell(duration(session.durationSeconds))}${level(session.laeq)}${level(session.lamax)}<td>${session.lateNight ? '<span class="badge">Late night</span>' : ""}</td></tr>`).join("\n");
  const windowRows = windows.map((window) => `<tr>${cell(window.start)}${cell(window.end)}${cell(window.count)}${level(window.laeq)}${level(window.lamax)}${level(window.la90)}${cell(window.complete ? "" : "Incomplete")}</tr>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Noise monitoring report</title>
<style>
  body { font-family: system-ui, sans-serif; color: #222; background: #fff; margin: 2rem; line-height: 1.5; }
  main { max-width: 90rem; margin: auto; }
  h1, h2 { line-height: 1.2; }
  .notice { padding: 1rem; background: #f3f3f3; border-left: 4px solid #666; }
  .table-wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0 2rem; font-variant-numeric: tabular-nums; }
  caption { text-align: left; font-weight: bold; margin-bottom: .5rem; }
  th, td { padding: .6rem; border: 1px solid #ccc; text-align: left; }
  th { background: #f3f3f3; }
  .badge { display: inline-block; background: #E69F00; color: #222; padding: .15rem .5rem; border-radius: .25rem; white-space: nowrap; }
  @media print { body { margin: 0; font-size: 10pt; } .table-wrap { overflow: visible; } tr { break-inside: avoid; } }
</style>
</head>
<body><main>
<h1>Noise monitoring report</h1>
<p>Source: ${escapeHtml(source)}</p>
<p class="notice">${escapeHtml(calibrated === true
    ? "Levels are from a calibrated microphone."
    : "Levels are relative: readings come from an uncalibrated microphone.")}</p>
<h2>Music sessions</h2>
${sessions.length ? "" : "<p>No music sessions detected.</p>"}
<div class="table-wrap"><table>
<caption>Detected music sessions</caption>
<thead><tr><th scope="col">Start</th><th scope="col">End (exclusive)</th><th scope="col">Duration</th><th scope="col">LAeq dB(A)</th><th scope="col">LAmax dB(A)</th><th scope="col">Note</th></tr></thead>
<tbody>${sessionRows}</tbody>
</table></div>
<h2>15-minute windows</h2>
<div class="table-wrap"><table>
<caption>Window levels (— means no readings)</caption>
<thead><tr><th scope="col">Start</th><th scope="col">End (exclusive)</th><th scope="col">Readings</th><th scope="col">LAeq dB(A)</th><th scope="col">LAmax dB(A)</th><th scope="col">LA90 dB(A)</th><th scope="col">Note</th></tr></thead>
<tbody>${windowRows}</tbody>
</table></div>
</main></body>
</html>`;
}
