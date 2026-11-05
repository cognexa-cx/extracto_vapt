import React, { useState, useRef, useEffect } from "react";
import DataTable from "../common/DataTable";
import ExportDropdown from "../common/ExportDropdown";
import DashboardActionButton from "./DashboardActionButton";
import DashboardViewModal from "./DashboardViewModal";
import DashboardEditModal from "./DashboardEditModal";
import ConfirmDialog from "../common/ConfirmDialog";
import { exportToExcel, exportToPDF } from "../../utils/exportUtils";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  FilterX,
  Settings,
  Calendar,
  DollarSign,
  X,
  Search,
} from "lucide-react";
import invoiceService from "../../services/invoiceService";

const ITEMS_PER_PAGE = 25;

// ==========================================
// SORT DROPDOWN
// ==========================================

const SortDropdown = ({ sortConfig, onSort }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const sortOptions = [
    { key: "ID", label: "ID" },
    { key: "project_site", label: "Project Site" }, // ← was vendor_name / Issuer
    { key: "vendor_name", label: "Vendor Name" },
    { key: "destination_site", label: "Destination" }, // ← new
    { key: "invoice_number", label: "Document No." },
    { key: "invoice_date", label: "Date" },
    { key: "vehicle_number", label: "Vehicle No." },
    { key: "approval_status", label: "Status" },
    { key: "inward_outward", label: "Direction" },
  ];

  const getSortIcon = (key) => {
    if (sortConfig.key !== key)
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    if (sortConfig.direction === "asc")
      return <ArrowUp className="w-4 h-4 text-teal-600" />;
    if (sortConfig.direction === "desc")
      return <ArrowDown className="w-4 h-4 text-teal-600" />;
    return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
  };

  const getCurrentSortLabel = () => {
    if (!sortConfig.key || !sortConfig.direction) return "Sort By";
    const option = sortOptions.find((opt) => opt.key === sortConfig.key);
    return `${option?.label || "Sort"} ${sortConfig.direction === "asc" ? "↑" : "↓"}`;
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
      >
        <ArrowUpDown className="w-4 h-4" />
        <span>{getCurrentSortLabel()}</span>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden"
          style={{ zIndex: 99999 }}
        >
          <div className="p-2">
            {sortOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => {
                  onSort(option.key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  sortConfig.key === option.key
                    ? "bg-teal-50 text-teal-700 font-medium"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{option.label}</span>
                {getSortIcon(option.key)}
              </button>
            ))}
            {sortConfig.key && sortConfig.direction && (
              <>
                <div className="h-px bg-slate-200 my-2" />
                <button
                  onClick={() => {
                    onSort(null);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-md font-medium transition-colors"
                >
                  Clear Sort
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// ADVANCED FILTER DROPDOWN
// ==========================================

const AdvancedFilterDropdown = ({
  tableFilter,
  setTableFilter,
  setCurrentPage,
  hasActiveFilter,
  onClearFilters,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleStatusFilter = (status) => {
    setTableFilter((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
    setCurrentPage(1);
  };

  const toggleTypeFilter = (type) => {
    setTableFilter((prev) => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter((t) => t !== type)
        : [...prev.type, type],
    }));
    setCurrentPage(1);
  };

  // ── Date presets (calendar days in India time, both ends inclusive) ──
  const istToday = () =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const shiftDay = (ymd, days) => {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const DATE_PRESETS = [
    { id: "today", label: "Today", range: () => [istToday(), istToday()] },
    { id: "yesterday", label: "Yesterday", range: () => [shiftDay(istToday(), -1), shiftDay(istToday(), -1)] },
    { id: "7d", label: "Last 7 Days", range: () => [shiftDay(istToday(), -6), istToday()] },
    { id: "30d", label: "Last 30 Days", range: () => [shiftDay(istToday(), -29), istToday()] },
    { id: "90d", label: "Last 90 Days", range: () => [shiftDay(istToday(), -89), istToday()] },
  ];
  const [customDates, setCustomDates] = useState(false);
  const presetMatch = DATE_PRESETS.find((p) => {
    const [f, t] = p.range();
    return tableFilter.dateFrom === f && tableFilter.dateTo === t;
  });
  const hasDates = Boolean(tableFilter.dateFrom || tableFilter.dateTo);
  const activePreset = customDates ? "custom" : presetMatch ? presetMatch.id : hasDates ? "custom" : "";
  const applyPreset = (preset) => {
    const [f, t] = preset.range();
    setCustomDates(false);
    setTableFilter((prev) => ({ ...prev, dateFrom: f, dateTo: t }));
    setCurrentPage(1);
  };
  const clearDates = () => {
    setCustomDates(false);
    setTableFilter((prev) => ({ ...prev, dateFrom: "", dateTo: "" }));
    setCurrentPage(1);
  };

  const activeFilterCount =
    tableFilter.status.length +
    tableFilter.type.length +
    (tableFilter.dateFrom ? 1 : 0) +
    (tableFilter.dateTo ? 1 : 0) +
    (tableFilter.amountMin ? 1 : 0) +
    (tableFilter.amountMax ? 1 : 0);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
          hasActiveFilter
            ? "bg-teal-50 border-teal-300 text-teal-700"
            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Advanced Filter</span>
        {activeFilterCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-teal-600 text-white text-[10px] font-bold rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-[500px] overflow-y-auto"
          style={{ zIndex: 99999, position: "absolute" }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Filter */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                <span className="w-1 h-4 bg-emerald-500 rounded"></span>
                Status (Multi-select)
              </p>
              <div className="flex flex-wrap gap-2">
                {["approve", "reject"].map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      tableFilter.status.includes(status)
                        ? "bg-teal-100 text-teal-700 border-teal-300"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {tableFilter.status.includes(status) && "✓ "}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                <span className="w-1 h-4 bg-blue-500 rounded"></span>
                Type (Multi-select)
              </p>
              <div className="flex flex-wrap gap-2">
                {["inward", "outward", "returnable"].map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      tableFilter.type.includes(type)
                        ? "bg-blue-100 text-blue-700 border-blue-300"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {tableFilter.type.includes(type) && "✓ "}
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Date Range
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      activePreset === preset.id
                        ? "bg-teal-100 text-teal-700 border-teal-300"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {activePreset === preset.id && "✓ "}
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomDates(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    activePreset === "custom"
                      ? "bg-teal-100 text-teal-700 border-teal-300"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {activePreset === "custom" && "✓ "}
                  Custom
                </button>
                {hasDates && (
                  <button
                    type="button"
                    onClick={clearDates}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Clear
                  </button>
                )}
              </div>
              {activePreset === "custom" && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-500">From</label>
                    <input
                      type="date"
                      value={tableFilter.dateFrom}
                      max={tableFilter.dateTo || undefined}
                      onChange={(e) => {
                        setTableFilter((prev) => ({ ...prev, dateFrom: e.target.value }));
                        setCurrentPage(1);
                      }}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">To</label>
                    <input
                      type="date"
                      value={tableFilter.dateTo}
                      min={tableFilter.dateFrom || undefined}
                      onChange={(e) => {
                        setTableFilter((prev) => ({ ...prev, dateTo: e.target.value }));
                        setCurrentPage(1);
                      }}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
              )}
              {hasDates && activePreset !== "custom" && (
                <p className="text-[10px] text-slate-500">
                  {tableFilter.dateFrom === tableFilter.dateTo
                    ? tableFilter.dateFrom
                    : `${tableFilter.dateFrom} to ${tableFilter.dateTo}`}
                </p>
              )}
            </div>

            {/* Amount Range */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Amount Range (₹)
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500">Min</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={tableFilter.amountMin}
                    onChange={(e) => {
                      setTableFilter((prev) => ({
                        ...prev,
                        amountMin: e.target.value,
                      }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500">Max</label>
                  <input
                    type="number"
                    placeholder="999999"
                    value={tableFilter.amountMax}
                    onChange={(e) => {
                      setTableFilter((prev) => ({
                        ...prev,
                        amountMax: e.target.value,
                      }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {hasActiveFilter && (
              <>
                <div className="h-px bg-slate-200 my-3" />
                <button
                  onClick={() => {
                    setCustomDates(false);
                    onClearFilters();
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FilterX className="w-4 h-4" />
                  Clear All Filters
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// COLUMN CUSTOMIZATION DROPDOWN
// ==========================================

const ColumnCustomizationDropdown = ({
  visibleColumns,
  setVisibleColumns,
  toggleColumn,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const columns = [
    { key: "id", label: "ID" },
    { key: "project_site", label: "Project Site" }, // ← was vendor_name / Issuer
    { key: "vendor_name", label: "Vendor Name" },
    { key: "destination_site", label: "Destination" }, // ← new
    { key: "invoice_number", label: "Document No." },
    { key: "invoice_date", label: "Date" },
    { key: "vehicle_number", label: "Vehicle No." },
    { key: "approval_status", label: "Status" },
    { key: "inward_outward", label: "Direction" },
    { key: "document_type", label: "Doc Type" },
  ];

  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
      >
        <Settings className="w-4 h-4" />
        <span>Columns</span>
        <span className="text-xs text-slate-500">
          ({visibleCount}/{columns.length})
        </span>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden"
          style={{ zIndex: 99999 }}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900">
                Customize Columns
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {columns.map((column) => (
                <label
                  key={column.key}
                  className="flex items-center p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.key] ?? false}
                    onChange={() => toggleColumn(column.key)}
                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="ml-3 text-sm text-slate-700">
                    {column.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => {
                  const allVisible = {};
                  columns.forEach(({ key }) => {
                    allVisible[key] = true;
                  });
                  setVisibleColumns(allVisible);
                }}
                className="flex-1 px-3 py-1.5 bg-teal-50 text-teal-700 rounded text-xs font-medium hover:bg-teal-100 transition-colors"
              >
                Show All
              </button>
              <button
                onClick={() => {
                  setVisibleColumns({
                    id: true,
                    project_site: true, // ← was vendor_name
                    vendor_name: true,
                    vehicle_number: true,
                    approval_status: true,
                    destination_site: false,
                    invoice_number: false,
                    invoice_date: false,
                    inward_outward: false,
                    document_type: false,
                  });
                }}
                className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200 transition-colors"
              >
                Essential Only
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const DashboardTable = ({
  records,
  onBlockVendor,
  onUnblockVendor,
  onDeleteRecord,
  onEditRecord,
  onRecordUpdated,
  showNotification,
  activeFilter,
  onClearFilter,
  loading = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [localRecords, setLocalRecords] = useState(records);
  // Moved here from the Navbar — search only ever acted on this table, so
  // it now lives with the data it filters instead of living globally.
  const [tableSearch, setTableSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [entryTypeTab, setEntryTypeTabState] = useState(
    () => localStorage.getItem("dashboard_entry_type_tab") || "automatic",
  );
  const setEntryTypeTab = (tab) => {
    setEntryTypeTabState(tab);
    localStorage.setItem("dashboard_entry_type_tab", tab);
  };

  const [tableFilter, setTableFilter] = useState({
    status: [],
    type: [],
    dateFrom: "",
    dateTo: "",
    amountMin: "",
    amountMax: "",
  });

  // ← project_site replaces vendor_name; destination_site added
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    project_site: true,
    vendor_name: true,
    destination_site: false,
    invoice_number: true,
    invoice_date: true,
    vehicle_number: false,
    approval_status: true,
    inward_outward: true,
    document_type: true,
  });

  const [viewModal, setViewModal] = useState({ isOpen: false, recordId: null });
  const [editModal, setEditModal] = useState({ isOpen: false, record: null });
  const [dialog, setDialog] = useState({
    isOpen: false,
    record: null,
    isLoading: false,
  });

  React.useEffect(() => {
    const sortedRecords = [...records].sort((a, b) => {
      const aDate = new Date(
        a.updated_at || a.action_date || a.Action_Date || a.invoice_date || 0,
      );
      const bDate = new Date(
        b.updated_at || b.action_date || b.Action_Date || b.invoice_date || 0,
      );
      return bDate.getTime() - aDate.getTime();
    });
    setLocalRecords(sortedRecords);
  }, [records]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [entryTypeTab, tableSearch]);

  // Records are filtered by entryTypeTab below (independent of activeFilter),
  // so clicking the "Manual" stats card set activeFilter="manual" but never
  // actually switched the Automatic/Manual toggle — the table stayed on
  // "automatic" and showed nothing. Sync the toggle to whichever dataset the
  // clicked stat card actually belongs to.
  React.useEffect(() => {
    if (activeFilter === "manual" && entryTypeTab !== "manual") {
      setEntryTypeTab("manual");
    } else if (activeFilter && activeFilter !== "manual" && entryTypeTab !== "automatic") {
      setEntryTypeTab("automatic");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const handleSort = (key) => {
    if (key === null) {
      setSortConfig({ key: null, direction: null });
      return;
    }
    let direction = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") {
        setSortConfig({ key: null, direction: null });
        return;
      }
    }
    setSortConfig({ key, direction });
  };

  const getFilteredRecords = () => {
    let filtered = [...localRecords].filter(
      (r) => (r.entry_type || "automatic") === entryTypeTab,
    );
    if (tableSearch.trim()) {
      const q = tableSearch.trim().toLowerCase();
      // Searches every column shown in the table (vendor name included -- it
      // used to be skipped, so searching a company name found nothing). A
      // record with several vendors holds them on separate lines; all match.
      filtered = filtered.filter((r) =>
        [
          r.vendor_name,
          r.project_site,
          r.destination_site,
          r.vehicle_number,
          r.invoice_number,
          r.document_type,
          r.approval_status,
          r.inward_outward,
          r.ID,
        ].some((v) => v != null && String(v).toLowerCase().includes(q)),
      );
    }
    if (tableFilter.status.length > 0)
      filtered = filtered.filter((r) =>
        tableFilter.status.includes(r.approval_status?.toLowerCase()),
      );
    if (tableFilter.type.length > 0)
      filtered = filtered.filter((r) =>
        tableFilter.type.includes(r.inward_outward?.toLowerCase()),
      );
    // Dates compare as calendar days in India time (the same day the table
    // shows), inclusive on both ends. Comparing against midnight of the "To"
    // date used to drop every record from that day itself.
    const istDay = (d) => {
      const t = new Date(d);
      return isNaN(t.getTime())
        ? ""
        : t.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    };
    if (tableFilter.dateFrom)
      filtered = filtered.filter((r) => {
        const d = istDay(r.invoice_date);
        return d !== "" && d >= tableFilter.dateFrom;
      });
    if (tableFilter.dateTo)
      filtered = filtered.filter((r) => {
        const d = istDay(r.invoice_date);
        return d !== "" && d <= tableFilter.dateTo;
      });
    if (tableFilter.amountMin)
      filtered = filtered.filter(
        (r) =>
          (parseFloat(r.invoice_amount) || 0) >=
          parseFloat(tableFilter.amountMin),
      );
    if (tableFilter.amountMax)
      filtered = filtered.filter(
        (r) =>
          (parseFloat(r.invoice_amount) || 0) <=
          parseFloat(tableFilter.amountMax),
      );
    return filtered;
  };

  const getSortedRecords = () => {
    const filtered = getFilteredRecords();
    if (!sortConfig.key || !sortConfig.direction) {
      return [...filtered].sort((a, b) => {
        const aDate = new Date(
          a.updated_at || a.action_date || a.Action_Date || a.invoice_date || 0,
        );
        const bDate = new Date(
          b.updated_at || b.action_date || b.Action_Date || b.invoice_date || 0,
        );
        return bDate.getTime() - aDate.getTime();
      });
    }
    return [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (sortConfig.key === "invoice_amount") {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (sortConfig.key === "invoice_date") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const sortedRecords = getSortedRecords();
  const totalItems = sortedRecords?.length || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRecords = sortedRecords.slice(startIndex, endIndex);
  const rowId = (row, idx) => row.ID || row.id || idx;

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const allOnPageSelected =
    paginatedRecords.length > 0 && paginatedRecords.every((r, idx) => selectedIds.has(rowId(r, idx)));
  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) paginatedRecords.forEach((r, idx) => next.delete(rowId(r, idx)));
      else paginatedRecords.forEach((r, idx) => next.add(rowId(r, idx)));
      return next;
    });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  // ── Fixed, clean export layout ───────────────────────────────────────────
  // One row PER DOCUMENT. All items for that document go into a single
  // "Items & Description" cell, listed one after another (line by line).
  const fmt = (v) => {
    if (v === null || v === undefined || v === "") return "-";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
      return new Date(v).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    }
    return String(v);
  };

  // Builds a single multi-line cell like:
  // 1) PCC paver blocks - 80mm heavy duty — Qty: 200
  // 2) Aluminum Formwork panels - wall system — Qty: 30
  const formatItemsList = (items) => {
    if (!Array.isArray(items) || items.length === 0) return "-";
    return items
      .map((it, i) => {
        const srNo = it?.sr_no ? String(it.sr_no).replace(/[).]+$/, "") : i + 1;
        const desc = it?.description || "-";
        const qty = it?.quantity ? `Qty: ${it.quantity}` : "";
        const unit = it?.unit ? ` ${it.unit}` : "";
        return `${srNo}) ${desc}${qty ? " — " + qty + unit : ""}`;
      })
      .join("\n");
  };

  const prettyKey = (k) =>
    String(k).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const cellValue = (v) =>
    Array.isArray(v)
      ? fmt(joinValue(v))
      : v !== null && typeof v === "object"
        ? fmt(
            Object.entries(v)
              .map(([k, x]) => `${prettyKey(k)}: ${joinValue(x)}`)
              .join("\n"),
          )
        : fmt(v);

  // Contact columns every export row carries: Name / Email / Phone Numbers /
  // Website / Address. Each list is the field names that can hold that value.
  const PARTY_FIELDS = {
    Name: [
      "name", "company_name", "vendor_name", "supplier_name", "party_name",
      "firm_name", "company_name_printed_on_the_letterhead",
      "business_name", "organization_name", "organisation_name", "entity_name",
      "company", "brand_name", "document_title", "business_title", "park_name",
      "resort_name", "hotel_name",
    ],
    Address: ["address", "office_address", "registered_address", "addresses", "location"],
    Email: ["email", "emails", "email_id", "email_address"],
    Website: ["website", "websites", "web", "url", "site"],
    "Phone Numbers": [
      "phone_numbers", "phone_number", "phone", "phones", "mobile", "mobile_number",
      "contact_number", "contact_numbers", "telephone", "tel",
    ],
  };
  const PARTY_FIELD_KEYS = new Set(Object.values(PARTY_FIELDS).flat());
  // Fields deliberately left out of the Excel export.
  const EXCLUDED_EXPORT_KEYS = new Set(["description", "business_description"]);
  // Sub-blocks that describe the company itself (searched for its name too).
  const PARTY_SUBSECTIONS = [
    "issuer_details", "issuer", "seller", "from_party", "supplier", "vendor",
    "company_details", "company_info", "company_profile", "organization_details",
    "business_details", "entity_details",
  ];
  const NUMBERED_PARTY = /^(company|vendor|supplier|party|firm|issuer|seller)[\s_-]*\d+$/i;
  const PARTY_LIST =
    /^(companies|vendors|suppliers|parties|firms|entities|entries|documents|organizations|organisations|businesses|members|listings|sections|records|items_list|profiles)$/i;
  const PEOPLE_KEY =
    /partner|director|contact_person|key_personnel|representative|managing|executive|manager|key_contacts|^contacts?$|personnel|founder|owner/i;
  const MEMBER_KEY = /member_since|membership|established/i;

  const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

  // Readable text for any value: scalars as-is, lists comma/line separated,
  // objects as "Label: value" pairs -- never JSON or [object Object].
  const describe = (v) => {
    if (v === null || v === undefined || v === "") return "";
    if (Array.isArray(v)) {
      const parts = v.map(describe).filter(Boolean);
      return v.some((x) => isObj(x) || Array.isArray(x)) ? parts.join("\n") : parts.join(", ");
    }
    if (isObj(v)) {
      return Object.entries(v)
        .map(([k, x]) => {
          const d = describe(x);
          return d ? (isObj(x) || Array.isArray(x) ? `${prettyKey(k)}: ${d}` : `${prettyKey(k)}: ${d}`) : "";
        })
        .filter(Boolean)
        .join(isObj(v) && Object.values(v).every((x) => !isObj(x) && !Array.isArray(x)) ? " - " : "\n");
    }
    return String(v).trim();
  };

  const joinValue = (v) => {
    if (Array.isArray(v)) {
      return v
        .map((x) => (isObj(x) ? Object.values(x).filter(Boolean).join(" ") : x))
        .filter((x) => x !== null && x !== undefined && String(x).trim() !== "")
        .join("\n");
    }
    if (isObj(v)) return "";
    return v === null || v === undefined ? "" : String(v).trim();
  };

  // Every plain object nested inside `party`, up to 3 levels down.
  const nestedObjects = (party) => {
    const out = [];
    const walk = (o, d) =>
      Object.values(o || {}).forEach((v) => {
        if (isObj(v)) {
          out.push(v);
          if (d < 3) walk(v, d + 1);
        }
      });
    walk(party, 1);
    return out;
  };

  // Every string in `party` (with the key it sits under), for regex fallbacks.
  const allStrings = (o, key = "", out = []) => {
    if (typeof o === "string") out.push([key, o]);
    else if (Array.isArray(o)) o.forEach((x) => allStrings(x, key, out));
    else if (isObj(o)) Object.entries(o).forEach(([k, v]) => allStrings(v, k, out));
    return out;
  };

  const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  const PHONE_RE = /\+?\d[\d\s\-()/]{7,}\d/g;

  // First non-empty value for a contact column. Name only looks at the party
  // itself and its company-style blocks (so a contact person's name is never
  // taken as the company name); the other columns search every nested block,
  // then fall back to pulling emails / phone numbers out of free text.
  const pickField = (party, label) => {
    const keys = PARTY_FIELDS[label];
    const own = [party, ...PARTY_SUBSECTIONS.map((s) => party?.[s])].filter(isObj);
    const scopes = label === "Name" ? own : [...own, ...nestedObjects(party)];
    for (const scope of scopes) {
      for (const k of keys) {
        const v = joinValue(scope[k]);
        if (v && v !== "-") return v;
      }
    }
    if (label === "Email") {
      const found = [...new Set(allStrings(party).flatMap(([, s]) => s.match(EMAIL_RE) || []))];
      return found.join("\n");
    }
    if (label === "Phone Numbers") {
      const found = [
        ...new Set(
          allStrings(party)
            .filter(([k]) => /contact|phone|mobile|tel/i.test(k))
            .flatMap(([, s]) => (s.match(PHONE_RE) || []).map((x) => x.trim())),
        ),
      ];
      return found.join("\n");
    }
    return "";
  };

  // Copy of `v` without the contact fields already shown in their own
  // columns (at any depth) and without excluded fields; empty results vanish.
  const stripConsumed = (v) => {
    if (Array.isArray(v)) {
      const a = v.map(stripConsumed).filter((x) => x !== undefined);
      return a.length ? a : undefined;
    }
    if (isObj(v)) {
      const o = {};
      Object.entries(v).forEach(([k, x]) => {
        if (PARTY_FIELD_KEYS.has(k) || EXCLUDED_EXPORT_KEYS.has(k)) return;
        const s = stripConsumed(x);
        if (s !== undefined) o[k] = s;
      });
      return Object.keys(o).length ? o : undefined;
    }
    return v === null || v === undefined || v === "" ? undefined : v;
  };

  // Invoices / challans (have an items table) keep one column per field; every
  // other document type (profiles, directory entries...) has a different
  // layout each time, so the leftovers are merged into three readable
  // columns instead of dozens of mostly-empty ones.
  const leftoverColumns = (party) => {
    const out = {};
    if (Array.isArray(party.items) && party.items.length) {
      out["Items & Description"] = formatItemsList(party.items);
      Object.entries(party).forEach(([section, value]) => {
        if (section === "items" || section === "additional_documents") return;
        if (PARTY_FIELD_KEYS.has(section) || EXCLUDED_EXPORT_KEYS.has(section)) return;
        if (isObj(value)) {
          Object.entries(value).forEach(([k, v]) => {
            if (PARTY_FIELD_KEYS.has(k) || EXCLUDED_EXPORT_KEYS.has(k)) return;
            out[`${prettyKey(section)} - ${prettyKey(k)}`] = fmt(describe(v));
          });
        } else {
          out[prettyKey(section)] = fmt(describe(value));
        }
      });
      return out;
    }
    const people = [];
    const member = [];
    const other = [];
    Object.entries(party).forEach(([k, v]) => {
      if (k === "document_type" || k === "additional_documents" || PARTY_FIELD_KEYS.has(k) || EXCLUDED_EXPORT_KEYS.has(k)) return;
      const s = stripConsumed(v);
      const text = describe(s);
      if (!text) return;
      if (PEOPLE_KEY.test(k)) people.push(`${prettyKey(k)}: ${text.includes("\n") ? "\n" + text : text}`);
      else if (MEMBER_KEY.test(k) && !isObj(s)) member.push(text);
      else other.push(`${prettyKey(k)}: ${text.includes("\n") ? "\n" + text : text}`);
    });
    if (member.length) out["Member Since"] = member.join(", ");
    if (people.length) out["Contact Persons"] = people.join("\n");
    if (other.length) out["Other Details"] = other.join("\n");
    return out;
  };

  // Splits one extracted record into its parties: numbered sections
  // ("company_1", "company_2"), companies[] lists, the extractor's
  // additional_documents, or -- normally -- just the document itself.
  const splitParties = (ex) => {
    const parties = [];
    Object.entries(ex || {}).forEach(([key, value]) => {
      if (NUMBERED_PARTY.test(key) && isObj(value)) {
        parties.push(value);
      } else if (PARTY_LIST.test(key) && Array.isArray(value)) {
        value.forEach((v) => isObj(v) && parties.push(v));
      }
    });
    if (parties.length) return parties;
    // A membership/brochure page listing two companies as issuer + receiver
    // (no items table) is two companies, not one document. Real invoices and
    // challans (which have items) stay a single row.
    if (
      !Array.isArray(ex?.items) &&
      isObj(ex?.issuer) &&
      isObj(ex?.receiver) &&
      pickField(ex.issuer, "Name") &&
      pickField(ex.receiver, "Name")
    ) {
      return [ex.issuer, ex.receiver];
    }
    const extra = Array.isArray(ex?.additional_documents)
      ? ex.additional_documents.filter(isObj)
      : [];
    return [ex || {}, ...extra];
  };

  // One export row per party, so two companies captured on one page still
  // come out as two separate rows.
  const mapRawDataForExport = (data) => {
    if (!data || data.length === 0) return [];

    return data.flatMap((item, idx) => {
      const ex = item.extracted_data || item.raw?.extracted_data || {};
      const date = item.invoice_date
        ? new Date(item.invoice_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        : "-";

      return splitParties(ex).map((party) => {
        // Column order: Sr No, Name, Email, Phone Numbers, Website, Address,
        // document info, then the remaining details.
        const row = {
          "Sr No": idx + 1,
          Name: fmt(pickField(party, "Name")),
          Email: fmt(pickField(party, "Email")),
          "Phone Numbers": fmt(pickField(party, "Phone Numbers")),
          Website: fmt(pickField(party, "Website")),
          Address: fmt(pickField(party, "Address")),
          "Document Type": fmt(item.document_type),
          "Document No": fmt(item.invoice_number),
          Date: date,
          Status: fmt(item.approval_status),
        };
        Object.assign(row, leftoverColumns(party));
        return row;
      });
    });
  };

  const handleExport = async (format = "excel") => {
    setIsExporting(true);
    try {
      if (!sortedRecords?.length) {
        if (showNotification)
          showNotification("No data available to export", "warning");
        return;
      }
      const exportSource =
        selectedIds.size > 0
          ? sortedRecords.filter((r, idx) => selectedIds.has(rowId(r, idx)))
          : sortedRecords;
      const mappedData = mapRawDataForExport(exportSource);
      const timestamp = new Date().toISOString().split("T")[0];
      const hasFilter =
        tableFilter.status.length > 0 ||
        tableFilter.type.length > 0 ||
        tableFilter.dateFrom ||
        tableFilter.dateTo ||
        tableFilter.amountMin ||
        tableFilter.amountMax ||
        sortConfig.key;
      const filename = hasFilter
        ? `gate_pass_export_filtered_${timestamp}`
        : `gate_pass_export_${timestamp}`;
      if (format === "excel") {
        await exportToExcel(mappedData, filename);
        if (showNotification)
          showNotification(
            `Exported ${mappedData.length} records to Excel`,
            "success",
          );
      } else if (format === "pdf") {
        exportToPDF(mappedData, filename);
        if (showNotification)
          showNotification(
            `Exported ${mappedData.length} records to PDF`,
            "success",
          );
      }
    } catch (error) {
      console.error(`Export failed:`, error);
      if (showNotification) showNotification("Export failed.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => handleExport("excel");
  const handleExportPDF = () => handleExport("pdf");

  const handleViewDetails = (record) =>
    setViewModal({ isOpen: true, recordId: record.ID || record.id });
  const handleCloseViewModal = () =>
    setViewModal({ isOpen: false, recordId: null });

  const handleEdit = (record) => {
    if (isUpdating) return;
    if (editModal.isOpen) {
      setEditModal({ isOpen: false, record: null });
      setTimeout(() => setEditModal({ isOpen: true, record }), 100);
      return;
    }
    setEditModal({ isOpen: true, record });
  };

  const handleCloseEditModal = () => {
    setEditModal({ isOpen: false, record: null });
    setTimeout(() => setIsUpdating(false), 150);
  };

  const handleSaveEdit = async () => {
    if (onDeleteRecord) onDeleteRecord();
    if (showNotification)
      showNotification("Record updated successfully!", "success");
  };

  const handleDeleteClick = (record) => {
    if (isUpdating) return;
    setDialog({ isOpen: true, record, isLoading: false });
  };

  const handleConfirmDelete = async () => {
    const { record } = dialog;
    const recordId = record.ID || record.id;
    const previousRecords = [...localRecords];
    setDialog((prev) => ({ ...prev, isLoading: true }));
    setIsUpdating(true);
    setLocalRecords((prev) => prev.filter((r) => (r.ID || r.id) !== recordId));
    try {
      await invoiceService.deleteRecord(recordId);
      if (onDeleteRecord) onDeleteRecord(record);
      setDialog({ isOpen: false, record: null, isLoading: false });
      if (showNotification)
        showNotification("Record deleted successfully", "success");
    } catch (error) {
      setLocalRecords(previousRecords);
      setDialog((prev) => ({ ...prev, isLoading: false }));
      if (showNotification)
        showNotification("Failed to delete record.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const hasActiveFilter =
    tableFilter.status.length > 0 ||
    tableFilter.type.length > 0 ||
    tableFilter.dateFrom ||
    tableFilter.dateTo ||
    tableFilter.amountMin ||
    tableFilter.amountMax;

  const clearAllFilters = () => {
    setTableFilter({
      status: [],
      type: [],
      dateFrom: "",
      dateTo: "",
      amountMin: "",
      amountMax: "",
    });
    setSortConfig({ key: null, direction: null });
    setCurrentPage(1);
  };

  const toggleColumn = (columnKey) =>
    setVisibleColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }));

  return (
    <div className="flex flex-col w-full h-full">
      {/* Controls Row */}
      <div
        className="px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-gradient-to-r from-slate-50/30 to-white shrink-0"
        style={{ position: "relative", zIndex: 100 }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">
              Data Status
            </h2>
            <p className="text-[10px] text-gray-500">
              Real-time gate pass monitoring
            </p>
          </div>
          <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
          <span className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-[10px] font-bold uppercase border border-teal-100">
            {totalItems} Records
          </span>
          {activeFilter && (
            <>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold border border-blue-200">
                Filter:{" "}
                {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
              </span>
              <button
                onClick={onClearFilter}
                className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold hover:bg-slate-200 transition-colors"
              >
                Clear ✕
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="dashboard-table-search"
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search vendor, site, vehicle, doc no..."
              className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
            />
          </div>
          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            Page {currentPage} of {totalPages}
          </span>
          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-300 rounded-lg">
            {["automatic", "manual"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  // The parent's stat-card filter (activeFilter) already narrows
                  // `records` down to one entry_type before it reaches this table.
                  // Switching this tab to the *other* entry_type on top of that
                  // narrowed list always yields zero rows, so clear the stat-card
                  // filter whenever it conflicts with the tab the user just picked.
                  const conflictsWithActiveFilter =
                    (t === "manual" && activeFilter && activeFilter !== "manual") ||
                    (t === "automatic" && activeFilter === "manual");
                  if (conflictsWithActiveFilter && onClearFilter) onClearFilter();
                  setEntryTypeTab(t);
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  entryTypeTab === t
                    ? "bg-teal-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "automatic" ? "Automatic" : "Manual"}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
          <SortDropdown sortConfig={sortConfig} onSort={handleSort} />
          <AdvancedFilterDropdown
            tableFilter={tableFilter}
            setTableFilter={setTableFilter}
            setCurrentPage={setCurrentPage}
            hasActiveFilter={hasActiveFilter}
            onClearFilters={clearAllFilters}
          />
          <ColumnCustomizationDropdown
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            toggleColumn={toggleColumn}
          />
          {(hasActiveFilter || sortConfig.key) && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-medium hover:bg-rose-100 transition-all"
            >
              <FilterX className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
          {selectedIds.size > 0 && (
            <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap">{selectedIds.size} selected</span>
          )}
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            isLoading={isExporting}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="flex-1 bg-white"
        style={{
          maxHeight: "500px",
          overflow: "auto",
          position: "relative",
          zIndex: 10,
        }}
      >
        <DataTable
          data={paginatedRecords}
          loading={loading}
          visibleColumns={visibleColumns}
          simple={entryTypeTab === "manual"}
          srStart={totalItems - startIndex}
          onRowClick={handleViewDetails}
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleSelectAll={toggleSelectAllOnPage}
          renderAction={(record) => (
            <DashboardActionButton
              record={record}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              isDisabled={isUpdating}
            />
          )}
        />
      </div>

      {/* Footer */}
      <div className="px-8 py-5 border-t border-slate-100 bg-gradient-to-r from-white to-slate-50/50 flex flex-wrap items-center justify-between gap-y-3 shrink-0">
        <div className="text-sm text-slate-600">
          Showing{" "}
          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
            {startIndex + 1}
          </span>
          {" to "}
          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
            {Math.min(endIndex, totalItems)}
          </span>
          {" of "}
          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
            {totalItems}
          </span>
          {" records"}
          {hasActiveFilter && (
            <span className="ml-2 text-teal-600 font-medium">(filtered)</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              currentPage === 1
                ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {[...Array(Math.min(5, totalPages))].map((_, idx) => {
              let pageNum;
              if (totalPages <= 5) pageNum = idx + 1;
              else if (currentPage <= 3) pageNum = idx + 1;
              else if (currentPage >= totalPages - 2)
                pageNum = totalPages - 4 + idx;
              else pageNum = currentPage - 2 + idx;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                    currentPage === pageNum
                      ? "bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg shadow-teal-200"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-600"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              currentPage === totalPages
                ? "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm"
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <ConfirmDialog
        isOpen={dialog.isOpen}
        title="Delete Record?"
        message={
          dialog.record?.entry_type === "manual"
            ? `Are you sure you want to delete this manual entry?\n\nDocument #: ${dialog.record?.invoice_number}\n\nThis action cannot be undone.`
            : `Are you sure you want to delete this record?\n\nProject Site: ${dialog.record?.project_site}\nDocument #: ${dialog.record?.invoice_number}\n\nThis action cannot be undone.`
        }
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDialog({ isOpen: false, record: null, isLoading: false })
        }
        isLoading={dialog.isLoading}
      />

      <DashboardViewModal
        isOpen={viewModal.isOpen}
        onClose={handleCloseViewModal}
        recordId={viewModal.recordId}
        onEdit={(record) => {
          handleCloseViewModal();
          handleEdit(record);
        }}
        onUpdated={onRecordUpdated}
      />

      <DashboardEditModal
        key={editModal.record?.ID || editModal.record?.id || "edit-modal"}
        isOpen={editModal.isOpen}
        onClose={handleCloseEditModal}
        record={editModal.record}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default DashboardTable;
