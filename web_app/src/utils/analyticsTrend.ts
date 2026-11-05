// Builds the day-by-day series behind Analytics' main volume graph. Pure
// functions over already-fetched records/audit logs so the range toggle
// (7D/14D/30D/90D) can recompute instantly client-side with no refetch.

// Calendar day in India time (the day the rest of the app shows and filters
// by) -- NOT the UTC day, which put anything done between midnight and 5:30 AM
// on the previous day's bar.
const toYMD = (d) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const shiftYMD = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const formatDayLabel = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00`);
  // Short range: show weekday + day ("Mon 12"). Long range: just month/day.
  return days <= 14
    ? d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export function lastNDays(n) {
  const days = [];
  const today = toYMD(new Date());
  for (let i = n - 1; i >= 0; i--) days.push(shiftYMD(today, -i));
  return days;
}

// Every day from `start` to `end` inclusive (both YYYY-MM-DD strings).
function daysInRange(start, end) {
  const days = [];
  for (let d = start; d <= end && days.length < 3700; d = shiftYMD(d, 1)) days.push(d);
  return days;
}

type DayBucket = { Inward: number; Outward: number; Returnable: number; Manual: number };

function bucketRecords(records, dayKeys): Map<string, DayBucket> {
  const buckets = new Map<string, DayBucket>(dayKeys.map((d) => [d, { Inward: 0, Outward: 0, Returnable: 0, Manual: 0 }]));
  for (const r of records || []) {
    const day = toYMD(r.action_date);
    const bucket = buckets.get(day);
    if (!bucket) continue; // outside the selected range
    if (r.entry_type === "manual") bucket.Manual += 1;
    else if (r.inward_outward === "Inward") bucket.Inward += 1;
    else if (r.inward_outward === "Outward") bucket.Outward += 1;
    else if (r.inward_outward === "Returnable") bucket.Returnable += 1;
  }
  return buckets;
}

/**
 * Per-day counts split by record type — the series behind the main
 * "Volume Trend" graph. Each point: { date, label, Inward, Outward,
 * Returnable, Manual, Total }. Used as the default range (no explicit
 * from/to chosen yet).
 */
export function buildVolumeTrend(records, days = 30) {
  const dayKeys = lastNDays(days);
  const buckets = bucketRecords(records, dayKeys);
  return dayKeys.map((day) => {
    const b = buckets.get(day);
    const total = b.Inward + b.Outward + b.Returnable + b.Manual;
    return { date: day, label: formatDayLabel(day, days), ...b, Total: total };
  });
}

/**
 * Same shape as buildVolumeTrend, but for an explicit start/end date
 * (YYYY-MM-DD) instead of "last N days" — drives the graph once the user
 * picks a date range on the Analytics page.
 */
export function buildVolumeTrendRange(records, startDate, endDate) {
  const dayKeys = daysInRange(startDate, endDate);
  const buckets = bucketRecords(records, dayKeys);
  const span = dayKeys.length;
  return dayKeys.map((day) => {
    const b = buckets.get(day);
    const total = b.Inward + b.Outward + b.Returnable + b.Manual;
    return { date: day, label: formatDayLabel(day, span), ...b, Total: total };
  });
}
