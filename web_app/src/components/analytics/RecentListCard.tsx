import React from "react";
import { motion } from "framer-motion";
import { Inbox } from "lucide-react";
import { springs } from "../../utils/motionTheme";

/**
 * Compact "recent activity" list card — same header treatment as
 * ChartCard, but a scrollable row list instead of a chart. `renderRow`
 * gets each item and returns the row's JSX (kept flexible since Documents
 * and Users need different columns/badges).
 */
const RecentListCard = ({ icon: Icon, title, subtitle, rows, renderRow, emptyLabel, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ ...springs.ui, delay: delay / 1000 }}
    whileHover={{ y: -2, transition: springs.snap }}
    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md"
  >
    <div className="mb-2 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={15} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900 leading-none">{title}</h3>
        {subtitle && <p className="mt-1 text-[11px] text-gray-400">{subtitle}</p>}
      </div>
    </div>

    {rows.length === 0 ? (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-300">
        <Inbox className="h-7 w-7" />
        <p className="text-xs font-medium text-slate-400">{emptyLabel}</p>
      </div>
    ) : (
      <div className="divide-y divide-slate-100">{rows.map(renderRow)}</div>
    )}
  </motion.div>
);

export default RecentListCard;
