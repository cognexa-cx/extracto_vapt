import React, { useState, useMemo } from "react";
import { Search, CheckCircle2, AlertTriangle, Edit3 } from "lucide-react";

const ValidationSection = ({
  validations = [],
  isEditMode = false,
  onValueChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const sortedValidations = useMemo(() => {
    return (
      [...validations]
        // UPDATED: Remove ANY field containing 'comment', 'approval', 'warehouse', or 'approved'
        .filter((item) => {
          const label = item.label?.toLowerCase().trim();

          // Define keywords to exclude
          const excludeKeywords = [
            "comment",
            "approval",
            "approved",
            "warehouse",
          ];

          // Check if label contains any of these keywords
          const isExcluded = excludeKeywords.some((keyword) =>
            label.includes(keyword),
          );

          // Keep only if NOT excluded
          return !isExcluded;
        })
        .sort((a, b) => {
          const order = { HIGH: 1, MODIFIED: 2, MEDIUM: 3, LOW: 3 };
          return (order[a.confidence] || 4) - (order[b.confidence] || 4);
        })
    );
  }, [validations]);

  const filteredValidations = useMemo(() => {
    return sortedValidations.filter(
      (item) =>
        item.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.invoiceValue || item.value || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    );
  }, [sortedValidations, searchTerm]);

  const stats = useMemo(() => {
    const high = sortedValidations.filter(
      (v) => v.confidence === "HIGH",
    ).length;
    const modified = sortedValidations.filter(
      (v) => v.confidence === "MODIFIED",
    ).length;
    const needsReview = sortedValidations.filter(
      (v) => v.confidence === "LOW" || v.confidence === "MEDIUM",
    ).length;
    return { high, modified, needsReview, total: sortedValidations.length };
  }, [sortedValidations]);

  const getConfidenceBadge = (confidence) => {
    const baseClasses =
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border shadow-sm";

    if (confidence === "HIGH") {
      return (
        <div
          className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-200`}
        >
          <CheckCircle2 className="w-3 h-3" />
          High
        </div>
      );
    } else if (confidence === "MODIFIED") {
      return (
        <div
          className={`${baseClasses} bg-blue-50 text-blue-700 border-blue-200`}
        >
          <Edit3 className="w-3 h-3" />
          Modified
        </div>
      );
    } else {
      return (
        <div
          className={`${baseClasses} bg-amber-50 text-amber-700 border-amber-200`}
        >
          <AlertTriangle className="w-3 h-3" />
          Low
        </div>
      );
    }
  };

  if (!validations || validations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-300 rounded-lg bg-gray-50">
        <AlertTriangle className="w-6 h-6 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Extracted Fields</h3>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-bold uppercase">
                High: {stats.high}
              </span>
            </div>
            {stats.modified > 0 && (
              <div className="flex items-center gap-1.5 text-blue-600">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <span className="text-[10px] font-bold uppercase">
                  Modified: {stats.modified}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-amber-600">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              <span className="text-[10px] font-bold uppercase">
                Review: {stats.needsReview}
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none w-full sm:w-[240px] placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Field Label
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredValidations.map((item) => {
                let displayValue = item.invoiceValue ?? item.value ?? "-";

                if (
                  typeof displayValue === "string" &&
                  /^\d{4}-\d{2}-\d{2}$/.test(displayValue)
                ) {
                  const [y, m, d] = displayValue.split("-");
                  displayValue = `${d}-${m}-${y}`;
                }

                return (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 align-top pt-4">
                      {getConfidenceBadge(item.confidence)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-700 align-top pt-4">
                      {item.label}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={item.invoiceValue ?? item.value ?? ""}
                          onChange={(e) =>
                            onValueChange(
                              item.id,
                              "invoiceValue",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none placeholder:text-gray-400"
                          placeholder="Edit value..."
                        />
                      ) : (
                        <span
                          className={`text-sm block py-1.5 px-2 rounded-md ${
                            displayValue === "-"
                              ? "text-gray-400 italic"
                              : "text-gray-900 font-semibold"
                          }`}
                        >
                          {displayValue}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase">
            Showing {filteredValidations.length} of {stats.total} fields
          </span>
          {isEditMode && (
            <span className="text-[10px] font-bold text-white bg-teal-600 px-2 py-1 rounded shadow-sm">
              EDIT MODE
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationSection;
