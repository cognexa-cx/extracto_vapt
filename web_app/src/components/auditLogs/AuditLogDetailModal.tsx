import React from "react";
import { createPortal } from "react-dom";
import { X, Clock, User, Globe, Layers, Hash, Info, ShieldCheck, ShieldAlert } from "lucide-react";

const ACTION_BADGE = {
  Login: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  "Login Failed": "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
  Logout: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  Create: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  Update: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  Delete: "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
  Approve: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  Reject: "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
  Activate: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  Deactivate: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  "Permission Change": "bg-purple-50 text-purple-700 ring-1 ring-purple-100",
  Export: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
};

const safeParse = (value) => {
  if (!value) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

// snake_case / camelCase -> "Title Case"
const humanizeKey = (key) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && ISO_DATE_RE.test(value)) {
    const d = new Date(value.replace(" ", "T"));
    if (!isNaN(d.getTime())) return d.toLocaleString();
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

// Merge before/after keys into one ordered field list so a diff-style table
// can be built from any combination of the two.
const buildFieldRows = (before, after) => {
  const keys = new Set([...(before ? Object.keys(before) : []), ...(after ? Object.keys(after) : [])]);
  return Array.from(keys)
    .filter((k) => !["created_at", "updated_at"].includes(k))
    .map((key) => {
      const beforeVal = before ? before[key] : undefined;
      const afterVal = after ? after[key] : undefined;
      const changed = before && after && formatValue(beforeVal) !== formatValue(afterVal);
      return { key, beforeVal, afterVal, changed };
    });
};

const InfoItem = ({ icon: Icon, label, value, mono = false }) => (
  <div className="flex items-start gap-2.5">
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
      <Icon className="h-3.5 w-3.5" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm text-slate-800 break-words ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  </div>
);

const FieldsTable = ({ rows, mode }) => {
  if (!rows.length) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2 text-left font-semibold w-1/3">Field</th>
            {mode === "diff" ? (
              <>
                <th className="px-3 py-2 text-left font-semibold">Before</th>
                <th className="px-3 py-2 text-left font-semibold">After</th>
              </>
            ) : (
              <th className="px-3 py-2 text-left font-semibold">Value</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, beforeVal, afterVal, changed }) => (
            <tr key={key} className={`border-t border-slate-100 ${changed ? "bg-amber-50/60" : ""}`}>
              <td className="px-3 py-2 align-top font-medium text-slate-600">{humanizeKey(key)}</td>
              {mode === "diff" ? (
                <>
                  <td className={`px-3 py-2 align-top break-words ${changed ? "text-rose-600 line-through decoration-rose-300" : "text-slate-700"}`}>
                    {formatValue(beforeVal)}
                  </td>
                  <td className={`px-3 py-2 align-top break-words ${changed ? "font-semibold text-emerald-700" : "text-slate-700"}`}>
                    {formatValue(afterVal)}
                  </td>
                </>
              ) : (
                <td className="px-3 py-2 align-top break-words text-slate-700">
                  {formatValue(mode === "after" ? afterVal : beforeVal)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AuditLogDetailModal = ({ isOpen, onClose, log }) => {
  if (!isOpen || !log) return null;

  const before = safeParse(log.before_data);
  const after = safeParse(log.after_data);

  let mode = null;
  let rows = [];
  if (before && after) {
    mode = "diff";
    rows = buildFieldRows(before, after);
  } else if (after) {
    mode = "after";
    rows = buildFieldRows(null, after);
  } else if (before) {
    mode = "before";
    rows = buildFieldRows(before, null);
  }

  const sectionTitle =
    mode === "diff" ? "What Changed" : mode === "after" ? "Record Created" : mode === "before" ? "Record Deleted" : null;

  const isSuccess = log.status === "Success";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Audit Log Detail</h2>
            <p className="mt-0.5 text-xs text-slate-300">Entry #{log.id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-white/20">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action + Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${ACTION_BADGE[log.action] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>
              {log.action}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                isSuccess ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-rose-50 text-rose-600 ring-1 ring-rose-100"
              }`}
            >
              {isSuccess ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
              {log.status}
            </span>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
            <InfoItem icon={Clock} label="Timestamp" value={new Date(log.created_at).toLocaleString()} />
            <InfoItem
              icon={User}
              label="Performed By"
              value={
                log.actor_email || log.actor_emp_id
                  ? `${log.actor_email || log.actor_emp_id}${log.actor_role ? " · " + log.actor_role : ""}`
                  : "System / Unauthenticated"
              }
            />
            <InfoItem icon={Layers} label="Module" value={log.module} />
            <InfoItem icon={Hash} label="Entity ID" value={log.entity_id || "—"} mono />
            <InfoItem icon={Globe} label="IP Address" value={log.ip_address || "—"} mono />
            <InfoItem icon={User} label="Employee ID" value={log.actor_emp_id || "—"} mono />
          </div>

          {/* Description */}
          {log.description && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
              <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p className="text-sm text-slate-800">{log.description}</p>
              </div>
            </div>
          )}

          {/* Field data */}
          {sectionTitle && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{sectionTitle}</p>
              <FieldsTable rows={rows} mode={mode} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AuditLogDetailModal;
