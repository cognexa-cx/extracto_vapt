// ==========================================
// FILE: src/components/masterData/MasterDataHeader.jsx
// ==========================================
import React from "react";
import SearchBar from "./SearchBar";
import MonthFilter from "./MonthFilter";

/**
 * MasterDataHeader Component
 * Page title and filter controls
 */
const MasterDataHeader = ({
  searchValue,
  onSearchChange,
  monthValue,
  onMonthChange,
  monthOptions,
}) => {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Master Data</h1>
      <div className="flex items-center gap-4">
        <SearchBar
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search Vender Name, ID, GSTIN nu......"
        />
        <MonthFilter
          value={monthValue}
          onChange={onMonthChange}
          options={monthOptions}
        />
      </div>
    </div>
  );
};

export default MasterDataHeader;
