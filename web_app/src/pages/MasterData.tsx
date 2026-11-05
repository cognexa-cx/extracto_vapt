import React, { useState, useEffect, useCallback, useMemo , useRef } from "react";
import {
  UserCheck,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Power,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Loading from "../components/common/Loading";
import MasterEntityFormModal from "../components/masterData/MasterEntityFormModal";
import ConfirmDeleteDialog from "../components/userManagement/ConfirmDeleteDialog";
import ConfirmDialog from "../components/common/ConfirmDialog";
import DashboardTable from "../components/dashboard/DashboardTable";
import DashboardEditModal from "../components/dashboard/DashboardEditModal";
import ExportDropdown from "../components/common/ExportDropdown";
import useInvoiceData from "../hooks/useInvoiceData";
import { useAppContext } from "../context/AppContext";
import masterDataV2Service from "../services/masterDataV2Service";
import { MASTER_ENTITIES, MASTER_ENTITY_ORDER } from "../utils/masterDataV2Config";
import { DATE_PRESETS, resolveDatePreset } from "../utils/dateRangePresets";
import { exportRowsToExcel, getDateStamp } from "../utils/exportGenericUtils";

// "Records" isn't a CRUD master entity (no add/edit/delete form, different
// data shape entirely) — it's a 5th tab that reuses Dashboard's own table +
// edit modal + data hook as-is, so the same invoices shown on Dashboard are
// also browsable from here. Kept out of masterDataV2Config's MASTER_ENTITIES
// (which drives the generic CRUD tabs) rather than special-cased there.
const RECORDS_TAB_KEY = "records";
const TAB_ORDER = [...MASTER_ENTITY_ORDER, RECORDS_TAB_KEY];

const STATUS_BADGE = {
  Active: "bg-emerald-50 text-emerald-700",
  Blocked: "bg-rose-50 text-rose-600",
};

const PAGE_SIZE = 30;

const MasterData = () => {
  const { showNotification, user } = useAppContext();

  const [activeTab, setActiveTab] = useState(MASTER_ENTITY_ORDER[0]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // "desc" = latest first
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const isRecordsTab = activeTab === RECORDS_TAB_KEY;
  const config = MASTER_ENTITIES[activeTab];

  // Records tab — same data hook + table + edit modal Dashboard uses,
  // wired independently of the CRUD state above.
  const { records: invoiceRecords, loading: invoiceLoading, refresh: invoiceRefresh } = useInvoiceData({
    autoFetch: true,
    params: {},
  });
  const [recordEditOpen, setRecordEditOpen] = useState(false);
  const [selectedInvoiceRecord, setSelectedInvoiceRecord] = useState(null);
  const openRecordEdit = (record) => {
    setSelectedInvoiceRecord(record);
    setRecordEditOpen(true);
  };
  const handleSaveInvoiceEdit = async () => {
    await invoiceRefresh({});
    showNotification("Record updated successfully", "success");
  };

  // Master Data is gated as one "vender" RBAC section (same pattern as
  // User Management gating User Master + RBAC Master together) — no
  // per-master split, so all four tabs share one permission set.
  const perms = user?.permissions?.vender;
  const canCreate = !perms || !!perms.create;
  const canEdit = !perms || !!perms.edit;
  const canDelete = !perms || !!perms.delete;

  // Search waits for a pause in typing, and only the newest request may write
  // its result (a slow older response, or one from the tab you just left,
  // used to overwrite the current one).
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);
  const reqId = useRef(0);

  const hasFilters = debouncedQuery || statusFilter || startDate || endDate;

  const load = useCallback(async () => {
    if (isRecordsTab) return;
    const myReq = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const result = hasFilters
        ? await masterDataV2Service.search(activeTab, {
            q: debouncedQuery,
            status: statusFilter,
            startDate,
            endDate,
          })
        : await masterDataV2Service.getAll(activeTab);
      if (myReq !== reqId.current) return;
      setRows(result.data);
    } catch (err) {
      if (myReq !== reqId.current) return;
      setError(err.response?.data?.detail?.message || err.message || "Failed to load data");
    } finally {
      if (myReq === reqId.current) setLoading(false);
    }
  }, [activeTab, debouncedQuery, statusFilter, startDate, endDate, hasFilters, isRecordsTab]);

  useEffect(() => {
    setQuery("");
    setDebouncedQuery("");
    setStatusFilter("");
    setDatePreset("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setSelectedIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter, startDate, endDate]);

  // Preset selection resolves straight to a start/end range; "Custom
  // Range" instead leaves startDate/endDate for the two date inputs below
  // to drive directly, and "" (All Time) clears both.
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === "custom") return;
    const range = resolveDatePreset(preset);
    setStartDate(range?.startDate || "");
    setEndDate(range?.endDate || "");
  };

  useEffect(() => {
    load();
  }, [load]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === "desc" ? -diff : diff;
    });
    return sorted;
  }, [rows, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  const handleTabClick = (key) => setActiveTab(key);

  const openAdd = () => {
    setEditingRow(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setFormOpen(true);
  };

  // MasterEntityFormModal's own submit calls onSave(formData) directly --
  // this just stages it and opens a confirm step on top of the still-open
  // form modal, rather than hitting the API right away. The real request
  // only fires from performSave() once the user confirms.
  const [pendingFormData, setPendingFormData] = useState(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmSaving, setConfirmSaving] = useState(false);

  const handleSave = async (formData) => {
    setPendingFormData(formData);
    setConfirmSaveOpen(true);
  };

  const performSave = async () => {
    setConfirmSaving(true);
    try {
      if (editingRow) {
        await masterDataV2Service.update(activeTab, editingRow[config.pk], pendingFormData);
        showNotification(`${config.singular} updated successfully`, "success");
      } else {
        await masterDataV2Service.create(activeTab, pendingFormData);
        showNotification(`${config.singular} added successfully`, "success");
      }
      setConfirmSaveOpen(false);
      setFormOpen(false);
      load();
    } catch (err) {
      showNotification(err.message || "Failed to save", "error");
    } finally {
      setConfirmSaving(false);
    }
  };

  const [statusConfirmTarget, setStatusConfirmTarget] = useState(null); // row pending activate/deactivate
  const [statusConfirmLoading, setStatusConfirmLoading] = useState(false);

  const performToggleStatus = async () => {
    if (!statusConfirmTarget) return;
    setStatusConfirmLoading(true);
    try {
      if (statusConfirmTarget.status === "Active") {
        await masterDataV2Service.deactivate(activeTab, statusConfirmTarget[config.pk]);
      } else {
        await masterDataV2Service.activate(activeTab, statusConfirmTarget[config.pk]);
      }
      showNotification(`${config.singular} status updated`, "success");
      setStatusConfirmTarget(null);
      load();
    } catch (err) {
      showNotification(err.message || "Failed to update status", "error");
    } finally {
      setStatusConfirmLoading(false);
    }
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected = paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.has(r[config.pk]));
  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) paginatedRows.forEach((r) => next.delete(r[config.pk]));
      else paginatedRows.forEach((r) => next.add(r[config.pk]));
      return next;
    });
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const source = selectedIds.size > 0 ? sortedRows.filter((r) => selectedIds.has(r[config.pk])) : sortedRows;
      const mapped = source.map((row) => {
        const record = {};
        config.columns.forEach((col) => {
          record[col.label] = row[col.key] ?? "-";
        });
        return record;
      });
      await exportRowsToExcel(mapped, `${config.singular.toLowerCase()}_${getDateStamp()}`, config.label);
    } finally {
      setIsExporting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await masterDataV2Service.remove(activeTab, deleteTarget[config.pk]);
      showNotification(`${config.singular} deleted successfully`, "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      showNotification(err.message || "Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="animate-in fade-in duration-500 flex flex-col gap-5"
      style={{ height: "calc(100vh - 130px)" }}
    >
      <div className="shrink-0">
        <PageHeader icon={UserCheck} title="Master Data" subtitle="Vendors, warehouses, transporters, materials & records">
          {canCreate && !isRecordsTab && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add {config.singular}</span>
            </button>
          )}
        </PageHeader>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Tabs — horizontally scrollable so a narrow screen doesn't clip
            or squish tabs that don't all fit at once. */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4 pt-2 shrink-0">
          {TAB_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTabClick(key)}
              className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === key
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {key === RECORDS_TAB_KEY ? "Records" : MASTER_ENTITIES[key].label}
            </button>
          ))}
        </div>

        {/* Search + filter bar — Records has its own built-in search/sort/
            filters (same DashboardTable as Dashboard), so this whole
            CRUD-specific bar is skipped on that tab. */}
        {!isRecordsTab && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0">
          {/* Same as the tabs above, as a dropdown — quicker to reach when
              there are more entities than fit comfortably as tabs. */}
          <select
            value={activeTab}
            onChange={(e) => handleTabClick(e.target.value)}
            className="rounded-md border border-slate-300 bg-white py-1.5 px-3 text-xs font-semibold text-blue-600 focus:border-blue-500 focus:outline-none"
          >
            {TAB_ORDER.map((key) => (
              <option key={key} value={key}>{key === RECORDS_TAB_KEY ? "Records" : MASTER_ENTITIES[key].label}</option>
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
            <option value="Active">Active</option>
            <option value="Blocked">Blocked</option>
          </select>
          <div className="flex items-center gap-1.5">
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="rounded-md border border-slate-300 bg-white py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
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
              onClick={() => {
                setQuery("");
                setStatusFilter("");
                setDatePreset("");
                setStartDate("");
                setEndDate("");
              }}
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
        )}

        {/* Table — the only part of the page that scrolls */}
        {isRecordsTab ? (
          <div className="flex-1 min-h-0 overflow-auto">
            <DashboardTable
              records={invoiceRecords}
              loading={invoiceLoading}
              showNotification={showNotification}
              onEditRecord={openRecordEdit}
              onBlockVendor={() => invoiceRefresh({})}
              onUnblockVendor={() => invoiceRefresh({})}
              onDeleteRecord={() => invoiceRefresh({})}
              onRecordUpdated={() => invoiceRefresh({})}
              activeFilter={null}
              onClearFilter={() => {}}
            />
          </div>
        ) : loading ? (
          <div className="py-10 flex-1">
            <Loading size="lg" fullScreen={false} />
          </div>
        ) : error ? (
          <div className="p-8 text-center flex-1">
            <p className="text-red-600 text-sm font-medium mb-3">{error}</p>
            <button
              onClick={load}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
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
                  <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={config.columns.length + 2} className="py-10 text-center text-slate-400">
                      No {config.label.toLowerCase()} found
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr key={row[config.pk]} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row[config.pk])}
                          onChange={() => toggleRow(row[config.pk])}
                          className="h-3.5 w-3.5 accent-indigo-600"
                        />
                      </td>
                      {config.columns.map((col) => (
                        <td key={col.key} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                          {col.key === "status" ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                STATUS_BADGE[row.status] || STATUS_BADGE.Blocked
                              }`}
                            >
                              {row.status}
                            </span>
                          ) : (
                            row[col.key] || "—"
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-start gap-1">
                          <button
                            onClick={() => openEdit(row)}
                            title="View"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => openEdit(row)}
                                title="Edit"
                                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setStatusConfirmTarget(row)}
                                title={row.status === "Active" ? "Deactivate" : "Activate"}
                                className={`rounded-md p-1.5 text-slate-500 hover:bg-slate-100 ${
                                  row.status === "Active" ? "hover:text-amber-600" : "hover:text-emerald-600"
                                }`}
                              >
                                {row.status === "Active" ? (
                                  <Power className="w-4 h-4" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(row)}
                              title="Delete"
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td aria-hidden="true" />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination — outside the scroll area, always visible. Records
            tab has its own pagination built into DashboardTable. */}
        {!isRecordsTab && !loading && !error && rows.length > 0 && (
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
              <span className="font-semibold text-slate-700">
                Page {page} of {totalPages}
              </span>
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

      {!isRecordsTab && (
        <>
          <MasterEntityFormModal
            isOpen={formOpen}
            onClose={() => setFormOpen(false)}
            onSave={handleSave}
            config={config}
            record={editingRow}
          />

          <ConfirmDeleteDialog
            isOpen={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={confirmDelete}
            title={`Delete ${config.singular}`}
            message={`Are you sure you want to delete this ${config.singular.toLowerCase()}? This action cannot be undone.`}
            employeeName={deleteTarget?.[config.nameField]}
            loading={deleting}
          />

          <ConfirmDialog
            isOpen={confirmSaveOpen}
            title={editingRow ? `Save changes to this ${config.singular.toLowerCase()}?` : `Add this ${config.singular.toLowerCase()}?`}
            message={editingRow ? "This updates the saved record immediately." : "This creates a new record in Master Data."}
            onConfirm={performSave}
            onCancel={() => setConfirmSaveOpen(false)}
            isLoading={confirmSaving}
            confirmLabel={editingRow ? "Save" : "Add"}
            loadingLabel={editingRow ? "Saving..." : "Adding..."}
            confirmColor="indigo"
          />

          <ConfirmDialog
            isOpen={!!statusConfirmTarget}
            title={statusConfirmTarget?.status === "Active" ? `Deactivate this ${config.singular.toLowerCase()}?` : `Activate this ${config.singular.toLowerCase()}?`}
            message={
              statusConfirmTarget?.status === "Active"
                ? "It will be blocked from new transactions until reactivated."
                : "It becomes available for new transactions again."
            }
            onConfirm={performToggleStatus}
            onCancel={() => setStatusConfirmTarget(null)}
            isLoading={statusConfirmLoading}
            confirmLabel={statusConfirmTarget?.status === "Active" ? "Deactivate" : "Activate"}
            loadingLabel="Updating..."
            confirmColor={statusConfirmTarget?.status === "Active" ? "red" : "emerald"}
          />
        </>
      )}

      <DashboardEditModal
        isOpen={recordEditOpen}
        onClose={() => {
          setRecordEditOpen(false);
          setSelectedInvoiceRecord(null);
        }}
        record={selectedInvoiceRecord}
        onSave={handleSaveInvoiceEdit}
      />
    </div>
  );
};

export default MasterData;
