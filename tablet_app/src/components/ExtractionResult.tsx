// Frontend\tab\src\components\ExtractionResult.jsx
import { useState } from "react";
import {
  CheckCircle,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (key) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Keys that are always top-level metadata — displayed in the header band
const META_KEYS = new Set([
  "document_type", "entry_type"
]);

// Keys treated as "section containers" — their value is an object or array
// which gets its own collapsible section panel
const KNOWN_SECTION_KEYS = new Set([
  "document_metadata",
  "issuer_details",
  "person_details",
  "source_destination",
  "transporter_details",
  "items",
  "signatures",
  "line_items",
  "parties",
  "header",
  "footer",
  "additional_notes",
]);

const PREFERRED_DATE_KEYS = [
  "date", "invoice_date", "challan_date", "dispatch_date", "entry_date",
  "document_date", "bill_date", "receipt_date", "po_date",
];

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T/;
const formatDisplay = (raw) =>
  typeof raw === "string" && ISO_DATETIME_RE.test(raw)
    ? new Date(raw).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : raw;

// ── Leaf value — a plain controlled input while editMode is on, read-only
// text otherwise. There's no per-field toggle any more: the single Edit
// button in the footer flips every field into an input at once. Booleans
// go through this same plain text box (shown as "Yes"/"No") rather than a
// dropdown, so every field edits the same way.
function EditableLeaf({ value, path, onChange, editMode }) {
  const raw =
    value === null || value === undefined || value === ""
      ? ""
      : typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : String(value);
  const display = formatDisplay(raw);

  if (!editMode) {
    return display === "" ? (
      <span className="text-gray-400 italic text-sm">—</span>
    ) : (
      <span className="text-sm font-medium text-gray-900 break-words">{display}</span>
    );
  }

  return (
    <input
      type="text"
      value={raw}
      onChange={(e) => onChange(path, e.target.value)}
      className="w-full rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
    />
  );
}

// ── Value renderer (recursive for nested objects) ─────────────────────────────
// `path` locates this value inside the root extracted_data object (string
// keys for object props, numbers for array indices); `onChange(path,
// newValue)` patches it there and `editMode` — toggled by the single Edit
// button in the footer — switches every field between read-only text and a
// live input at once.
function RenderValue({ value, path = [], onChange, editMode, depth = 0 }) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") {
    return <EditableLeaf value={value} path={path} onChange={onChange} editMode={editMode} />;
  }

  // Array of objects → compact editable table
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === "object" &&
    value[0] !== null
  ) {
    const cols = Array.from(new Set(value.flatMap((r) => Object.keys(r))));
    return (
      <div className="overflow-x-auto mt-1">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {cols.map((c) => (
                <th
                  key={c}
                  className="px-2 py-1.5 border border-gray-200 text-left font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {fmt(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {cols.map((c) => (
                  <td
                    key={c}
                    className="px-2 py-1.5 border border-gray-200 text-gray-800 align-top"
                  >
                    {/* Cells can themselves hold nested objects/arrays (e.g.
                        a signature block inside a multi-page item row) —
                        reuse RenderValue instead of String(), which just
                        printed "[object Object]" for those. */}
                    <RenderValue value={row[c]} path={[...path, i, c]} onChange={onChange} editMode={editMode} depth={depth + 1} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Array of primitives → editable bullet list
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400 italic text-sm">—</span>;
    return (
      <ul className="list-disc list-inside space-y-0.5 mt-1">
        {value.map((item, i) => (
          <li key={i} className="text-sm text-gray-700">
            {typeof item === "object" ? (
              JSON.stringify(item)
            ) : (
              <EditableLeaf value={item} path={[...path, i]} onChange={onChange} editMode={editMode} />
            )}
          </li>
        ))}
      </ul>
    );
  }

  // Nested object → indented key-value pairs
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v != null);
    if (entries.length === 0) return <span className="text-gray-400 italic text-sm">—</span>;
    return (
      <div className={`grid grid-cols-1 gap-1 mt-1 ${depth === 0 ? "pl-2 border-l-2 border-gray-200" : ""}`}>
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {fmt(k)}
            </span>
            <RenderValue value={v} path={[...path, k]} onChange={onChange} editMode={editMode} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  return <EditableLeaf value={value} path={path} onChange={onChange} editMode={editMode} />;
}

// ── Collapsible Section Panel ─────────────────────────────────────────────────
function Section({ title, data, path = [], onChange, editMode, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  if (data === null || data === undefined) return null;
  if (
    !Array.isArray(data) &&
    typeof data === "object" &&
    Object.keys(data).length === 0
  ) return null;
  if (Array.isArray(data) && data.length === 0) return null;

  const isObjectSection = !Array.isArray(data) && typeof data === "object";
  const isArraySection = Array.isArray(data);
  const isTableSection =
    isArraySection &&
    data.length > 0 &&
    typeof data[0] === "object" &&
    data[0] !== null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3 shadow-sm">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="p-4 bg-white">
          {/* Object section → 2-col key-value grid */}
          {isObjectSection && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {Object.entries(data).map(([key, val]) => (
                <div key={key}>
                  <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                    {fmt(key)}
                  </dt>
                  <dd>
                    <RenderValue value={val} path={[...path, key]} onChange={onChange} editMode={editMode} />
                  </dd>
                </div>
              ))}
            </div>
          )}

          {/* Table section */}
          {isTableSection && <RenderValue value={data} path={path} onChange={onChange} editMode={editMode} />}

          {/* Primitive array */}
          {isArraySection && !isTableSection && (
            <ul className="list-disc list-inside space-y-1">
              {data.map((item, i) => (
                <li key={i} className="text-sm text-gray-700">
                  {typeof item === "object" ? (
                    JSON.stringify(item)
                  ) : (
                    <EditableLeaf value={item} path={[...path, i]} onChange={onChange} editMode={editMode} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Normalize any flat or nested data into display-ready sections ──────────────
function normalizeData(d) {
  if (!d || typeof d !== "object") return { sections: [], flatFields: [] };

  const sections = [];
  const flatFields = [];

  for (const [key, val] of Object.entries(d)) {
    if (META_KEYS.has(key)) continue; // skip meta shown in header
    if (val === null || val === undefined) continue;

    const isSection =
      KNOWN_SECTION_KEYS.has(key) ||
      (typeof val === "object" && !Array.isArray(val) && Object.keys(val).length > 1) ||
      (Array.isArray(val) && val.length > 0 && typeof val[0] === "object");

    if (isSection) {
      sections.push({ key, label: fmt(key), data: val });
    } else {
      flatFields.push({ key, label: fmt(key), value: val });
    }
  }

  return { sections, flatFields };
}

// ── Main ExtractionResult Component ──────────────────────────────────────────
export default function ExtractionResult({
  result,
  applying,
  onApprove,
  onReject,
  onFieldChange,
}) {
  const [confirmAction, setConfirmAction] = useState(null);
  const [editMode, setEditMode] = useState(false);

  if (!result?.success) return null;

  const { extracted_data: d, document_type, validation_messages } = result;

  // Find a date to show in the header
  const date =
    d?.document_metadata?.date ||
    PREFERRED_DATE_KEYS.map((k) => d?.[k]).find(Boolean) ||
    "";

  const { sections, flatFields } = normalizeData(d);

  return (
    <div className="flex flex-col gap-3 pb-8">
      {/* ── Header band ───────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-800">
            {document_type || d?.document_type || "Extracted Document"}
          </span>
        </div>
        {date && (
          <span className="text-xs text-gray-400 font-mono">{String(date)}</span>
        )}
      </div>

      {/* ── Validation warnings ────────────────────────────────── */}
      {validation_messages?.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700 space-y-1">
          {validation_messages.map((msg, i) => (
            <p key={i}>⚠ {msg}</p>
          ))}
        </div>
      )}

      {/* ── Flat fields (top-level primitives) as one unified section ── */}
      {flatFields.length > 0 && (
        <Section
          title="Document Details"
          defaultOpen={true}
          data={Object.fromEntries(flatFields.map((f) => [f.key, f.value]))}
          onChange={onFieldChange}
          editMode={editMode}
        />
      )}

      {/* ── Named sections (nested objects / arrays) ──────────── */}
      {sections.map(({ key, label, data }) => (
        <Section key={key} title={label} data={data} path={[key]} onChange={onFieldChange} editMode={editMode} defaultOpen={true} />
      ))}

      {/* ── Edit / Approve / Reject ─────────────────────────────
          One Edit button flips every field above into an input at once;
          click it again ("Done") to lock the values back to read-only text
          -- there's no per-field pencil any more. */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => setEditMode((p) => !p)}
          disabled={applying}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-50 ${
            editMode
              ? "border-indigo-300 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {editMode ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          {editMode ? "Done" : "Edit"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmAction("reject")}
          disabled={applying}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-rose-300 bg-rose-50 text-sm font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition-colors"
        >
          <X className="h-4 w-4" />
          Reject
        </button>
        <button
          type="button"
          onClick={() => setConfirmAction("approve")}
          disabled={applying}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {applying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {applying ? "Saving..." : "Approve"}
        </button>
      </div>

      {/* ── Confirm modal ─────────────────────────────────────── */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={() => setConfirmAction(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 border border-gray-200 shadow-xl"
          >
            <p className="text-base font-semibold text-gray-900 mb-5">
              {confirmAction === "approve"
                ? "Approve and save this extraction?"
                : "Reject and discard this extraction?"}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-5 py-2 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  if (action === "approve") onApprove();
                  else onReject();
                }}
                className={`px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${
                  confirmAction === "approve"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {confirmAction === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
