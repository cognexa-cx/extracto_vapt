import React from "react";

/**
 * Shared page header — icon + title + subtitle on the left, arbitrary
 * actions (search, buttons, etc.) on the right. Matches User Master's
 * header exactly so every page under the sidebar looks/feels consistent.
 */
const PageHeader = ({ icon: Icon, title, subtitle, children }: any) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-none">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      )}
    </div>
  </div>
);

export default PageHeader;
