import reportsService from "./reportsService";
import masterDataV2Service from "./masterDataV2Service";
import userManagementService from "./userManagementService";
import auditLogsService from "./auditLogsService";
import { MASTER_ENTITY_ORDER, MASTER_ENTITIES } from "../utils/masterDataV2Config";

// Calendar day in India time (same day the rest of the app shows/filters by).
const toYMD = (d) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const countBy = (arr, keyFn) => {
  const map = new Map();
  for (const item of arr) {
    const key = keyFn(item);
    if (key === null || key === undefined) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
};

/**
 * Analytics — one aggregation layer over data every other page already
 * fetches piecemeal (extraction records via Reports/Dashboard, master data,
 * users, audit logs). Nothing here is a separate/fake data source; it's the
 * same live app data, just counted and grouped for charts instead of shown
 * as rows.
 */
const analyticsService = {
  // Master data / user counts reflect current state (a vendor doesn't have
  // a meaningful "date range" for a total-count purpose) so only the
  // event-shaped data — extraction records and audit logs — is date-filtered.
  getAnalytics: async ({ startDate, endDate }: any = {}) => {
    const [recordsResult, masterResults, employeesResult, auditResult] = await Promise.all([
      reportsService.getRecords({ startDate, endDate }),
      Promise.all(MASTER_ENTITY_ORDER.map((key) => masterDataV2Service.getAll(key))),
      userManagementService.getAllEmployees().catch(() => ({ data: [] })),
      auditLogsService.getLogs({ startDate, endDate }).catch(() => ({ data: [] })),
    ]);

    const records = recordsResult.data || [];
    const employees = employeesResult.data || [];
    const auditLogs = auditResult.data || [];

    // ── Direction / entry-type breakdown ──────────────────────────────────
    const directionCounts = { Inward: 0, Outward: 0, Returnable: 0, Manual: 0 };
    for (const r of records) {
      if (r.entry_type === "manual") {
        directionCounts.Manual += 1;
      } else if (r.inward_outward === "Inward") {
        directionCounts.Inward += 1;
      } else if (r.inward_outward === "Outward") {
        directionCounts.Outward += 1;
      } else if (r.inward_outward === "Returnable") {
        directionCounts.Returnable += 1;
      }
    }

    // ── Approval breakdown ─────────────────────────────────────────────────
    const approved = records.filter((r) => r.approval_status === "Approve").length;
    const rejected = records.filter((r) => r.approval_status === "Reject").length;
    const approvalRate = records.length ? Math.round((approved / records.length) * 100) : 0;

    // ── Returnable status breakdown ────────────────────────────────────────
    const returnableRecords = records.filter((r) => r.inward_outward === "Returnable");
    const returnedCount = returnableRecords.filter((r) => r.return_status === "returned").length;
    const activeReturnCount = returnableRecords.filter((r) => r.return_status !== "returned").length;

    // ── Master data breakdown ──────────────────────────────────────────────
    const masterBreakdown = MASTER_ENTITY_ORDER.map((key, i) => {
      const rows = masterResults[i].data || [];
      const active = rows.filter((r) => r.status === "Active").length;
      const blocked = rows.length - active;
      return { name: MASTER_ENTITIES[key].label, total: rows.length, active, blocked };
    });
    const totalMasterRecords = masterBreakdown.reduce((sum, m) => sum + m.total, 0);

    // ── User roles breakdown ────────────────────────────────────────────────
    const roleCounts = countBy(employees, (e) => e.Designation || "Unassigned");
    const roleBreakdown = Array.from(roleCounts.entries()).map(([name, value]) => ({ name, value }));
    const activeUsers = employees.filter((e) => e.Status === "Active").length;
    const inactiveUsers = employees.length - activeUsers;

    // ── Audit activity breakdown ────────────────────────────────────────────
    const actionCounts = countBy(auditLogs, (a) => a.action);
    const auditBreakdown = Array.from(actionCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const failedEvents = auditLogs.filter((a) => a.status === "Failed").length;

    const todayStr = toYMD(new Date());
    const todayRecords = records.filter((r) => toYMD(r.action_date) === todayStr).length;
    const todayActivity = auditLogs.filter((a) => toYMD(a.created_at) === todayStr).length;

    // ── Recent activity ─────────────────────────────────────────────────────
    // Documents respect the page's date filter (they come from the already
    // range-scoped `records`); users are intentionally NOT date-filtered
    // (see the note above getAnalytics) so this always shows the true most
    // recently added people regardless of the selected range.
    const recentRecords = [...records]
      .sort((a, b) => new Date(b.action_date).getTime() - new Date(a.action_date).getTime())
      .slice(0, 6);
    const recentUsers = [...employees]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 6);

    return {
      // Raw records kept around so the page can recompute the main volume
      // graph instantly when the user changes the date range, with no
      // second network round-trip.
      records,
      kpis: {
        totalRecords: records.length,
        totalVendors: masterBreakdown[0]?.total || 0,
        totalMasterRecords,
        totalUsers: employees.length,
        activeUsers,
        totalAuditEvents: auditLogs.length,
        approvalRate,
        todayRecords,
        todayActivity,
        failedEvents,
      },
      directionCounts,
      approvalBreakdown: [
        { name: "Approved", value: approved },
        { name: "Rejected", value: rejected },
      ],
      returnableBreakdown: [
        { name: "Active", value: activeReturnCount },
        { name: "Returned", value: returnedCount },
      ],
      masterBreakdown,
      roleBreakdown,
      userStatusBreakdown: [
        { name: "Active", value: activeUsers },
        { name: "Inactive", value: inactiveUsers },
      ],
      auditBreakdown,
      recentRecords,
      recentUsers,
    };
  },
};

export default analyticsService;
