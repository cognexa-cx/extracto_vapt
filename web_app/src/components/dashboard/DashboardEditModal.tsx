import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import HScroll from "../common/HScroll";
import {
  X,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import invoiceService from "../../services/invoiceService";
import ConfirmDialog from "../common/ConfirmDialog";

const DIRECTIONS = ["inward", "outward", "returnable"];

// ── Same order as view modal ──────────────────────────────────────────────────
const SECTION_ORDER = [
  "document_metadata",
  "issuer_details",
  "person_details",
  "source_destination",
  "transporter_details",
  "items",
  "signatures",
];

const SECTION_LABELS = {
  document_metadata: "Document Metadata",
  issuer_details: "Issuer Details",
  person_details: "Person Details",
  source_destination: "Source & Destination",
  transporter_details: "Transporter Details",
  items: "Items",
  signatures: "Signatures",
};

const fmt = (key) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ── Single field input ────────────────────────────────────────────────────────
const FieldInput = ({ fieldKey, value, onChange }) => {
  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-2 cursor-pointer col-span-full">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(fieldKey, e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-indigo-600"
        />
        <span className="text-sm text-slate-700">{fmt(fieldKey)}</span>
      </label>
    );
  }

  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
        {fmt(fieldKey)}
      </label>
      <input
        type="text"
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => onChange(fieldKey, e.target.value || null)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all placeholder:text-slate-300"
        placeholder="—"
      />
    </div>
  );
};

// ── Recursively renders every field in a plain object — primitives as inputs,
// nested objects as nested boxes, arrays via GenericArrayEditor — so that no
// field is silently dropped from the edit form the way the old leaf-only
// filter used to (it only rendered `typeof v !== "object"` entries, which
// meant any nested sub-object, or an array nested inside a section, never
// got an editable input at all). `onChange(key, newValue)` replaces a single
// top-level key of `data`.
const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

// The extractor names the same field differently from row to row (address /
// addresses, email / emails, phone / phone_numbers ...). Those spellings are
// shown as ONE column; each row still reads and writes its own original key,
// so nothing stored is renamed or dropped.
const ALIAS_GROUPS = [
  ["name", "company_name", "business_name", "organization_name", "organisation_name", "entity_name"],
  ["address", "addresses", "office_address", "registered_address"],
  ["email", "emails", "email_id"],
  ["phone_numbers", "phone_number", "phone", "phones", "mobile", "mobile_number", "contact_number", "contact_numbers"],
  ["website", "websites", "web", "url"],
  ["member_since", "membership_since"],
  ["description", "business_description"],
];
const aliasesOf = (col: string) => ALIAS_GROUPS.find((g) => g[0] === col) || [col];
const canonicalKey = (k: string) => ALIAS_GROUPS.find((g) => g.includes(k))?.[0] || k;
const isEmptyCell = (v) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
// Which of this row's own keys currently backs the merged column `col`.
const rowKeyFor = (row, col: string) => {
  const al = aliasesOf(col);
  return (
    al.find((k) => row && k in row && !isEmptyCell(row[k])) ||
    al.find((k) => row && k in row) ||
    col
  );
};
// Lists/objects (e.g. directors: [{name, designation}]) must not render as
// "[object Object]".
const cellText = (v) => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) {
    return v
      .map((x) => (x && typeof x === "object" ? Object.values(x).filter(Boolean).join(" - ") : String(x)))
      .join("; ");
  }
  if (typeof v === "object") {
    return Object.entries(v)
      .map(([k, x]) => `${k}: ${x}`)
      .join("; ");
  }
  return String(v);
};
const isStructured = (v) =>
  (Array.isArray(v) && v.some((x) => x && typeof x === "object")) ||
  (v !== null && typeof v === "object" && !Array.isArray(v));

