const roundLevel = (value) => Math.round(value * 10) / 10;

/** Aggregate ordered, validated readings from parseReadings into local clock windows. */
export function windowLevels(readings, { windowSeconds = 900 } = {}) {
  if (!Number.isSafeInteger(windowSeconds) || windowSeconds <= 0) {
    throw new RangeError("windowSeconds must be a positive safe integer");
  }
  if (readings.length === 0) return [];

  const offset = readings[0].timestamp.match(/Z$|[+-]\d{2}:\d{2}$/)[0];
  const offsetSeconds = offset === "Z" ? 0
    : (offset[0] === "-" ? -1 : 1)
      * (Number(offset.slice(1, 3)) * 3600 + Number(offset.slice(4)) * 60);
  const align = (seconds) => Math.floor((seconds + offsetSeconds) / windowSeconds)
    * windowSeconds - offsetSeconds;
  const format = (seconds) => new Date((seconds + offsetSeconds) * 1000)
    .toISOString().replace(".000Z", offset);
  const lastStart = align(readings.at(-1).epochSeconds);
  const windows = [];
  let index = 0;

  for (let start = align(readings[0].epochSeconds); start <= lastStart; start += windowSeconds) {
    const end = start + windowSeconds;
    const levels = [];
    while (index < readings.length && readings[index].epochSeconds < end) {
      levels.push(readings[index].dba);
      index += 1;
    }
    levels.sort((a, b) => a - b);
    const count = levels.length;
    const maximum = count ? levels[count - 1] : null;
    // Subtracting the maximum keeps the energy sum finite for large dB values.
    const energy = levels.reduce((sum, level) => sum + 10 ** ((level - maximum) / 10), 0);
    windows.push({
      start: format(start),
      end: format(end),
      count,
      complete: count >= windowSeconds * 0.8,
      laeq: count ? roundLevel(maximum + 10 * Math.log10(energy / count)) : null,
      lamax: count ? roundLevel(maximum) : null,
      la90: count ? roundLevel(levels[Math.ceil(count * 0.1) - 1]) : null,
    });
  }
  return windows;
}
