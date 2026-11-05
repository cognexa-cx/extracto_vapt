// Shared date-range presets (Reports, Analytics, Audit Logs, Master Data,
// User Management). All days are calendar days in India time (the day the
// tables show), both ends inclusive -- the backend shifts them to UTC when it
// queries, so the browser's own time zone never changes which day counts.
const IST = "Asia/Kolkata";

const todayYMD = () => new Date().toLocaleDateString("en-CA", { timeZone: IST });

const shiftDay = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const DATE_PRESETS = [
  { key: "", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "90d", label: "Last 90 Days" },
  { key: "custom", label: "Custom Range" },
];

/**
 * Resolve a preset key to { startDate, endDate } (YYYY-MM-DD, both
 * inclusive). Returns null for "" (no filter) and "custom" (caller
 * supplies its own from/to inputs instead). The older keys ("week",
 * "month", "3months") still resolve so nothing saved/stored breaks.
 */
export function resolveDatePreset(preset) {
  const today = todayYMD();

  switch (preset) {
    case "today":
      return { startDate: today, endDate: today };
    case "yesterday": {
      const y = shiftDay(today, -1);
      return { startDate: y, endDate: y };
    }
    case "7d":
    case "week":
      return { startDate: shiftDay(today, -6), endDate: today };
    case "30d":
      return { startDate: shiftDay(today, -29), endDate: today };
    case "month": {
      const first = `${today.slice(0, 8)}01`;
      return { startDate: first, endDate: today };
    }
    case "90d":
    case "3months":
      return { startDate: shiftDay(today, -89), endDate: today };
    default:
      return null;
  }
}
