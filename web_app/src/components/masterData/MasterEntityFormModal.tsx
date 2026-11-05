import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";

/**
 * Generic add/edit form for any master entity — fields come from
 * masterDataV2Config.js, so this one modal serves Vendors, Warehouses,
 * Transporters, and Materials without four near-identical copies.
 */
const MasterEntityFormModal = ({ isOpen, onClose, onSave, config, record }) => {
  const isEdit = !!record;
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (isOpen) {
      const initial = {};
      config.formFields.forEach((f) => {
        initial[f.key] = record?.[f.key] || "";
      });
      setFormData(initial);
      setErrors({});
      setApiError("");
    }
  }, [isOpen, record, config]);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    config.formFields.forEach((f) => {
      if (f.required && !formData[f.key]?.trim()) {
        next[f.key] = `${f.label} is required`;
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError("");
    try {
      await onSave(formData);
    } catch (err) {
      setApiError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />
      <div
        className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
          <h2 className="text-base font-bold text-white">
            {isEdit ? `Edit ${config.singular}` : `Add ${config.singular}`}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {apiError && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-lg text-sm">
              {apiError}
            </div>
          )}
          <div className="bg-white rounded-lg border border-gray-200 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.formFields.map((f) => (
              <div key={f.key} className={f.wide ? "md:col-span-2" : ""}>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={formData[f.key] || ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                    errors[f.key]
                      ? "bg-red-50 border-red-300 focus:ring-red-500/20"
                      : "bg-white border-slate-300 focus:ring-blue-500/20"
                  }`}
                  placeholder={f.label}
                />
                {errors[f.key] && (
                  <p className="mt-1 text-xs text-red-600">{errors[f.key]}</p>
                )}
              </div>
            ))}
          </div>
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 bg-white">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Save Changes" : `Add ${config.singular}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default MasterEntityFormModal;
