import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

// Generic confirm-before-you-commit modal — originally lived under
// components/dashboard/ but every prop (label/color/loading) was already
// fully parameterized with no dashboard-specific coupling, so it's the
// shared confirmation dialog for every save/update/delete/status-change
// action across the app (RBAC Master, Master Data, User Management,
// Settings, Dashboard) rather than each page rolling its own.
const ConfirmDialog = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmLabel = "Delete",
  loadingLabel = "Deleting...",
  confirmColor = "red",
}) => {
  if (!isOpen) return null;

  const COLOR_CLASSES = {
    red: "bg-red-600 hover:bg-red-700 shadow-red-200",
    indigo: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200",
    emerald: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200",
  };
  const ICON_BG = { red: "bg-red-50", indigo: "bg-indigo-50", emerald: "bg-emerald-50" };
  const ICON_COLOR = { red: "text-red-600", indigo: "text-indigo-600", emerald: "text-emerald-600" };

  const colorClasses = COLOR_CLASSES[confirmColor] || COLOR_CLASSES.red;
  const iconBg = ICON_BG[confirmColor] || ICON_BG.red;
  const iconColor = ICON_COLOR[confirmColor] || ICON_COLOR.red;

  // Portaled to document.body (not rendered inline in the page's own React
  // tree) and given a higher z-index than the modals it's meant to confirm
  // on top of (both use z-[9999], e.g. MasterEntityFormModal) -- without
  // this, two same-z-index fixed layers stack by DOM order, and a portal
  // mounted earlier can render *below* a later one regardless of which is
  // logically "on top", so a click meant for this dialog's button could
  // land on a hidden input in the modal underneath instead.
  return createPortal(
    <div className="fixed inset-0 z-[10050] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={!isLoading ? onCancel : undefined}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
        {/* Close Button */}
        <button
          onClick={!isLoading ? onCancel : undefined}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center mb-4 mx-auto`}>
          <AlertTriangle className={`w-6 h-6 ${iconColor}`} />
        </div>

        {/* Text */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 ${colorClasses}`}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {loadingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmDialog;
