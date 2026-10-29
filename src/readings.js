const HEADER = "timestamp,dba,band63,band125";
const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/;

function fail(line, reason) {
  throw new Error(`Line ${line}: ${reason}`);
}

function parseTimestamp(timestamp, line) {
  const match = TIMESTAMP.exec(timestamp);
  if (!match) fail(line, "timestamp must be ISO 8601 with an explicit offset");
  const [, year, month, day, hour, minute, second, fraction, offset, sign, oh, om] = match;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m < 1 || m > 12 || d < 1 || d > days[m - 1]) {
    fail(line, "invalid calendar date");
  }
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) {
    fail(line, "invalid time");
  }
  if (offset !== "Z" && (Number(oh) > 23 || Number(om) > 59)) {
    fail(line, "invalid offset");
  }
  const offsetMinutes = offset === "Z" ? 0 : (sign === "-" ? -1 : 1) * (Number(oh) * 60 + Number(om));
  // setUTCFullYear avoids Date.UTC's special treatment of years 00–99.
  const date = new Date(0);
  date.setUTCFullYear(y, m - 1, d);
  date.setUTCHours(Number(hour), Number(minute), Number(second), 0);
  const epochSeconds = date.getTime() / 1000 + Number(fraction ?? 0) - offsetMinutes * 60;
  return { epochSeconds, offsetMinutes };
}

/** Load validated CSV readings, preserving timestamp text, row order and gaps. */
export function parseReadings(csvText) {
  const lines = csvText.split(/\r?\n/);
  if (lines[0] !== HEADER) fail(1, `header must be exactly ${HEADER}`);
  // A final newline terminates the last row; other empty rows are malformed.
  if (lines.at(-1) === "") lines.pop();
  const readings = [];
  let fileOffset;
  for (let index = 1; index < lines.length; index += 1) {
    const line = index + 1;
    const fields = lines[index].split(",");
    if (fields.length !== 4) fail(line, "expected four CSV fields");
    const [timestamp, ...levels] = fields;
    const { epochSeconds, offsetMinutes } = parseTimestamp(timestamp, line);
    if (fileOffset !== undefined && offsetMinutes !== fileOffset) {
      fail(line, "timestamp offset differs from earlier rows");
    }
    fileOffset = offsetMinutes;
    const values = levels.map((value, i) => {
      if (!NUMBER.test(value) || !Number.isFinite(Number(value))) {
        fail(line, `${["dba", "band63", "band125"][i]} must be a finite number`);
      }
      return Number(value);
    });
    const previous = readings.at(-1);
    if (previous && epochSeconds <= previous.epochSeconds) {
      fail(line, epochSeconds === previous.epochSeconds ? "duplicate timestamp" : "out-of-order timestamp");
    }
    const [dba, band63, band125] = values;
    readings.push({ timestamp, epochSeconds, dba, band63, band125 });
  }
  return readings;
}
