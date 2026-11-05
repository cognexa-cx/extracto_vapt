// ==========================================
// FILE: src/components/blockedVendors/BlockedVendorsTable.jsx
// ==========================================
import React from "react";
import { Unlock } from "lucide-react";

/**
 * Blocked Vendors Table Component
 * Displays blocked vendors in a table format
 */
const BlockedVendorsTable = ({ data, onUnblock, selectedIds, onToggleRow, onToggleSelectAll }) => {
  if (!data || data.length === 0) {
    return null;
  }

  const allSelected = data.length > 0 && data.every((v) => selectedIds.has(v.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="w-10 px-6 py-4">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="h-3.5 w-3.5 accent-indigo-600"
              />
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Sr.No.
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Vender Name
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Unique ID
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              GSTIN Number
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              PAN Number
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((vendor, index) => (
            <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedIds.has(vendor.id)}
                  onChange={() => onToggleRow(vendor.id)}
                  className="h-3.5 w-3.5 accent-indigo-600"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {vendor.srNo || `0${index + 1}`}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                {vendor.vendorName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {vendor.uniqueId}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {vendor.gstinNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {vendor.panNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <button
                  onClick={() => onUnblock(vendor)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  title="Unblock this vendor"
                >
                  <Unlock className="w-4 h-4" />
                  Unblock
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BlockedVendorsTable;
