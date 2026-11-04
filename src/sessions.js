const roundLevel = (value) => Math.round(value * 10) / 10;

function lowerBound(values, value) {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (values[middle] < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Detect music against earlier non-music readings, holding the floor during candidates. */
export function detectSessions(readings, {
  floorWindowSeconds = 600, floorPercentile = 10, dbaMarginDb = 6, bandMarginDb = 8,
  minMusicSeconds = 120, maxBridgeSeconds = 30, maxReadingGapSeconds = 60,
  lateNightStartHour = 23, lateNightEndHour = 7,
} = {}) {
  for (const [name, value, minimum] of [
    ["floorWindowSeconds", floorWindowSeconds, 1], ["minMusicSeconds", minMusicSeconds, 1],
    ["maxBridgeSeconds", maxBridgeSeconds, 0], ["maxReadingGapSeconds", maxReadingGapSeconds, 0],
  ]) {
    if (!Number.isSafeInteger(value) || value < minimum) {
      throw new RangeError(`${name} must be a safe integer >= ${minimum}`);
    }
  }
  if (!Number.isFinite(floorPercentile) || floorPercentile <= 0 || floorPercentile > 100) {
    throw new RangeError("floorPercentile must be in (0, 100]");
  }
  for (const [name, value] of [["dbaMarginDb", dbaMarginDb], ["bandMarginDb", bandMarginDb]]) {
    if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  }
  for (const [name, value] of [["lateNightStartHour", lateNightStartHour], ["lateNightEndHour", lateNightEndHour]]) {
    if (!Number.isInteger(value) || value < 0 || value > 23) {
      throw new RangeError(`${name} must be an integer from 0 to 23`);
    }
  }
  if (lateNightStartHour === lateNightEndHour) {
    throw new RangeError("lateNightStartHour and lateNightEndHour must differ");
  }
  if (readings.length === 0) return [];

  const offset = readings[0].timestamp.match(/Z$|[+-]\d{2}:\d{2}$/)[0];
  const offsetSeconds = offset === "Z" ? 0
    : (offset[0] === "-" ? -1 : 1)
      * (Number(offset.slice(1, 3)) * 3600 + Number(offset.slice(4)) * 60);
  const format = (seconds) => new Date((seconds + offsetSeconds) * 1000)
    .toISOString().replace(/(?:\.000)?Z$/, offset);
  const nightStart = lateNightStartHour * 3600;
  const nightEnd = lateNightEndHour * 3600 + (lateNightEndHour <= lateNightStartHour ? 86400 : 0);
  const keys = ["dba", "band63", "band125"];
  const pool = [];
  const sorted = keys.map(() => []);
  const sessions = [];
  let candidate;

  function closeCandidate() {
    const { firstMusic, lastMusic, musicCount } = candidate;
    if (musicCount >= minMusicSeconds) {
      const start = readings[firstMusic].epochSeconds;
      const end = readings[lastMusic].epochSeconds + 1;
      const levels = readings.slice(firstMusic, lastMusic + 1).map((reading) => reading.dba);
      const maximum = levels.reduce((max, level) => Math.max(max, level), -Infinity);
      const energy = levels.reduce((sum, level) => sum + 10 ** ((level - maximum) / 10), 0);
      const localStart = start + offsetSeconds;
      const localEnd = end + offsetSeconds;
      // The first night whose exclusive end is after this session's start.
      const day = Math.floor((localStart - nightEnd) / 86400) + 1;
      sessions.push({
        start: format(start), end: format(end), durationSeconds: end - start,
        laeq: roundLevel(maximum + 10 * Math.log10(energy / levels.length)),
        lamax: roundLevel(maximum), lateNight: localEnd > day * 86400 + nightStart,
      });
    }
    candidate = undefined;
  }

  for (let index = 0; index < readings.length; index += 1) {
    const reading = readings[index];
    const time = reading.epochSeconds;
    while (pool.length && pool[0].epochSeconds < time - floorWindowSeconds) {
      const expired = pool.shift();
      keys.forEach((key, i) => sorted[i].splice(lowerBound(sorted[i], expired[key]), 1));
    }
    if (candidate && (time - readings[index - 1].epochSeconds - 1 > maxReadingGapSeconds
      || time - readings[candidate.lastMusic].epochSeconds - 1 > maxBridgeSeconds)) {
      closeCandidate();
    }
    const rank = Math.ceil(pool.length * floorPercentile / 100) - 1;
    const floor = candidate ? candidate.heldFloor : pool.length ? sorted.map((values) => values[rank]) : null;
    const music = floor && reading.dba >= floor[0] + dbaMarginDb
      && (reading.band63 >= floor[1] + bandMarginDb || reading.band125 >= floor[2] + bandMarginDb);
    if (music) {
      if (!candidate) candidate = { heldFloor: floor, firstMusic: index, lastMusic: index, musicCount: 0 };
      candidate.lastMusic = index;
      candidate.musicCount += 1;
    } else {
      pool.push(reading);
      keys.forEach((key, i) => sorted[i].splice(lowerBound(sorted[i], reading[key]), 0, reading[key]));
    }
  }
  if (candidate) closeCandidate();
  return sessions;
}
