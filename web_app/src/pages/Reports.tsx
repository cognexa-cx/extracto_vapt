import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { TrendingUp, Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Loading from "../components/common/Loading";
import ReportDetailModal from "../components/reports/ReportDetailModal";
import ExportDropdown from "../components/common/ExportDropdown";
import reportsService from "../services/reportsService";
import { REPORT_TABS, REPORT_TAB_ORDER } from "../utils/reportsConfig";
import { DATE_PRESETS, resolveDatePreset } from "../utils/dateRangePresets";
import { exportRowsToExcel, getDateStamp } from "../utils/exportGenericUtils";

const STATUS_BADGE = {
  Approve: "bg-emerald-50 text-emerald-700",
  Reject: "bg-rose-50 text-rose-600",
};

const RETURN_BADGE = {
  active: "bg-amber-50 text-amber-700",
  returned: "bg-emerald-50 text-emerald-700",
};

const PAGE_SIZE = 30;

const Reports = () => {
  const [activeTab, setActiveTab] = useState(REPORT_TAB_ORDER[0]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const config = REPORT_TABS[activeTab];
  const hasFilters = query || statusFilter || startDate || endDate;

  // Only the newest request may write its result -- switching tabs/filters
  // quickly used to let a slow older response overwrite the newer one.
  const reqId = useRef(0);
  const load = useCallback(async () => {
    const myReq = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await reportsService.getRecords({
        direction: config.direction,
        entryType: config.entryType,
        startDate,
        endDate,
        success: statusFilter === "Approve" ? true : statusFilter === "Reject" ? false : undefined,
      });
      if (myReq !== reqId.current) return;
      setRows(result.data);
    } catch (err) {
      if (myReq !== reqId.current) return;
      setError(err.response?.data?.detail?.message || err.message || "Failed to load reports");
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }, [config.direction, config.entryType, startDate, endDate, statusFilter]);

  useEffect(() => {
    setQuery("");
    setStatusFilter("");
    setDatePreset("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setSelectedIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === "custom") return;
    const range = resolveDatePreset(preset);
    setStartDate(range?.startDate || "");
    setEndDate(range?.endDate || "");
  };

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("");
    setDatePreset("");
    setStartDate("");
    setEndDate("");
  };

  // Free-text search stays client-side (over the already backend-filtered
  // direction/entry_type/date-range result), same pattern as Dashboard.
  const searchedRows = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((r) =>
      [
        r.vendor_name, r.invoice_number, r.vehicle_number, r.project_site,
        r.destination_site, r.document_type, r.approval_status, r.inward_outward, r.id,
      ]
        .filter((v) => v !== null && v !== undefined && v !== "")
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const sortedRows = useMemo(() => {
    return [...searchedRows].sort((a, b) => {
      const diff = new Date(a.action_date).getTime() - new Date(b.action_date).getTime();
      return sortOrder === "desc" ? -diff : diff;
    });
  }, [searchedRows, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  const renderCell = (row, col) => {
    const value = row[col.key];
    if (col.type === "date") {
      return value ? new Date(value).toLocaleDateString() : "—";
    }
    if (col.type === "returnStatus") {
      if (!value) return "—";
      return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RETURN_BADGE[value] || "bg-slate-100 text-slate-600"}`}>
          {value === "returned" ? "Returned" : "Active"}
        </span>
      );
    }
    if (col.key === "approval_status") {
      return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[value] || "bg-slate-100 text-slate-600"}`}>
          {value}
        </span>
      );
    }
    return value || "—";
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected = paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.has(r.id));
  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) paginatedRows.forEach((r) => next.delete(r.id));
      else paginatedRows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const source = selectedIds.size > 0 ? sortedRows.filter((r) => selectedIds.has(r.id)) : sortedRows;
      const mapped = source.map((row) => {
        const record = {};
        config.columns.forEach((col) => {
          const value = row[col.key];
          if (col.type === "date") {
            record[col.label] = value ? new Date(value).toLocaleDateString() : "-";
          } else if (col.type === "returnStatus") {
            record[col.label] = value ? (value === "returned" ? "Returned" : "Active") : "-";
          } else {
            record[col.label] = value ?? "-";
          }
        });
        return record;
      });
      await exportRowsToExcel(mapped, `${config.label.toLowerCase()}_report_${getDateStamp()}`, config.label);
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
        <PageHeader icon={TrendingUp} title="Reports" subtitle="Inward, outward, returnable & manual entry reports" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Tabs — horizontally scrollable so Inward/Outward/Returnable/
            Manual don't clip or squish on a narrow screen. */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 pt-2 shrink-0">
          {REPORT_TAB_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === key
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {REPORT_TABS[key].label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0">
          {/* Same as the tabs above, as a dropdown — a quicker way to
              switch between Inward/Outward/Returnable/Manual than clicking
              a tab, and keeps this filter bar consistent with the rest
              (every other control here is a dropdown too). */}
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="rounded-md border border-slate-300 bg-white py-1.5 px-3 text-xs font-semibold text-blue-600 focus:border-blue-500 focus:outline-none"
          >
            {REPORT_TAB_ORDER.map((key) => (
              <option key={key} value={key}>{REPORT_TABS[key].label}</option>
            ))}
          </select>
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={config.searchPlaceholder}
              className="w-full sm:w-64 rounded-md border border-slate-300 bg-white py-1.5 pl-7 pr-3 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="Approve">Approved</option>
            <option value="Reject">Rejected</option>
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
                  {config.columns.map((col) => (
                    <th key={col.key} className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={config.columns.length + 2} className="py-14 text-center text-slate-400">
                      No {config.label.toLowerCase()} records found
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                          className="h-3.5 w-3.5 accent-indigo-600"
                        />
                      </td>
                      {config.columns.map((col) => (
                        <td key={col.key} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                          {renderCell(row, col)}
                        </td>
                      ))}
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => setSelectedRecord(row)}
                          title="View"
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
        {!loading && !error && sortedRows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 shrink-0 text-xs text-slate-500">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sortedRows.length)} of {sortedRows.length}
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

      <ReportDetailModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
      />
    </div>
  );
};

export default Reports;
