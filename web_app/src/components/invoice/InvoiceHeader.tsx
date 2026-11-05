import React from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const InvoiceHeader = ({
  fileName = "Invoice 001.pdf",
  status = "Inward",
  stats,
  accuracy,
}) => {
  const navigate = useNavigate();

  // Status badge styling - clean and professional
  const getStatusStyles = () => {
    switch (status?.toLowerCase()) {
      case "inward":
        return "bg-blue-600 text-white border-blue-600";
      case "outward":
        return "bg-cyan-600 text-white border-cyan-600";
      case "approved":
        return "bg-emerald-600 text-white border-emerald-600";
      case "rejected":
        return "bg-rose-600 text-white border-rose-600";
      case "pending":
        return "bg-amber-600 text-white border-amber-600";
      default:
        return "bg-slate-600 text-white border-slate-600";
    }
  };

  const displayAccuracy = accuracy ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Back Button + File Info */}
        <div className="flex items-center gap-3">
          {/* Back Button - Styled to match the clean aesthetic */}
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:text-gray-900 hover:border-gray-300 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Icon Container - Matching Dashboard style */}
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 border border-gray-200">
            <FileText className="w-5 h-5" />
          </div>

          {/* Text Container */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-none">
              Invoice Review
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">{fileName}</p>
          </div>
        </div>

        {/* Right: Stats + Status Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Stats Display - Styled as a "Control" element */}
          {stats && (
            <div className="hidden md:flex items-center gap-4 border border-gray-200 px-4 h-10 rounded-lg bg-gray-50/50">
              {/* Accuracy */}
              <div className="text-center min-w-[3rem]">
                <div className="text-[10px] text-gray-500 font-bold uppercase leading-tight tracking-wide">
                  Accuracy
                </div>
                <div className="text-sm font-bold text-gray-900 leading-tight">
                  {displayAccuracy}%
                </div>
              </div>

              <div className="w-px h-5 bg-gray-300"></div>

              {/* Total Fields */}
              <div className="text-center min-w-[3rem]">
                <div className="text-[10px] text-gray-500 font-bold uppercase leading-tight tracking-wide">
                  Fields
                </div>
                <div className="text-sm font-bold text-gray-900 leading-tight">
                  {stats.totalFields}
                </div>
              </div>

              {/* Modified Fields - only show if > 0 */}
              {stats.modifiedFields > 0 && (
                <>
                  <div className="w-px h-5 bg-gray-300"></div>
                  <div className="text-center min-w-[3rem]">
                    <div className="text-[10px] text-gray-500 font-bold uppercase leading-tight tracking-wide">
                      Edited
                    </div>
                    <div className="text-sm font-bold text-amber-600 leading-tight">
                      {stats.modifiedFields}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Status Badge - Matching Dashboard button height/roundness */}
          <div
            className={`px-5 h-10 flex items-center text-sm font-bold rounded-lg shadow-sm border ${getStatusStyles()}`}
          >
            {status}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceHeader;
