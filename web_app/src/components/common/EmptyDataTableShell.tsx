import React from "react";
import { Search } from "lucide-react";
import { DATE_PRESETS } from "../../utils/dateRangePresets";

/**
 * Visual placeholder matching Master Data's table chrome (search bar, date
 * filter, sort toggle, styled table) for pages that don't have a backend
 * data source yet (Reports, Audit Logs, Analytics) — so the app looks
 * consistent everywhere even before those pages are wired up for real.
 * Every control here is inert (disabled) until there's real data to drive.
 */
const EmptyDataTableShell = ({ searchPlaceholder = "Search…", columns = [], emptyMessage }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          disabled
          placeholder={searchPlaceholder}
          className="w-64 rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-3 text-xs text-slate-400 cursor-not-allowed"
        />
      </div>
      <select
        disabled
        className="rounded-md border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs text-slate-400 cursor-not-allowed"
      >
        {DATE_PRESETS.map((p) => (
          <option key={p.key}>{p.label}</option>
        ))}
      </select>
      <select
        disabled
        className="rounded-md border border-slate-200 bg-slate-50 py-1.5 px-3 text-xs text-slate-400 cursor-not-allowed"
      >
        <option>Latest First</option>
        <option>Oldest First</option>
      </select>
    </div>

    <div className="overflow-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b border-slate-200">
            {columns.map((col) => (
              <th key={col} className="px-4 py-2.5 font-semibold uppercase tracking-wide">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={columns.length} className="py-14 text-center text-slate-400">
              {emptyMessage}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

export default EmptyDataTableShell;