const GenericArrayEditor = ({ data, onChange }: any) => {
  const isObjectArray = data.length > 0 && isPlainObject(data[0]);

  if (isObjectArray) {
    const columns: string[] = Array.from(
      new Set(data.flatMap((row: any) => Object.keys(row || {}).map(canonicalKey))),
    ) as string[];
    const updateCell = (idx, col, val) =>
      onChange(
        data.map((row, i) => {
          if (i !== idx) return row;
          const key = rowKeyFor(row, col);
          // A list of plain strings (emails, phone numbers) stays a list.
          const next = Array.isArray(row?.[key])
            ? val === null ? [] : String(val).split(/\s*[;,]\s*/).filter(Boolean)
            : val;
          return { ...row, [key]: next };
        }),
      );
    const addRow = () =>
      onChange([...data, Object.fromEntries(columns.map((c) => [c, null]))]);
    const removeRow = (idx) => onChange(data.filter((_, i) => i !== idx));

    return (
      <div>
        <HScroll className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                {columns.map((c) => (
                  <th
                    key={c}
                    className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap"
                  >
                    {fmt(c)}
                  </th>
                ))}
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                >
                  {columns.map((c) => (
                    <td key={c} className="px-2 py-1.5 align-middle">
                      {(() => {
                        const raw = row?.[rowKeyFor(row, c)];
                        const locked = isStructured(raw);
                        return (
                          <input
                            type="text"
                            value={cellText(raw)}
                            readOnly={locked}
                            title={locked ? "Nested details - shown for reference, not editable here" : cellText(raw)}
                            onChange={(e) => updateCell(idx, c, e.target.value || null)}
                            className={`w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 ${locked ? "bg-slate-50 text-slate-600" : "bg-white"}`}
                            placeholder="—"
                          />
                        );
                      })()}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 align-middle text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Remove row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </HScroll>
        <button
          type="button"
          onClick={addRow}
          className="mt-3 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-dashed border-indigo-300 w-full justify-center transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Row
        </button>
      </div>
    );
  }

  const updateItem = (idx, val) =>
    onChange(data.map((it, i) => (i === idx ? val : it)));
  const addItem = () => onChange([...data, ""]);
  const removeItem = (idx) => onChange(data.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={item === null || item === undefined ? "" : String(item)}
            onChange={(e) => updateItem(idx, e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
            placeholder="—"
          />
          <button
            type="button"
            onClick={() => removeItem(idx)}
            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            title="Remove item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-dashed border-indigo-300 w-full justify-center transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add Item
      </button>
    </div>
  );
};

const FieldsEditor = ({ data, onChange }: any) => (
  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
    {Object.entries(data).map(([key, val]: [string, any]) => {
      if (Array.isArray(val)) {
        return (
          <div key={key} className="col-span-full">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              {fmt(key)}
            </label>
            <GenericArrayEditor data={val} onChange={(next) => onChange(key, next)} />
          </div>
        );
      }
      if (isPlainObject(val)) {
        return (
          <div
            key={key}
            className="col-span-full border border-slate-200 rounded-lg p-3 bg-slate-50/50"
          >
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
              {fmt(key)}
            </p>
            <FieldsEditor
              data={val}
              onChange={(subKey, subVal) =>
                onChange(key, { ...val, [subKey]: subVal })
              }
            />
          </div>
        );
      }
      return <FieldInput key={key} fieldKey={key} value={val} onChange={onChange} />;
    })}
  </div>
);

// ── Object section editor ─────────────────────────────────────────────────────
const SectionEditor = ({ sectionKey, data, onChange }) => {
  const [open, setOpen] = useState(true);
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const handleField = (key, val) =>
    onChange(sectionKey, { ...data, [key]: val });

  if (Object.keys(data).length === 0) return null;

  return (
    <div className="border border-slate-200 rounded-xl overflow-clip bg-white">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          {SECTION_LABELS[sectionKey] || fmt(sectionKey)}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && <FieldsEditor data={data} onChange={handleField} />}
    </div>
  );
};

// ── Array section editor (table layout, columns resolved dynamically) ─────────
// Previously this used a hardcoded column set (sr_no/description/quantity/unit)
// meant for an "items" list. Any other top-level array field — e.g. a
// `signatures` array shaped like [{ sign: "..." }] — has none of those keys,
// so every cell rendered blank even though the view modal displays it fine
// (it derives columns from whatever keys are actually present). Reusing
// GenericArrayEditor here fixes that: columns always match the real data.
const ArraySectionEditor = ({ sectionKey, data, onChange }) => {
  const [open, setOpen] = useState(true);
  if (!Array.isArray(data)) return null;

  return (
    <div className="border border-slate-200 rounded-xl overflow-clip bg-white">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          {SECTION_LABELS[sectionKey] || fmt(sectionKey)}
          <span className="ml-2 text-slate-400 font-normal normal-case">
            ({data.length} rows)
          </span>
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="p-4">
          {data.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400 border border-slate-200 rounded-lg">
              No rows yet.
            </p>
          ) : (
            <GenericArrayEditor data={data} onChange={(next) => onChange(sectionKey, next)} />
          )}
          {data.length === 0 && (
            <button
              type="button"
              onClick={() => onChange(sectionKey, [...data, {}])}
              className="mt-3 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-dashed border-indigo-300 w-full justify-center transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Manual entry field editor (one box per key/value pair) ────────────────────
const ManualFieldsEditor = ({ fields, onChange }) => {
  const [confirmId, setConfirmId] = useState(null);

  const updateField = (id, prop, val) =>
    onChange(fields.map((f) => (f.id === id ? { ...f, [prop]: val } : f)));

  const addField = () =>
    onChange([...fields, { id: `field-${Date.now()}`, key: "", value: "" }]);

  const removeField = (id) => onChange(fields.filter((f) => f.id !== id));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div
            key={f.id}
            className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2 relative bg-slate-50/50"
          >
            <button
              type="button"
              onClick={() => setConfirmId(f.id)}
              className="absolute top-2 right-2 p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
              title="Remove field"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <input
              type="text"
              value={f.key}
              onChange={(e) => updateField(f.id, "key", e.target.value)}
              placeholder="Key"
              className="w-full pr-7 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-semibold text-slate-500 uppercase tracking-wide bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
            />
            <input
              type="text"
              value={f.value}
              onChange={(e) => updateField(f.id, "value", e.target.value)}
              placeholder="Value"
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addField}
        className="mt-3 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-dashed border-indigo-300 w-full justify-center transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add Field
      </button>

      <ConfirmDialog
        isOpen={Boolean(confirmId)}
        title="Remove Field?"
        message="Are you sure you want to remove this field?"
        onConfirm={() => {
          removeField(confirmId);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
        confirmLabel="Remove"
        loadingLabel="Removing..."
      />
    </div>
  );
};

// ── Main modal ────────────────────────────────────────────────────────────────
const DashboardEditModal = ({ isOpen, onClose, record, onSave }) => {
  const [direction, setDirection] = useState("inward");
  const [documentType, setDocumentType] = useState("");
  const [extracted, setExtracted] = useState({});
  const [manualFields, setManualFields] = useState([]);
  const [isManual, setIsManual] = useState(false);
  const [returnStatus, setReturnStatus] = useState("active");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  useEffect(() => {
    if (isOpen && record) {
      loadRecord();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, record]);

  const loadRecord = async () => {
    setLoading(true);
    try {
      const id = record.ID || record.id;
      const full = await invoiceService.getRecordById(id);
      const manual = full.entry_type === "manual";
      setIsManual(manual);
      setDirection(full.raw?.direction || "inward");
      setDocumentType(full.raw?.document_type || "");
      setExtracted(full.raw?.extracted_data || {});
      setReturnStatus(full.return_status || "active");
      setManualFields(
        (full.manual_fields || []).map((f, i) => ({
          id: `field-${i}-${Date.now()}`,
          key: f.key,
          value: f.value,
        })),
      );
    } catch {
      const manual = record.entry_type === "manual";
      setIsManual(manual);
      setDirection(record.inward_outward?.toLowerCase() || "inward");
      setDocumentType(record.document_type || "");
      setExtracted(record.extracted_data || {});
      setReturnStatus(record.return_status || "active");
      setManualFields(
        (record.manual_fields || []).map((f, i) => ({
          id: `field-${i}-${Date.now()}`,
          key: f.key,
          value: f.value,
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSection = (key, val) =>
    setExtracted((prev) => ({ ...prev, [key]: val }));

  const handleSaveClick = () => {
    if (isSaving) return;
    setConfirmSaveOpen(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setConfirmSaveOpen(false);
    setIsSaving(true);
    try {
      const id = record.ID || record.id;
      if (isManual) {
        await invoiceService.updateRecord(id, {
          manual_fields: manualFields
            .filter((f) => f.key.trim())
            .map((f) => ({ key: f.key.trim(), value: f.value })),
        });
      } else {
        await invoiceService.updateRecord(id, {
          direction,
          document_type: documentType,
          extracted_data: extracted,
          ...(direction === "returnable" ? { return_status: returnStatus } : {}),
        });
      }
      if (onSave) await onSave();
      onClose();
    } catch (err) {
      alert("Failed to save: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Ordered keys — known first, then any extras
  const knownSet = new Set(SECTION_ORDER);
  const extraKeys = Object.keys(extracted).filter((k) => !knownSet.has(k));
  const orderedKeys = [...SECTION_ORDER, ...extraKeys];

  // Some extraction runs ("new universal prompt outputs" — see invoiceService.js
  // resolveVendorName) put fields like supplier_name / vendor_name directly on
  // extracted_data instead of nesting them under a section object. The section
  // loop below only renders array/object values, so these flat fields used to
  // be completely invisible in the edit form — not just non-editable, absent —
  // even though the view modal already surfaces them under "Document Details".
  const flatTopLevelKeys = orderedKeys.filter((key) => {
    const val = extracted[key];
    return val !== undefined && (typeof val !== "object" || val === null);
  });
  const flatTopLevelData = Object.fromEntries(
    flatTopLevelKeys.map((k) => [k, extracted[k]]),
  );
  const handleFlatTopLevel = (key, val) =>
    setExtracted((prev) => ({ ...prev, [key]: val }));

  const docTypeDisplay = (documentType || "-").toUpperCase();

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isSaving ? undefined : onClose}
      />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Edit Record</h2>
            <p className="text-xs text-indigo-200 mt-0.5">
              {isManual
                ? "MANUAL ENTRY"
                : `${(record?.inward_outward || direction || "-").toUpperCase()} • ${docTypeDisplay}`}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-slate-500 mt-3">Loading record...</p>
            </div>
          ) : isManual ? (
            <ManualFieldsEditor fields={manualFields} onChange={setManualFields} />
          ) : (
            <>
              {/* ── Direction + Doc Type side by side ── */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Direction */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                    Direction
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {DIRECTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDirection(d)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                          direction === d
                            ? "bg-indigo-600 text-white shadow"
                            : "bg-white border border-slate-300 text-slate-600 hover:border-indigo-400"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                    Document Type
                  </label>
                  <input
                    type="text"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    placeholder="e.g. Security Gate Pass"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 bg-white"
                  />
                </div>
              </div>

              {/* Return status — only relevant/shown when direction is returnable */}
              {direction === "returnable" && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                    Return Status
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {["active", "returned"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setReturnStatus(s)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                          returnStatus === s
                            ? "bg-indigo-600 text-white shadow"
                            : "bg-white border border-slate-300 text-slate-600 hover:border-indigo-400"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Flat fields living directly on extracted_data (not nested
                  in a section) — e.g. supplier_name, vendor_name from newer
                  extraction runs. Without this block they were never shown. ── */}
              {flatTopLevelKeys.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-clip bg-white">
                  <div className="px-4 py-3 bg-slate-50">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Document Details
                    </span>
                  </div>
                  <FieldsEditor data={flatTopLevelData} onChange={handleFlatTopLevel} />
                </div>
              )}

              {/* ── Extracted data in document order ── */}
              {orderedKeys.map((key) => {
                const val = extracted[key];
                if (val === undefined || flatTopLevelKeys.includes(key)) return null;
                return Array.isArray(val) ? (
                  <ArraySectionEditor
                    key={key}
                    sectionKey={key}
                    data={val}
                    onChange={handleSection}
                  />
                ) : typeof val === "object" && val !== null ? (
                  <SectionEditor
                    key={key}
                    sectionKey={key}
                    data={val}
                    onChange={handleSection}
                  />
                ) : null;
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveClick}
            disabled={isSaving || loading}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmSaveOpen}
        title="Save Changes?"
        message="Are you sure you want to save the changes made to this record?"
        onConfirm={handleSave}
        onCancel={() => setConfirmSaveOpen(false)}
        isLoading={isSaving}
        confirmLabel="Save"
        loadingLabel="Saving..."
        confirmColor="indigo"
      />
    </div>,
    document.body,
  );
};

export default DashboardEditModal;
