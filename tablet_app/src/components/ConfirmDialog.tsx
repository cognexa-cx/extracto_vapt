// Frontend\tab\src\components\ConfirmDialog.jsx
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

// Generic Yes/Cancel confirmation overlay — same visual shell as
// SuccessPopup.jsx, but with two buttons instead of an auto-dismissing one.
export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  // Portaled to document.body — some callers (e.g. Header's Logout confirm)
  // render this from inside an ancestor with backdrop-blur, which creates a
  // new containing block for `fixed` descendants. Without the portal, this
  // dialog's "fixed inset-0" centers within that ancestor's box instead of
  // the actual viewport.
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
          <HelpCircle className="h-8 w-8 text-blue-600" />
        </div>
        <p className="mb-1 text-base font-semibold text-slate-900">{title}</p>
        {message && <p className="mb-6 text-sm text-slate-500">{message}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
