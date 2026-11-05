import React from "react";
import { X, CheckCircle, XCircle, Loader2, Clock, Ban } from "lucide-react";

const ApproveRejectDialog = ({
  isOpen,
  onClose,
  onConfirm,
  action = "approve",
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const actionConfig = {
    cancel: {
      title: "Cancel Invoice Processing?",
      message:
        "Are you sure you want to cancel? This will discard all progress and return to upload page.",
      icon: X,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      confirmButton: "bg-slate-600 hover:bg-slate-700 text-white",
      confirmText: "Yes, Cancel",
    },
    pending: {
      title: "Mark as Pending?",
      message:
        "This invoice will be saved with 'Pending' status for later review.",
      icon: Clock,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      confirmButton: "bg-amber-600 hover:bg-amber-700 text-white",
      confirmText: "Mark as Pending",
    },
    reject: {
      title: "Reject Invoice?",
      message:
        "This invoice will be saved with 'Rejected' status in the database.",
      icon: XCircle,
      iconBg: "bg-rose-100", // Updated to Rose
      iconColor: "text-rose-600", // Updated to Rose
      confirmButton: "bg-rose-600 hover:bg-rose-700 text-white",
      confirmText: "Yes, Reject",
    },
    approve: {
      title: "Approve Invoice?",
      message:
        "This invoice will be saved with 'Approved' status in the database.",
      icon: CheckCircle,
      iconBg: "bg-teal-100", // Updated to Teal (Primary)
      iconColor: "text-teal-600",
      confirmButton: "bg-teal-600 hover:bg-teal-700 text-white",
      confirmText: "Yes, Approve",
    },
  };

  const config = actionConfig[action] || actionConfig.approve;
  const Icon = config.icon;

  const baseButtonClass =
    "h-10 px-4 rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/40"
        onClick={isLoading ? undefined : onClose}
      />

      <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6 z-10">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded-md hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center mb-4">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center ${config.iconBg}`}
          >
            {isLoading ? (
              <Loader2 className={`w-7 h-7 animate-spin ${config.iconColor}`} />
            ) : (
              <Icon className={`w-7 h-7 ${config.iconColor}`} />
            )}
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
          {isLoading ? "Processing..." : config.title}
        </h3>

        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 leading-relaxed">
            {isLoading
              ? "Please wait while we process your request."
              : config.message}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`${baseButtonClass} bg-white border border-gray-200 text-gray-700 hover:bg-slate-50 flex-1`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`${baseButtonClass} ${config.confirmButton} flex-1`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? "Saving..." : config.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApproveRejectDialog;
