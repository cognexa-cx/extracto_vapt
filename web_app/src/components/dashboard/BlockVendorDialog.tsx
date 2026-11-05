// ==========================================
// FILE: src/components/dashboard/BlockVendorDialog.jsx
// ==========================================
import React, { useState } from "react";
import { X, AlertTriangle, CheckCircle, Trash2, Loader2 } from "lucide-react";

/**
 * Block Vendor Confirmation Dialog
 * Shows confirmation before blocking/unblocking/deleting a vendor
 * Now includes loading spinner and optional comments field
 */
const BlockVendorDialog = ({
  isOpen,
  onClose,
  onConfirm,
  vendorName,
  action = "block", // "block", "unblock", or "delete"
  isLoading = false,
  showComments = false, // Enable comments for blocking
}) => {
  const [comments, setComments] = useState("");

  if (!isOpen) return null;

  const isBlocking = action === "block";
  const isDeleting = action === "delete";

  const getConfig = () => {
    if (isDeleting) {
      return {
        bgColor: "bg-red-100",
        iconColor: "text-red-600",
        icon: Trash2,
        title: "Delete Record?",
        buttonColor: "bg-red-600 hover:bg-red-700",
        buttonText: "Delete",
        loadingText: "Deleting...",
        message: "This action cannot be undone.",
      };
    } else if (isBlocking) {
      return {
        bgColor: "bg-orange-100",
        iconColor: "text-orange-600",
        icon: AlertTriangle,
        title: "Block Vendor?",
        buttonColor: "bg-orange-600 hover:bg-orange-700",
        buttonText: "Block Vendor",
        loadingText: "Blocking...",
        message: "This will prevent future transactions with this vendor.",
      };
    } else {
      return {
        bgColor: "bg-green-100",
        iconColor: "text-green-600",
        icon: CheckCircle,
        title: "Unblock Vendor?",
        buttonColor: "bg-green-600 hover:bg-green-700",
        buttonText: "Unblock Vendor",
        loadingText: "Unblocking...",
        message: "This will allow transactions with this vendor again.",
      };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm(comments);
  };

  const handleClose = () => {
    if (!isLoading) {
      setComments("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Dialog Box */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${config.bgColor}`}
          >
            {isLoading ? (
              <Loader2 className={`w-8 h-8 animate-spin ${config.iconColor}`} />
            ) : (
              <Icon className={`w-8 h-8 ${config.iconColor}`} />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
          {isLoading ? config.loadingText : config.title}
        </h3>

        {/* Message */}
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-2">
            {isLoading
              ? "Please wait while we process your request."
              : isDeleting
                ? "Are you sure you want to delete"
                : `Are you sure you want to ${action}`}
          </p>
          {!isLoading && (
            <>
              <p className="font-semibold text-gray-900">
                {vendorName || "this vendor"}?
              </p>
              <p className="text-sm text-gray-500 mt-3">{config.message}</p>
            </>
          )}
        </div>

        {/* Additional Comments - Only for blocking, no word limit */}
        {showComments && isBlocking && !isLoading && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Enter reason for blocking this vendor..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${config.buttonColor}`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? "Processing..." : config.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockVendorDialog;
