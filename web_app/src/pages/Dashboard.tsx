import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import DashboardStats from "../components/dashboard/DashboardStats";
import DashboardTable from "../components/dashboard/DashboardTable";
import DashboardEditModal from "../components/dashboard/DashboardEditModal";
import useInvoiceData from "../hooks/useInvoiceData";
import invoiceService from "../services/invoiceService";
import { useAppContext } from "../context/AppContext";
import { RefreshCw, CalendarDays, X, ChevronDown, Check } from "lucide-react";

// ── Dashboard-wide period filter (calendar days in India time, inclusive) ──
const istToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const shiftDay = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const istDay = (v: any) => {
  const t = new Date(v);
  return isNaN(t.getTime())
    ? ""
    : t.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};
const PERIODS = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "90d", label: "Last 90 Days" },
  { id: "custom", label: "Custom" },
];
const periodRange = (id: string, from: string, to: string): [string, string] | null => {
  const t = istToday();
  switch (id) {
    case "today": return [t, t];
    case "yesterday": return [shiftDay(t, -1), shiftDay(t, -1)];
    case "7d": return [shiftDay(t, -6), t];
    case "30d": return [shiftDay(t, -29), t];
    case "90d": return [shiftDay(t, -89), t];
    case "custom": return from || to ? [from || "0000-01-01", to || "9999-12-31"] : null;
    default: return null;
  }
};

