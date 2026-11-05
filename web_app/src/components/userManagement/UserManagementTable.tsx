import React, { useState } from "react";
import {
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  MapPin,
  Shield,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  FilterX,
  Settings,
  X,
  Eye,
} from "lucide-react";
import ExportDropdown from "../common/ExportDropdown";
// ✅ FIXED: Import USER export utilities, not invoice utilities
import {
  exportUsersToExcel,
  exportUsersToPDF,
  mapUserDataForExport,
  getDateStamp,
} from "../../utils/exportUsersUtils";

const ITEMS_PER_PAGE = 30;

const UserManagementTable = ({
  employees = [],
  onEditEmployee,
  onDeleteEmployee,
  onToggleStatus,
  onViewEmployee,
  activeFilter,
  onClearFilter,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [tableFilter, setTableFilter] = useState({
    status: [],
    designation: [],
    location: [],
  });
  const [visibleColumns, setVisibleColumns] = useState({
    emp_id: true,
    employee_details: true,
    contact_info: true,
    location: true,
    designation: true,
    status: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Sorting function
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      }
    }
    setSortConfig({ key, direction });
  };

  // Apply filters
  const getFilteredEmployees = () => {
    let filtered = [...employees];

    if (tableFilter.status.length > 0) {
      filtered = filtered.filter((e) =>
        tableFilter.status.includes(e.Status?.toLowerCase()),
      );
    }

    if (tableFilter.designation.length > 0) {
      filtered = filtered.filter((e) =>
        tableFilter.designation.includes(e.Designation?.toLowerCase()),
      );
    }

    if (tableFilter.location.length > 0) {
      filtered = filtered.filter((e) =>
        tableFilter.location.includes(e.Base_Location?.toLowerCase()),
      );
    }

    return filtered;
  };

  // Apply sorting
  const getSortedEmployees = () => {
    const filtered = getFilteredEmployees();

    if (!sortConfig.key || !sortConfig.direction) {
      return filtered;
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  };

  const sortedEmployees = getSortedEmployees();
  const totalItems = sortedEmployees?.length || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEmployees = sortedEmployees.slice(startIndex, endIndex);

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const allOnPageSelected =
    paginatedEmployees.length > 0 && paginatedEmployees.every((e) => selectedIds.has(e.Emp_Id));
  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) paginatedEmployees.forEach((e) => next.delete(e.Emp_Id));
      else paginatedEmployees.forEach((e) => next.add(e.Emp_Id));
      return next;
    });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  // ✅ FIXED: Export handlers using USER export utilities
  const handleExport = async (format = "excel") => {
    console.log(`=== 📊 TABLE ${format.toUpperCase()} EXPORT TRIGGERED ===`);

    setIsExporting(true);

    try {
      const dataToExport =
        selectedIds.size > 0 ? sortedEmployees.filter((e) => selectedIds.has(e.Emp_Id)) : sortedEmployees;

      console.log("1️⃣ Data to export:", dataToExport?.length, "employees");
      console.log("2️⃣ First employee record:", dataToExport?.[0]);

      if (!dataToExport || dataToExport.length === 0) {
        console.warn("⚠️ No data to export");
        return;
      }

      // Map the data for export
      console.log("3️⃣ Mapping employee data...");
      const mappedData = mapUserDataForExport(dataToExport);

      console.log("4️⃣ Mapped data:", mappedData?.length, "records");
      console.log("5️⃣ First mapped record:", mappedData?.[0]);

      // Generate filename
      const hasActiveFilter =
        tableFilter.status.length > 0 ||
        tableFilter.designation.length > 0 ||
        tableFilter.location.length > 0 ||
        sortConfig.key;

      const filename = hasActiveFilter
        ? `employees_filtered_${getDateStamp()}`
        : `employees_${getDateStamp()}`;

      console.log("6️⃣ Filename:", filename);

      // Export using the correct utility
      if (format === "excel") {
        console.log("7️⃣ Calling exportUsersToExcel...");
        const success = await exportUsersToExcel(mappedData, filename);
        console.log("8️⃣ Export result:", success);
      } else if (format === "pdf") {
        console.log("7️⃣ Calling exportUsersToPDF...");
        const success = exportUsersToPDF(mappedData, filename);
        console.log("8️⃣ Export result:", success);
      }

      console.log(`✅ ${format.toUpperCase()} export complete`);
    } catch (error) {
      console.error(`❌ Export to ${format} failed:`, error);
      console.error("❌ Error stack:", error.stack);
    } finally {
      setIsExporting(false);
      console.log(`=== 📊 TABLE ${format.toUpperCase()} EXPORT COMPLETE ===`);
    }
  };

  const handleExportExcel = () => handleExport("excel");
  const handleExportPDF = () => handleExport("pdf");

  const hasActiveFilter =
    tableFilter.status.length > 0 ||
    tableFilter.designation.length > 0 ||
    tableFilter.location.length > 0;

  const clearAllFilters = () => {
    setTableFilter({
      status: [],
      designation: [],
      location: [],
    });
    setSortConfig({ key: null, direction: null });
    setCurrentPage(1);
  };

  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const toggleStatusFilter = (status) => {
    setTableFilter((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
    setCurrentPage(1);
  };

  const toggleDesignationFilter = (designation) => {
    setTableFilter((prev) => ({
      ...prev,
      designation: prev.designation.includes(designation)
        ? prev.designation.filter((d) => d !== designation)
        : [...prev.designation, designation],
    }));
    setCurrentPage(1);
  };

  const toggleLocationFilter = (location) => {
    setTableFilter((prev) => ({
      ...prev,
      location: prev.location.includes(location)
        ? prev.location.filter((l) => l !== location)
        : [...prev.location, location],
    }));
    setCurrentPage(1);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const isActive = status === "Active";
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
          isActive
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700"
        }`}
      >
        {isActive ? (
          <UserCheck className="w-3 h-3" />
        ) : (
          <UserX className="w-3 h-3" />
        )}
        {status}
      </div>
    );
  };

  // Get designation badge
  const getDesignationBadge = (designation) => {
    const isAdmin = designation?.toLowerCase() === "admin";
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
          isAdmin ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-700"
        }`}
      >
        <Shield className="w-3 h-3" />
        {designation}
      </div>
    );
  };

  // ✅ FIXED: Sort Dropdown Component with proper z-index
  const SortDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);

    const sortOptions = [
      { key: "Emp_Id", label: "User ID" },
      { key: "Emp_Name", label: "Name" },
      { key: "Emp_Email", label: "Email" },
      { key: "Designation", label: "Designation" },
      { key: "Base_Location", label: "Location" },
      { key: "Status", label: "Status" },
    ];

    const getSortIcon = (key) => {
      if (sortConfig.key !== key) {
        return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
      }
      if (sortConfig.direction === "asc") {
        return <ArrowUp className="w-4 h-4 text-teal-600" />;
      }
      if (sortConfig.direction === "desc") {
        return <ArrowDown className="w-4 h-4 text-teal-600" />;
      }
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    };

    const getCurrentSortLabel = () => {
      if (!sortConfig.key || !sortConfig.direction) {
        return "Sort By";
      }
      const option = sortOptions.find((opt) => opt.key === sortConfig.key);
      const directionText = sortConfig.direction === "asc" ? "↑" : "↓";
      return `${option?.label || "Sort"} ${directionText}`;
    };

    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>{getCurrentSortLabel()}</span>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
            />
            <div
              className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-[9999] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => {
                      handleSort(option.key);
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
                        setSortConfig({ key: null, direction: null });
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
          </>
        )}
      </div>
    );
  };

  // ✅ FIXED: Advanced Filter Dropdown with proper z-index
  const AdvancedFilterDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);

    const activeFilterCount =
      tableFilter.status.length +
      tableFilter.designation.length +
      tableFilter.location.length;

    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
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
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
            />
            <div
              className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-[9999] overflow-hidden max-h-[500px] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
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
                    {["active", "inactive"].map((status) => (
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

                {/* Designation Filter */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                    <span className="w-1 h-4 bg-blue-500 rounded"></span>
                    Designation (Multi-select)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["admin", "user", "security", "other"].map((des) => (
                      <button
                        key={des}
                        onClick={() => toggleDesignationFilter(des)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          tableFilter.designation.includes(des)
                            ? "bg-blue-100 text-blue-700 border-blue-300"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {tableFilter.designation.includes(des) && "✓ "}
                        {des.charAt(0).toUpperCase() + des.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location Filter */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                    <span className="w-1 h-4 bg-cyan-500 rounded"></span>
                    Location (Multi-select)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Chennai"].map((loc) => (
                      <button
                        key={loc}
                        onClick={() => toggleLocationFilter(loc)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          tableFilter.location.includes(loc)
                            ? "bg-cyan-100 text-cyan-700 border-cyan-300"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {tableFilter.location.includes(loc) && "✓ "}
                        {loc.charAt(0).toUpperCase() + loc.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {hasActiveFilter && (
                  <>
                    <div className="h-px bg-slate-200 my-3" />
                    <button
                      onClick={() => {
                        setTableFilter({
                          status: [],
                          designation: [],
                          location: [],
                        });
                        setCurrentPage(1);
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
          </>
        )}
      </div>
    );
  };

  // ✅ FIXED: Column Customization Dropdown with proper z-index
  const ColumnCustomizationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);

    const columns = [
      { key: "emp_id", label: "User ID" },
      { key: "employee_details", label: "User Details" },
      { key: "contact_info", label: "Contact Info" },
      { key: "location", label: "Location" },
      { key: "designation", label: "Designation" },
      { key: "status", label: "Status" },
    ];

    const visibleCount = Object.values(visibleColumns).filter(Boolean).length;

    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
        >
          <Settings className="w-4 h-4" />
          <span>Columns</span>
          <span className="text-xs text-slate-500">
            ({visibleCount}/{columns.length})
          </span>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
            />
            <div
              className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-[9999] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
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
                        checked={visibleColumns[column.key]}
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
                      const allVisible: Record<string, boolean> = {};
                      Object.keys(visibleColumns).forEach((key) => {
                        allVisible[key] = true;
                      });
                      setVisibleColumns(allVisible as any);
                    }}
                    className="flex-1 px-3 py-1.5 bg-teal-50 text-teal-700 rounded text-xs font-medium hover:bg-teal-100 transition-colors"
                  >
                    Show All
                  </button>
                  <button
                    onClick={() => {
                      setVisibleColumns({
                        emp_id: true,
                        employee_details: true,
                        contact_info: false,
                        location: false,
                        designation: true,
                        status: true,
                      });
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200 transition-colors"
                  >
                    Essential Only
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <UserX className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          No Users Found
        </h3>
        <p className="text-gray-500 text-sm text-center max-w-md">
          {activeFilter
            ? "No users match the current filter. Try adjusting your filters."
            : "Get started by adding your first user to the system."}
        </p>
        {activeFilter && (
          <button
            onClick={onClearFilter}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-all"
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full flex-1 min-h-0">
      {/* SINGLE ROW - ALL CONTROLS */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-y-2 bg-white shrink-0">
        {/* Left Side - Title + Info */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">
              User Directory
            </h2>
            <p className="text-[10px] text-gray-500">
              Real-time user management
            </p>
          </div>
          <div className="h-8 w-px bg-gray-200"></div>
          <span className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-[10px] font-bold uppercase border border-teal-100">
            {totalItems} Users
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

        {/* Right Side - All Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="h-6 w-px bg-gray-200"></div>
          <SortDropdown />
          <AdvancedFilterDropdown />
          <ColumnCustomizationDropdown />
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

      {/* Table — the only part of this card that scrolls. Natural
          (table-auto) column sizing + whitespace-nowrap — no fixed
          percentage-column math to get subtly wrong on a different font/
          zoom/browser and silently truncate a header with real room
          elsewhere in the table. Every column is exactly as wide as its
          content needs; if that's wider than the card, this overflow-auto
          scrolls horizontally instead of ever cutting text off. */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
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
              {visibleColumns.emp_id && (
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">
                  User ID
                </th>
              )}
              {visibleColumns.employee_details && (
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">
                  User Details
                </th>
              )}
              {visibleColumns.contact_info && (
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">
                  Contact Info
                </th>
              )}
              {visibleColumns.location && (
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">
                  Location
                </th>
              )}
              {visibleColumns.designation && (
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">
                  Designation
                </th>
              )}
              {visibleColumns.status && (
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">
                  Status
                </th>
              )}
              <th className="px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployees.map((employee) => (
              <tr
                key={employee.Emp_Id}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(employee.Emp_Id)}
                    onChange={() => toggleRow(employee.Emp_Id)}
                    className="h-3.5 w-3.5 accent-indigo-600"
                  />
                </td>
                {/* Employee ID */}
                {visibleColumns.emp_id && (
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {employee.Emp_Id}
                    </span>
                  </td>
                )}

                {/* Employee Details */}
                {visibleColumns.employee_details && (
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col">
                      <span className="whitespace-nowrap text-sm font-bold text-gray-900">
                        {employee.Emp_Name}
                      </span>
                      <span className="whitespace-nowrap text-xs text-gray-500 mt-0.5">
                        @{employee.Username}
                      </span>
                    </div>
                  </td>
                )}

                {/* Contact Info */}
                {visibleColumns.contact_info && (
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="whitespace-nowrap">
                          {employee.Emp_Email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{employee.Phone_Number}</span>
                      </div>
                    </div>
                  </td>
                )}

                {/* Location */}
                {visibleColumns.location && (
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {employee.Base_Location}
                    </div>
                  </td>
                )}

                {/* Designation */}
                {visibleColumns.designation && (
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {getDesignationBadge(employee.Designation)}
                  </td>
                )}

                {/* Status */}
                {visibleColumns.status && (
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {getStatusBadge(employee.Status)}
                  </td>
                )}

                {/* Actions */}
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="flex items-center justify-start gap-2">
                    {/* View Button */}
                    <button
                      onClick={() => onViewEmployee && onViewEmployee(employee)}
                      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                      title="View User"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Edit Button */}
                    {onEditEmployee && (
                      <button
                        onClick={() => onEditEmployee(employee)}
                        className="p-2 bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-lg transition-all"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete Button — Admin accounts can never be deleted,
                        and everyone else must be deactivated first (matches
                        the backend's own delete_employee guard). */}
                    {onDeleteEmployee && (() => {
                      const isAdmin = employee.Designation === "Admin";
                      const isActive = employee.Status === "Active";
                      const disabled = isAdmin || isActive;
                      const title = isAdmin
                        ? "Admin accounts can't be deleted"
                        : isActive
                          ? "Deactivate this user before deleting them"
                          : "Delete User";
                      return (
                        <button
                          onClick={() => !disabled && onDeleteEmployee(employee)}
                          disabled={disabled}
                          className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-50"
                          title={title}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      );
                    })()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer — outside the scroll area, always visible */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 shrink-0 text-xs text-slate-500">
        <span>
          Showing {startIndex + 1}–{Math.min(endIndex, totalItems)} of {totalItems}
          {hasActiveFilter && <span className="ml-1.5 text-teal-600 font-medium">(filtered)</span>}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagementTable;
