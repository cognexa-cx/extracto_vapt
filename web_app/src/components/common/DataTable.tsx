import React from "react";
import {
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
  MapPin,
} from "lucide-react";

const DataTable = ({
  data = [],
  onActionClick,
  onRowClick,
  renderAction,
  visibleColumns = {},
  simple = false,
  srStart,
  loading = false,
  selectedIds,
  onToggleRow,
  onToggleSelectAll,
}: any) => {
  const selectable = !!(selectedIds && onToggleRow);
  const rowId = (row, idx) => row.ID || row.id || idx;
  const defaultVisibleColumns = {
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
  };

  const simpleVisibleColumns = {
    id: true,
    project_site: false,
    vendor_name: false,
    destination_site: false,
    invoice_number: false,
    invoice_date: true,
    invoice_time: true,
    vehicle_number: false,
    approval_status: false,
    inward_outward: false,
    document_type: false,
  };

  const columns = simple
    ? simpleVisibleColumns
    : { ...defaultVisibleColumns, ...visibleColumns };

  const displayValue = (value) =>
    value === null || value === undefined || value === "" ? "-" : value;

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return "-";
    }
  };

  // Status Badge
  const StatusBadge = ({ status }) => {
    if (!status || status === "") {
      return (
        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-medium border bg-slate-50 text-slate-500 border-slate-200 min-w-[100px]">
          <Clock className="w-4 h-4 mr-1.5" />-
        </span>
      );
    }
    const normalized = status.toLowerCase();
    let styles, icon;
    if (normalized === "approve") {
      styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
      icon = <CheckCircle2 className="w-4 h-4 mr-1.5" />;
    } else if (normalized === "reject") {
      styles = "bg-rose-50 text-rose-700 border-rose-200";
      icon = <AlertCircle className="w-4 h-4 mr-1.5" />;
    } else {
      styles = "bg-amber-50 text-amber-700 border-amber-200";
      icon = <Clock className="w-4 h-4 mr-1.5" />;
    }
    return (
      <span
        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-medium border ${styles} min-w-[100px]`}
      >
        {icon}
        {status}
      </span>
    );
  };

  // Type Badge
  const TypeBadge = ({ type }) => {
    if (!type || type === "") {
      return (
        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wide border bg-slate-50 text-slate-500 border-slate-200 min-w-[110px]">
          -
        </span>
      );
    }
    const normalized = type.toLowerCase();
    let styles, icon;
    if (normalized === "inward") {
      styles = "bg-blue-50 text-blue-700 border-blue-200";
      icon = <Package className="w-4 h-4 mr-1.5" />;
    } else if (normalized === "outward") {
      styles = "bg-orange-50 text-orange-700 border-orange-200";
      icon = <Package className="w-4 h-4 mr-1.5 rotate-180" />;
    } else {
      styles = "bg-slate-50 text-slate-600 border-slate-200";
      icon = null;
    }
    return (
      <span
        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wide border ${styles} min-w-[110px]`}
      >
        {icon}
        {type}
      </span>
    );
  };

  // Build headers
  const headers = [];
  if (columns.id) headers.push("SR#");
  if (columns.project_site) headers.push("PROJECT SITE"); // ← was ISSUER
  if (columns.vendor_name) headers.push("VENDOR NAME");
  if (columns.destination_site) headers.push("DESTINATION"); // ← new
  if (columns.invoice_number) headers.push("DOCUMENT NO.");
  if (columns.invoice_date) headers.push("DATE");
  if (columns.invoice_time) headers.push("TIME");
  if (columns.vehicle_number) headers.push("VEHICLE NO.");
  if (columns.approval_status) headers.push("STATUS");
  if (columns.inward_outward) headers.push("DIRECTION");
  if (columns.document_type) headers.push("DOC TYPE");
  headers.push(""); // actions

  if (loading && (!data || data.length === 0)) {
    return (
      <div className="w-full h-full overflow-x-auto">
        <table className="w-full min-w-[900px] text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-700 to-slate-800">
            <tr className="border-b-2 border-slate-900 shadow-md">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...Array(10)].map((_, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                {headers.map((_, colIdx) => (
                  <td key={colIdx} className="px-6 py-5">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: colIdx === headers.length - 1 ? "24px" : "70%" }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700 mb-1">
          No records found
        </p>
        <p className="text-sm text-slate-500">
          Try adjusting your filters or search
        </p>
      </div>
    );
  }

  const allSelected = selectable && data.length > 0 && data.every((row, idx) => selectedIds.has(rowId(row, idx)));

  return (
    <div className="w-full h-full overflow-x-auto">
      <table className="w-full min-w-[900px] text-left border-collapse">
        <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-700 to-slate-800">
          <tr className="border-b-2 border-slate-900 shadow-md">
            {selectable && (
              <th className="w-10 px-4 py-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="h-3.5 w-3.5 accent-indigo-400"
                />
              </th>
            )}
            {headers.map((header, i) => (
              <th
                key={i}
                className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => {
            const rowBg = idx % 2 === 0 ? "bg-white" : "bg-slate-50/30";
            const id = rowId(row, idx);
            return (
              <tr
                key={id}
                onClick={() => onRowClick?.(row)}
                className={`${rowBg} hover:bg-indigo-50/50 transition-colors duration-150 group ${onRowClick ? "cursor-pointer" : ""}`}
              >
                {selectable && (
                  <td className="px-4 py-5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(id)}
                      onChange={() => onToggleRow(id)}
                      className="h-3.5 w-3.5 accent-indigo-600"
                    />
                  </td>
                )}
                {/* SR# */}
                {columns.id && (
                  <td className="px-6 py-5">
                    <span className="text-base font-semibold text-slate-500 bg-slate-100 rounded-lg px-3 py-1.5 inline-block min-w-12 text-center">
                      {srStart != null ? srStart - idx : idx + 1}
                    </span>
                  </td>
                )}

                {/* Project Site */}
                {columns.project_site && (
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <p
                        className="text-sm font-medium text-slate-900 truncate max-w-[160px]"
                        title={row.project_site || "-"}
                      >
                        {displayValue(row.project_site)}
                      </p>
                    </div>
                  </td>
                )}

                {/* Vendor Name */}
                {columns.vendor_name && (
                  <td className="px-6 py-5">
                    {/* One vendor per line -- a page with 2 vendors lists
                        the 2nd name below the 1st instead of truncating. */}
                    <div
                      className="text-sm font-medium text-slate-900 max-w-[220px] whitespace-pre-line break-words"
                      title={row.vendor_name || "-"}
                    >
                      {displayValue(row.vendor_name)}
                    </div>
                  </td>
                )}

                {/* Destination Site */}
                {columns.destination_site && (
                  <td className="px-6 py-5">
                    <p
                      className="text-sm text-slate-600 truncate max-w-[160px]"
                      title={row.destination_site || "-"}
                    >
                      {displayValue(row.destination_site)}
                    </p>
                  </td>
                )}

                {/* Document No. */}
                {columns.invoice_number && (
                  <td className="px-6 py-5">
                    <span
                      className="text-base font-mono text-slate-600 truncate block max-w-[120px]"
                      title={row.invoice_number || "-"}
                    >
                      {displayValue(row.invoice_number)}
                    </span>
                  </td>
                )}

                {/* Date */}
                {columns.invoice_date && (
                  <td className="px-6 py-5 text-base text-slate-600 whitespace-nowrap">
                    {formatDate(row.invoice_date)}
                  </td>
                )}

                {/* Time */}
                {columns.invoice_time && (
                  <td className="px-6 py-5 text-base text-slate-600 whitespace-nowrap">
                    {formatTime(row.invoice_date)}
                  </td>
                )}

                {/* Vehicle No. */}
                {columns.vehicle_number && (
                  <td className="px-6 py-5">
                    <span className="text-base font-mono text-slate-700">
                      {displayValue(row.vehicle_number)}
                    </span>
                  </td>
                )}

                {/* Status */}
                {columns.approval_status && (
                  <td className="px-6 py-5">
                    <StatusBadge status={row.approval_status} />
                  </td>
                )}

                {/* Direction */}
                {columns.inward_outward && (
                  <td className="px-6 py-5">
                    <TypeBadge type={row.inward_outward} />
                  </td>
                )}

                {/* Doc Type */}
                {columns.document_type && (
                  <td className="px-6 py-5">
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md uppercase">
                      {displayValue(row.document_type)}
                    </span>
                  </td>
                )}

                {/* Action */}
                <td
                  className="px-6 py-5 text-right relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderAction ? (
                    renderAction(row)
                  ) : (
                    <button className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
