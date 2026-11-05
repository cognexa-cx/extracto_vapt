// ============================================
// FILE: src/components/invoice/ValidationRow.jsx (SIMPLE TWO-COLUMN)
// ============================================
import React from "react";
import { Check } from "lucide-react";

const ValidationRow = ({ item, isEditMode, onValueChange }) => {
  // Get the first non-excluded field as the value
  const getValue = () => {
    const excludedKeys = ["id", "label", "isConfirmed"];
    const valueKeys = Object.keys(item).filter(
      (key) => !excludedKeys.includes(key),
    );

    // Return the first available value field
    if (valueKeys.length > 0) {
      return item[valueKeys[0]] || "";
    }
    return "";
  };

  // Get the field key for updating
  const getValueKey = () => {
    const excludedKeys = ["id", "label", "isConfirmed"];
    const valueKeys = Object.keys(item).filter(
      (key) => !excludedKeys.includes(key),
    );
    return valueKeys.length > 0 ? valueKeys[0] : "value";
  };

  const value = getValue();
  const valueKey = getValueKey();

  const handleInputChange = (newValue) => {
    if (onValueChange && item.id) {
      onValueChange(item.id, valueKey, newValue);
    }
  };

  return (
    <div className="grid grid-cols-[auto_1fr] gap-4 py-3 border-b border-gray-200 last:border-b-0">
      {/* Status Icon */}
      <div className="flex items-center justify-center w-6 h-6">
        {item.isConfirmed ? (
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        ) : (
          <div className="w-5 h-5 bg-red-500 rounded-full"></div>
        )}
      </div>

      {/* Field Name and Value */}
      <div className="grid grid-cols-2 gap-4">
        {/* Field Name */}
        <div className="text-sm font-medium text-gray-900 flex items-center">
          {item.label}
        </div>

        {/* Value */}
        <div className="flex items-center">
          {isEditMode ? (
            <input
              type="text"
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full text-sm text-gray-600 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter value"
            />
          ) : (
            <div className="text-sm text-gray-600 break-words">
              {value || "-"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ValidationRow;
