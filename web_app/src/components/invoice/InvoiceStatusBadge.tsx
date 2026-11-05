// ============================================
// FILE: src/components/invoice/InvoiceStatusBadge.jsx
// ============================================
import React from "react";

/**
 * Invoice Status Badge Component
 * Displays invoice status with color coding
 */
const InvoiceStatusBadge = ({ status = "Inward" }) => {
  const getStatusColor = (status) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "inward":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <span
      className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(
        status,
      )}`}
    >
      {status}
    </span>
  );
};

export default InvoiceStatusBadge;
