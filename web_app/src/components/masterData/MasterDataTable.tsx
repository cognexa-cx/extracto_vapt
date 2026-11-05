// ==========================================
// FILE: src/components/masterData/MasterDataTable.jsx
// ==========================================
import React from "react";
import ActionMenu from "./ActionMenu";
import { BLOCK_STATUS_COLORS } from "../../utils/constants";

/**
 * MasterDataTable Component
 * Main table displaying vendor master data
 * Now includes vendor status badge and block/unblock actions
 */
const MasterDataTable = ({
  data,
  onEdit,
  onDelete,
  onView,
  onBlock,
  onUnblock,
}) => {
  const columns = [
    "Sr.No.",
    "Vender Name",
    "Unique ID",
    "GSTIN Number",
    "PAN Number",
    "Invoice Date",
    "Invoice History",
    "Status",
    "Action",
  ];

  /**
   * Render status badge for vendor
   */
  const renderStatusBadge = (status) => {
    const statusText = status === "blocked" ? "Blocked" : "Active";
    const colorClass =
      BLOCK_STATUS_COLORS[status] || BLOCK_STATUS_COLORS.active;

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}
      >
        {statusText}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-sm text-gray-500"
              >
                No data available
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.id}
                className={`hover:bg-gray-50 transition-colors ${
                  row.status === "blocked" ? "bg-red-50/30" : ""
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.srNo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.vendorName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.uniqueId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.gstinNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.panNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.invoiceDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.invoiceHistory}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {renderStatusBadge(row.status || "active")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <ActionMenu
                    rowId={row.id}
                    vendorData={row}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onView={onView}
                    onBlock={onBlock}
                    onUnblock={onUnblock}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MasterDataTable;
