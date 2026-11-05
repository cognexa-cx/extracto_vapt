// ==========================================
// FILE: src/components/blockedVendors/UnblockConfirmDialog.jsx
// ==========================================
import React from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Unblock Confirmation Dialog Component
 * Modal for confirming vendor unblock action
 */
const UnblockConfirmDialog = ({ vendor, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Unblock Vendor
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to unblock this vendor? They will be able to
            transact again.
          </p>

          {/* Vendor Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Vendor Name:</span>
              <span className="text-sm font-medium text-gray-900">
                {vendor.vendorName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Unique ID:</span>
              <span className="text-sm font-medium text-gray-900">
                {vendor.uniqueId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">GSTIN:</span>
              <span className="text-sm font-medium text-gray-900">
                {vendor.gstinNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">PAN:</span>
              <span className="text-sm font-medium text-gray-900">
                {vendor.panNumber}
              </span>
            </div>
          </div>

          {/* Warning Message */}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">
              <strong>Note:</strong> This vendor will be removed from the
              blacklist and can resume normal operations.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Confirm Unblock
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnblockConfirmDialog;
