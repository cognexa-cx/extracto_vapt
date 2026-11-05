// Frontend\tab\src\components\RecordDetailModal.jsx
import { X, RotateCcw, CheckCircle2, PackageCheck } from "lucide-react";

const fmt = (key) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function renderValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    if (isPlainObject(value[0])) {
      const cols = Array.from(new Set(value.flatMap((row) => Object.keys(row || {}))));
      return (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50">
                {cols.map((c) => (
                  <th key={c} className="px-2 py-1.5 text-left font-bold text-slate-500 uppercase whitespace-nowrap">
                    {fmt(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {value.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  {cols.map((c) => (
                    <td key={c} className="px-2 py-1.5 text-slate-700 align-top">
                      {row?.[c] == null || row?.[c] === "" ? "-" : String(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <ul className="list-disc list-inside space-y-0.5">
        {value.map((item, i) => (
          <li key={i} className="text-sm text-slate-700">
            {typeof item === "object" ? JSON.stringify(item) : String(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (isPlainObject(value)) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pl-2 border-l border-slate-200">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="text-xs">
            <span className="font-semibold text-slate-400 uppercase">{fmt(k)}: </span>
            <span className="text-slate-800">
              {v == null || v === "" ? "-" : typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return String(value);
}

// Full record detail view — mirrors Extracto-Web's DashboardViewModal so both
// apps show the same information, just in Tab's own visual style.
export default function RecordDetailModal({ record, onClose, onMarkReturned, isMarking }) {
  if (!record) return null;

  const extracted = record.extracted_data || {};
  const entries = Object.entries(extracted).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  const returnStatus = record.return_status || "active";
  const isReturned = returnStatus === "returned";
  const isReturnable = (record.direction || "").toLowerCase() === "returnable";

  const images = [
    { label: "Challan", url: record.challan_image_url },
    { label: "Vehicle Front", url: record.vehicle_front_url },
    { label: "Vehicle Back", url: record.vehicle_back_url },
  ].filter((img) => img.url);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-blue-600 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">Record Details</h2>
            <p className="text-xs text-blue-100 mt-0.5 truncate">
              {(record.direction || "-").toUpperCase()} &bull; {(record.document_type || "-").toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors shrink-0"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-3">
          {isReturnable && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700 uppercase">Return Status</span>
              </div>
              <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      isReturned ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {isReturned ? "Returned" : "Active"}
                  </span>
                  {isReturned && record.returned_at && (
                    <p className="text-xs text-slate-500 mt-1.5">
                      Returned on{" "}
                      {new Date(record.returned_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </p>
                  )}
                </div>
                {!isReturned && onMarkReturned && (
                  <button
                    type="button"
                    onClick={onMarkReturned}
                    disabled={isMarking}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Mark Returned
                  </button>
                )}
                {isReturned && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Done
                  </span>
                )}
              </div>
            </div>
          )}

          {entries.length === 0 ? (
            <p className="p-4 text-sm text-slate-400 bg-white border border-slate-200 rounded-lg">
              No extracted data available.
            </p>
          ) : (
            entries.map(([key, value]) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50">
                  <span className="text-xs font-bold text-slate-700 uppercase">{fmt(key)}</span>
                </div>
                <div className="p-4">{renderValue(value)}</div>
              </div>
            ))
          )}

          {images.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50">
                <span className="text-xs font-bold text-slate-700 uppercase">Images</span>
              </div>
              <div className="p-4 flex gap-4 flex-wrap">
                {images.map((img) => (
                  <a
                    key={img.label}
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center"
                  >
                    <img
                      src={img.url}
                      alt={img.label}
                      className="h-28 w-auto rounded-lg border border-slate-200 object-cover hover:opacity-80 transition-opacity"
                    />
                    <p className="text-xs text-slate-500 mt-1">{img.label}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 bg-white border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
