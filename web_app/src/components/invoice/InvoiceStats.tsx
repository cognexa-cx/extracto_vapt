import React from "react";
import { TrendingUp, CheckCircle, AlertCircle } from "lucide-react";

const InvoiceStats = ({ status, accuracy, stats }) => {
  // Status Badge Styling
  const getStatusConfig = () => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case "approved":
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
        };
      case "rejected":
        return {
          bg: "bg-red-50",
          text: "text-red-700",
          border: "border-red-200",
        };
      case "pending":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
        };
      case "inward":
        return {
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
        };
      default:
        return {
          bg: "bg-slate-50",
          text: "text-slate-700",
          border: "border-slate-200",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="flex items-center gap-6">
      {/* Stats Display */}
      {stats && (
        <div className="flex items-center gap-6 border-r border-slate-200 pr-6">
          {/* Accuracy */}
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-bold text-slate-900">
                {accuracy}%
              </span>
            </div>
            <p className="text-xs text-slate-500">Accuracy</p>
          </div>

          {/* Verified Fields */}
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-600">
                {stats.confirmedFields}
              </span>
            </div>
            <p className="text-xs text-slate-500">Verified</p>
          </div>

          {/* To Review */}
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-600">
                {stats.unconfirmedFields}
              </span>
            </div>
            <p className="text-xs text-slate-500">Review</p>
          </div>
        </div>
      )}

      {/* Status Badge */}
      <div
        className={`px-4 py-2 border rounded-lg text-xs font-bold uppercase ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
      >
        {status}
      </div>
    </div>
  );
};

export default InvoiceStats;
