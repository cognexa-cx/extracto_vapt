// ==========================================
// FILE: src/components/masterData/MasterDataFilters.jsx (UPDATED)
// ==========================================
import React from "react";
import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchBar from "./SearchBar";
import MonthFilter from "./MonthFilter";

/**
 * Master Data Filters Component
 * Combines search bar, month filter, and blocked vendors button
 */
export const MasterDataFilters = ({
  searchValue,
  onSearchChange,
  monthValue,
  onMonthChange,
  monthOptions,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4 flex-1 max-w-5xl">
      {/* Search Bar */}
      <SearchBar
        value={searchValue}
        onChange={onSearchChange}
        placeholder="Search Vendor Name, ID, GSTIN nu......"
      />

      {/* Month Filter */}
      <MonthFilter
        value={monthValue}
        onChange={onMonthChange}
        options={monthOptions}
      />

      {/* Blocked Vendors Button */}
      <button
        onClick={() => navigate("/blocked-vendors")}
        className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
        title="View blocked vendors"
      >
        <Shield className="w-4 h-4" />
        <span>Blocked Vendors</span>
      </button>
    </div>
  );
};

export default MasterDataFilters;
