import React from "react";
import { Search, Command } from "lucide-react";

/**
 * SearchBar Component
 * Reusable search input for filtering data
 */
const SearchBar = ({
  value,
  onChange,
  placeholder = "Search...",
  showKeyboardShortcut = false,
  className = "",
}) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-slate-400 transition-colors" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
      />
      {showKeyboardShortcut && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-xs text-slate-400 font-medium border border-slate-200 rounded px-2 py-1 flex items-center gap-1">
            <Command className="w-3 h-3" /> K
          </span>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