// Compact dropdown for the dashboard-wide period filter.
const PeriodDropdown = ({
  period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo,
  range, hasAnyFilter, onClear,
}) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  // The panel is rendered in <body> (portal) and positioned under the button,
  // so no card, stacking context or overflow clip in the stats section can
  // overlap or cut it off.
  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const close = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const current = PERIODS.find((p) => p.id === period) || PERIODS[0];
  const summary =
    period === "custom"
      ? customFrom || customTo
        ? `${customFrom || "…"} to ${customTo || "…"}`
        : "Custom"
      : current.label;

  return (
    <div className="flex justify-end">
      <div>
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium shadow-sm transition-all ${
            period !== "all"
              ? "bg-teal-50 text-teal-700 border-teal-300"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>{summary}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 10000 }}
            className="w-64 max-h-[80vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          >
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id);
                  if (p.id !== "custom") setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  period === p.id
                    ? "bg-teal-50 font-semibold text-teal-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p.label}
                {period === p.id && <Check className="w-4 h-4" />}
              </button>
            ))}

            {period === "custom" && (
              <div className="mt-1 space-y-2 border-t border-slate-100 px-3 pb-2 pt-3">
                <div>
                  <label className="text-[10px] text-slate-500">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo || undefined}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">To</label>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom || undefined}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            {range && period !== "custom" && (
              <p className="px-3 pt-1 text-[11px] text-slate-500">
                {range[0] === range[1] ? range[0] : `${range[0]} to ${range[1]}`}
              </p>
            )}

            {hasAnyFilter && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border-t border-slate-100 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { showNotification } = useAppContext();
  const [activeFilter, setActiveFilter] = useState(null);
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { stats, records, loading, error, refresh, silentPoll } = useInvoiceData({
    autoFetch: true,
    params: {},
  });

  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Auto-refresh dashboard data so records saved elsewhere (e.g. from the
  // Tab app) show up here without the user needing to click Sync Now or
  // reload the page. A once-an-hour poll left an already-open dashboard
  // tab showing stale data for up to an hour after a real save — this
  // polls every 20s, and also refetches immediately whenever the tab
  // regains focus/visibility (the common "switched away and back" case).
  // Uses silentPoll (not refresh) so it doesn't flash the full-page loading
  // spinner on every background check — only the initial load and an
  // explicit Sync Now click do that.
  useEffect(() => {
    const pollTimer = setInterval(() => {
      silentPoll();
    }, 20 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") silentPoll();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [silentPoll]);

  useEffect(() => {
    setLastSyncTime(new Date());
  }, []);

  // Records inside the chosen period (by approved date). Everything below --
  // stat cards, table, counts -- is built from these, so the whole dashboard
  // follows the period. "All Time" keeps the server-side totals.
  const range = periodRange(period, customFrom, customTo);
  const periodRecords = range
    ? records.filter((r) => {
        const d = istDay(r.action_date || r.invoice_date);
        return d !== "" && d >= range[0] && d <= range[1];
      })
    : records;
  const displayStats = range
    ? (() => {
        const dir = (r) => r.inward_outward?.toLowerCase();
        const today = istToday();
        return [
          { label: "Total Records", value: String(periodRecords.length) },
          { label: "Inward", value: String(periodRecords.filter((r) => dir(r) === "inward").length) },
          { label: "Outward", value: String(periodRecords.filter((r) => dir(r) === "outward").length) },
          { label: "Returnable", value: String(periodRecords.filter((r) => dir(r) === "returnable").length) },
          { label: "Manual", value: String(periodRecords.filter((r) => r.entry_type?.toLowerCase() === "manual").length) },
          { label: "Today", value: String(periodRecords.filter((r) => istDay(r.action_date) === today).length) },
        ];
      })()
    : stats;

  const coloredStats =
    displayStats?.map((stat) => {
      const label = stat.label?.toUpperCase() || "";
      let color = "slate";
      let filterKey = null;

      if (label.includes("TOTAL")) {
        color = "slate";
        filterKey = "total";
      } else if (label.includes("INWARD")) {
        color = "blue";
        filterKey = "inward";
      } else if (label.includes("OUTWARD")) {
        color = "cyan";
        filterKey = "outward";
      } else if (label.includes("RETURNABLE")) {
        color = "amber";
        filterKey = "returnable";
      } else if (label.includes("MANUAL")) {
        color = "rose";
        filterKey = "manual";
      } else if (label.includes("TODAY")) {
        color = "emerald";
        filterKey = "today";
      }

      return {
        ...stat,
        color,
        filterKey,
        isActive: activeFilter === filterKey,
        onClick: () => {
          if (filterKey === "total") setActiveFilter(null);
          else setActiveFilter(activeFilter === filterKey ? null : filterKey);
        },
      };
    }) || [];

  useEffect(() => {
    if (activeFilter) {
      setTimeout(() => {
        document.querySelector(".data-status-section")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    }
  }, [activeFilter]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("dashboard-table-search")?.focus();
      }
      if (e.altKey) {
        switch (e.key) {
          case "1":
            setActiveFilter(activeFilter === "approve" ? null : "approve");
            break;
          case "2":
            setActiveFilter(activeFilter === "reject" ? null : "reject");
            break;
          case "3":
            setActiveFilter(activeFilter === "pending" ? null : "pending");
            break;
          case "4":
            setActiveFilter(activeFilter === "inward" ? null : "inward");
            break;
          case "5":
            setActiveFilter(activeFilter === "outward" ? null : "outward");
            break;
          case "0":
            setActiveFilter(null);
            break;
          default:
            break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFilter]);

  const handleSyncRun = async () => {
    try {
      setSyncing(true);
      await invoiceService.syncData();
      setLastSyncTime(new Date());
      await refresh({});
      showNotification("Sync completed successfully", "success");
    } catch (err) {
      console.error("❌ Sync error:", err);
      showNotification("Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleEditRecord = (record) => {
    setSelectedRecord(record);
    setEditModalOpen(true);
  };

  const handleSaveEdit = useCallback(
    async function handleSaveEdit(updatedRecord) {
      try {
        await refresh({});
        setTimeout(
          () => showNotification("Record updated successfully", "success"),
          100,
        );
      } catch (err) {
        console.error("❌ Error in handleSaveEdit:", err);
        setTimeout(
          () => showNotification("Failed to refresh data", "error"),
          100,
        );
      }
    },
    [refresh],
  );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 shadow-sm mt-10">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">
          !
        </div>
        <h3 className="text-lg font-bold text-gray-900">System Error</h3>
        <p className="text-gray-500 text-sm mb-6 text-center max-w-xs">
          {error}
        </p>
        <button
          onClick={() => refresh({})}
          className="px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-all"
        >
          Try Again
        </button>
      </div>
    );

  // ── Stats filter — text search now lives inside DashboardTable itself,
  // scoped to the table it filters instead of a page-wide Navbar box. ──────
  const filteredRecords = activeFilter
    ? periodRecords.filter((r) => {
        if (activeFilter === "inward")
          return r.inward_outward?.toLowerCase() === "inward";
        if (activeFilter === "outward")
          return r.inward_outward?.toLowerCase() === "outward";
        if (activeFilter === "returnable")
          return r.inward_outward?.toLowerCase() === "returnable";
        if (activeFilter === "today") {
          if (!r.action_date) return false;
          const d = new Date(r.action_date);
          const now = new Date();
          return (
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        }
        if (activeFilter === "manual")
          return r.entry_type?.toLowerCase() === "manual";
        return true;
      })
    : periodRecords;

  return (
    <>
      <div className="animate-in fade-in duration-500 space-y-5">
        {/* 1. Dashboard Controls — entire box commented out (title block, and
            the Live Sync / Last Sync / Sync Now controls). Search lives in
            DashboardTable's own toolbar now (see id="dashboard-table-search").
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-none">
                  Dashboard
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Manage and sync data
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-4 pl-2">
                <div className="hidden sm:block text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Live Sync
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <p className="text-[11px] font-semibold text-gray-600">
                      {getSyncStatusDisplay()}
                    </p>
                    {lastSyncTime && (
                      <span className="text-[10px] text-gray-400">
                        ({getTimeSinceSync()})
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSyncRun}
                  disabled={syncing}
                  className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
                  />
                  <span>Sync Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        */}

        {/* 2. Stats Cards */}
        {/* Period filter — compact dropdown above the stats section (outside
            it); drives the stat cards, table and counts */}
        <PeriodDropdown
          period={period}
          setPeriod={(id) => {
            setPeriod(id);
            setActiveFilter(null);
          }}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          range={range}
          hasAnyFilter={Boolean(period !== "all" || customFrom || customTo || activeFilter)}
          onClear={() => {
            setPeriod("all");
            setCustomFrom("");
            setCustomTo("");
            setActiveFilter(null);
          }}
        />

        {/* 2. Stats Cards */}
        <DashboardStats stats={coloredStats} loading={loading} />

        {/* 3. Data Table */}
        <div
          className="data-status-section bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col"
          style={{ overflow: "visible" }}
        >
          <DashboardTable
            records={filteredRecords}
            loading={loading}
            showNotification={showNotification}
            onEditRecord={handleEditRecord}
            onBlockVendor={() => refresh({})}
            onUnblockVendor={() => refresh({})}
            onDeleteRecord={() => refresh({})}
            onRecordUpdated={() => refresh({})}
            activeFilter={activeFilter}
            onClearFilter={() => setActiveFilter(null)}
          />
        </div>

        {activeFilter && (
          <div className="text-center py-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-slate-700">
              Showing{" "}
              <span className="font-bold text-blue-600">
                {filteredRecords.length}
              </span>{" "}
              of <span className="font-bold">{periodRecords.length}</span>{" "}
              {range ? "records in this period" : "total records"}
            </p>
          </div>
        )}

        <DashboardEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedRecord(null);
          }}
          record={selectedRecord}
          onSave={handleSaveEdit}
        />
      </div>
    </>
  );
};

export default Dashboard;
