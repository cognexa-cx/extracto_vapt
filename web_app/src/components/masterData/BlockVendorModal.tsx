// ==========================================
// FILE: src/components/masterData/BlockVendorModal.jsx
// ==========================================
import React, { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

/**
 * Block Vendor Modal Component
 * Modal for blocking a vendor with reason and comments
 * Now includes loading spinner during processing
 */
const BlockVendorModal = ({
  vendor,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    reason: "",
    comments: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const blockReasons = [
    { value: "", label: "Select reason..." },
    { value: "poor_quality", label: "Poor Quality" },
    { value: "delayed_deliveries", label: "Delayed Deliveries" },
    { value: "non_compliance", label: "Non-Compliance" },
    { value: "fraud", label: "Fraudulent Activities" },
    { value: "breach_contract", label: "Breach of Contract" },
    { value: "other", label: "Other" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.reason) {
      newErrors.reason = "Please select a reason for blocking";
    }

    if (!formData.comments.trim()) {
      newErrors.comments = "Please provide additional details";
    } else if (formData.comments.trim().length < 10) {
      newErrors.comments = "Comments must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onConfirm(formData);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isLoading ? "Blocking Vendor..." : "Block Vendor"}
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isLoading ? (
            // Loading State
            <div className="text-center py-8">
              <p className="text-gray-600">
                Please wait while we block this vendor...
              </p>
            </div>
          ) : (
            <>
              {/* Vendor Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Vendor Details:</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">Name:</span>
                    <span className="text-xs font-medium text-gray-900">
                      {vendor.vendorName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">ID:</span>
                    <span className="text-xs font-medium text-gray-900">
                      {vendor.uniqueId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-600">GSTIN:</span>
                    <span className="text-xs font-medium text-gray-900">
                      {vendor.gstinNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for blocking <span className="text-red-500">*</span>
                </label>
                <select
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.reason ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  {blockReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
                {errors.reason && (
                  <p className="mt-1 text-xs text-red-600">{errors.reason}</p>
                )}
              </div>

              {/* Comments Textarea - NO WORD LIMIT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                  rows={4}
                  disabled={isLoading}
                  placeholder="Provide detailed reason for blocking this vendor..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.comments ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.comments && (
                  <p className="mt-1 text-xs text-red-600">{errors.comments}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {formData.comments.length} characters
                </p>
              </div>

              {/* Warning Message */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">
                  <strong>Warning:</strong> This vendor will be immediately
                  blocked and unable to transact until unblocked.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? "Blocking..." : "Block Vendor"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockVendorModal;
