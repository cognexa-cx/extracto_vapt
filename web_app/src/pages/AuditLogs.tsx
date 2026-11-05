import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ClipboardList, Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Loading from "../components/common/Loading";
import AuditLogDetailModal from "../components/auditLogs/AuditLogDetailModal";
import ExportDropdown from "../components/common/ExportDropdown";
import auditLogsService from "../services/auditLogsService";
import { DATE_PRESETS, resolveDatePreset } from "../utils/dateRangePresets";
import { exportRowsToExcel, getDateStamp } from "../utils/exportGenericUtils";

const ACTION_BADGE = {
  Login: "bg-blue-50 text-blue-700",
  "Login Failed": "bg-rose-50 text-rose-600",
  Logout: "bg-slate-100 text-slate-600",
  Create: "bg-emerald-50 text-emerald-700",
  Update: "bg-amber-50 text-amber-700",
  Delete: "bg-rose-50 text-rose-600",
  Approve: "bg-emerald-50 text-emerald-700",
  Reject: "bg-rose-50 text-rose-600",
  Activate: "bg-emerald-50 text-emerald-700",
  Deactivate: "bg-slate-100 text-slate-600",
  "Permission Change": "bg-purple-50 text-purple-700",
  Export: "bg-blue-50 text-blue-700",
};

const PAGE_SIZE = 30;

const AuditLogs = () => {
  const [actions, setActions] = useState([]);
  const [modules, setModules] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => {
    auditLogsService
      .getMeta()
      .then((meta) => {
        setActions(meta.actions || []);
        setModules(meta.modules || []);
      })
      .catch(() => {});
  }, []);

  // Search waits for a pause in typing instead of hitting the server on every
  // keystroke, and only the newest request may write its result (a slow older
  // response used to overwrite a newer one).
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const myReq = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await auditLogsService.getLogs({
        q: debouncedQuery,
        action: actionFilter,
        module: moduleFilter,
        startDate,
        endDate,
      });
      if (myReq !== reqId.current) return;
      setRows(result.data);
    } catch (err) {
      if (myReq !== reqId.current) return;
      setError(err.response?.data?.detail?.message || err.message || "Failed to load audit logs");
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }, [debouncedQuery, actionFilter, moduleFilter, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, actionFilter, moduleFilter, startDate, endDate]);

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === "custom") return;
    const range = resolveDatePreset(preset);
    setStartDate(range?.startDate || "");
    setEndDate(range?.endDate || "");
  };

  const hasFilters = query || actionFilter || moduleFilter || datePreset || startDate || endDate;

  const clearFilters = () => {
    setQuery("");
    setActionFilter("");
    setModuleFilter("");
    setDatePreset("");
    setStartDate("");
    setEndDate("");
  };

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === "desc" ? -diff : diff;
    });
  }, [rows, sortOrder]);

  // Selection persists across pages (a Set of log ids) so switching pages
  // doesn't lose what was checked elsewhere. Export uses the selection when
  // anything is checked; with nothing checked it falls back to exporting
  // every row the current filters/sort produced.
  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  const allOnPageSelected = paginatedRows.length > 0 && paginatedRows.every((log) => selectedIds.has(log.id));
  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) paginatedRows.forEach((log) => next.delete(log.id));
      else paginatedRows.forEach((log) => next.add(log.id));
      return next;
    });
  };

  const toExportRow = (log) => ({
    Timestamp: new Date(log.created_at).toLocaleString(),
    User: log.actor_email || log.actor_emp_id || "-",
    Action: log.action,
    Module: log.module,
    Description: log.description,
    Status: log.status,
  });

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const source = selectedIds.size > 0 ? sortedRows.filter((log) => selectedIds.has(log.id)) : sortedRows;
      const mapped = source.map(toExportRow);
      await exportRowsToExcel(mapped, `audit_logs_${getDateStamp()}`, "Audit Logs");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="animate-in fade-in duration-500 flex flex-col gap-5"
      style={{ height: "calc(100vh - 130px)" }}
    >
      <div className="shrink-0">
        <PageHeader icon={ClipboardList} title="Audit Logs" subtitle="Track user actions across the system" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search description, entity ID…"
              className="w-full sm:w-64 rounded-md border border-slate-300 bg-white py-1.5 pl-7 pr-3 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="rounded-md border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            {datePreset === "custom" && (
              <>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white py-1.5 px-2 text-xs focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white py-1.5 px-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </>
            )}
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="rounded-md border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="desc">Latest First</option>
            <option value="asc">Oldest First</option>
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2"
            >
              Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="text-xs font-semibold text-indigo-600">{selectedIds.size} selected</span>
            )}
            <ExportDropdown onExportExcel={handleExportExcel} isLoading={isExporting} />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-10 flex-1">
            <Loading size="lg" fullScreen={false} />
          </div>
        ) : error ? (
          <div className="p-8 text-center flex-1">
            <p className="text-red-600 text-sm font-medium mb-3">{error}</p>
            <button onClick={load} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
              Try Again
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            {/* Natural (table-auto) column sizing + whitespace-nowrap —
                no fixed percentage-column math to get subtly wrong on a
                different font/zoom/browser and silently truncate a header
                with real room elsewhere in the table. Every column is
                exactly as wide as its content needs; if that's wider than
                the card, the parent overflow-auto scrolls horizontally
                instead of ever cutting text off. */}
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-xs text-slate-500 border-b border-slate-200">
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAllOnPage}
                      className="h-3.5 w-3.5 accent-indigo-600"
                    />
                  </th>
                  <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">User</th>
                  <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">Action</th>
                  <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">Module</th>
                  <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">Description</th>
                  <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      No audit log entries found
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((log) => (
                    <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(log.id)}
                          onChange={() => toggleRow(log.id)}
                          className="h-3.5 w-3.5 accent-indigo-600"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                        {log.actor_email || log.actor_emp_id || "—"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            ACTION_BADGE[log.action] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">{log.module}</td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{log.description}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.status === "Success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => setSelectedLog(log)}
                          title="View Detail"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && rows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 shrink-0 text-xs text-slate-500">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AuditLogDetailModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  );
};

export default AuditLogs;
