import React from "react";
import { createPortal } from "react-dom";
import { X, Clock, Truck, User, MapPin, FileText, ImageOff } from "lucide-react";

const DIRECTION_BADGE = {
  Inward: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  Outward: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100",
  Returnable: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
};

const STATUS_BADGE = {
  Approve: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  Reject: "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
};

const RETURN_BADGE = {
  active: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  returned: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
};

// snake_case / camelCase -> "Title Case"
const humanizeKey = (key) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

// A single array entry -> a readable string. Plain values stringify as-is;
// an object entry (e.g. one line item: {name, qty, rate}) renders as its
// own "key: value, key: value" list instead of falling through to
// Array.prototype.join's default toString(), which produces "[object
// Object]" for every object element.
const stringifyArrayItem = (item) => {
  if (item === null || item === undefined) return "";
  if (typeof item !== "object") return String(item);
  return Object.entries(item)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${humanizeKey(k)}: ${Array.isArray(v) ? v.map(stringifyArrayItem).join(", ") : v}`)
    .join(", ");
};

const flattenFields = (obj, prefix = "") => {
  if (!obj || typeof obj !== "object") return [];
  const rows = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === "") continue;
    const label = prefix ? `${prefix} — ${humanizeKey(key)}` : humanizeKey(key);
    if (Array.isArray(value)) {
      rows.push({ label, value: value.map(stringifyArrayItem).join("; ") });
    } else if (typeof value === "object") {
      rows.push(...flattenFields(value, label));
    } else {
      rows.push({ label, value: String(value) });
    }
  }
  return rows;
};

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2.5">
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
      <Icon className="h-3.5 w-3.5" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-800 break-words">{value || "—"}</p>
    </div>
  </div>
);

const ImageThumb = ({ label, url }) =>
  url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
    >
      <img src={url} alt={label} className="h-28 w-full object-cover" />
      <p className="px-2 py-1.5 text-[11px] font-semibold text-slate-500">{label}</p>
    </a>
  ) : (
    <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 text-slate-300">
      <ImageOff className="h-5 w-5" />
      <p className="text-[11px] font-semibold">{label}</p>
    </div>
  );

const ReportDetailModal = ({ isOpen, onClose, record }) => {
  if (!isOpen || !record) return null;

  const fieldRows =
    record.entry_type === "manual"
      ? (record.manual_fields || []).map((f) => ({ label: f.key, value: f.value }))
      : flattenFields(record.extracted_data);

  const direction = record.inward_outward;
  const status = record.approval_status;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Report Detail</h2>
            <p className="mt-0.5 text-xs text-slate-300">{record.invoice_number || record.id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-white/20">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {direction && (
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${DIRECTION_BADGE[direction] || "bg-slate-100 text-slate-600"}`}>
                {direction}
              </span>
            )}
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[status] || "bg-slate-100 text-slate-600"}`}>
              {status}
            </span>
            {record.return_status && (
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${RETURN_BADGE[record.return_status] || "bg-slate-100 text-slate-600"}`}>
                {record.return_status === "returned" ? "Returned" : "Active"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
            <InfoItem icon={FileText} label="Vendor" value={record.vendor_name} />
            <InfoItem icon={Clock} label="Date" value={record.invoice_date ? new Date(record.invoice_date).toLocaleString() : "—"} />
            <InfoItem icon={MapPin} label="Project Site" value={record.project_site} />
            <InfoItem icon={MapPin} label="Destination" value={record.destination_site} />
            <InfoItem icon={Truck} label="Vehicle No" value={record.vehicle_number} />
            <InfoItem icon={User} label="Driver" value={record.driver_name} />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Images</p>
            <div className="grid grid-cols-3 gap-2">
              <ImageThumb label="Document" url={record.challan_image_url} />
              <ImageThumb label="Vehicle Front" url={record.vehicle_front_url} />
              <ImageThumb label="Vehicle Back" url={record.vehicle_back_url} />
            </div>
          </div>

          {fieldRows.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {record.entry_type === "manual" ? "Manual Fields" : "Extracted Fields"}
              </p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <tbody>
                    {fieldRows.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 first:border-t-0">
                        <td className="w-2/5 px-3 py-2 align-top font-medium text-slate-600">{row.label}</td>
                        <td className="px-3 py-2 align-top break-words text-slate-700">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ReportDetailModal;
