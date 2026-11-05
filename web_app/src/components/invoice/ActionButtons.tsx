import React from "react";
import { Edit3, X, Check, Save, Loader2, Ban, Clock } from "lucide-react";

const ActionButtons = ({
  onEditOCR,
  onCancel,
  onPending,
  onReject,
  onApprove,
  disabled = false,
  isEditMode = false,
  onSaveEdit,
  onCancelEdit,
}) => {
  const baseClasses =
    "h-10 px-4 flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";

  // Dashboard Color Palette
  const primaryClasses = "bg-teal-600 text-white hover:bg-teal-700"; // Approve/Save
  const secondaryClasses =
    "bg-white border border-gray-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"; // Cancel
  const rejectClasses =
    "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"; // Reject
  const pendingClasses =
    "bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300"; // Pending

  if (isEditMode) {
    return (
      <div className="flex gap-3 w-full">
        <button
          onClick={onCancelEdit}
          disabled={disabled}
          className={`${baseClasses} ${secondaryClasses} flex-1`}
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={onSaveEdit}
          disabled={disabled}
          className={`${baseClasses} ${primaryClasses} flex-1`}
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={onEditOCR}
        disabled={disabled}
        className={`${baseClasses} ${secondaryClasses} w-full`}
      >
        <Edit3 className="w-4 h-4" />
        Manual Edit
      </button>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
        {/* Cancel */}
        <button
          onClick={onCancel}
          disabled={disabled}
          className={`${baseClasses} ${secondaryClasses} w-full`}
        >
          <X className="w-4 h-4" />
          Cancel
        </button>

        {/* Pending */}
        <button
          onClick={onPending}
          disabled={disabled}
          className={`${baseClasses} ${pendingClasses} w-full`}
        >
          <Clock className="w-4 h-4" />
          Pending
        </button>

        {/* Reject */}
        <button
          onClick={onReject}
          disabled={disabled}
          className={`${baseClasses} ${rejectClasses} w-full`}
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Ban className="w-4 h-4" />
              Reject
            </>
          )}
        </button>

        {/* Approve */}
        <button
          onClick={onApprove}
          disabled={disabled}
          className={`${baseClasses} ${primaryClasses} w-full`}
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              Approve
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;
