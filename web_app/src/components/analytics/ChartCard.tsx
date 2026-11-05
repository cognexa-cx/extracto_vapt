import React from "react";
import { motion } from "framer-motion";
import { springs } from "../../utils/motionTheme";

/**
 * Consistent card shell for every chart on the Analytics page — icon +
 * title (+ optional subtitle) header, fixed-height chart body below.
 * Springs in on mount ("ui" preset) and gives a subtle physical lift on
 * hover ("snap" preset) — see utils/motionTheme.js for the shared presets.
 */
const ChartCard = ({ icon: Icon, title, subtitle, children, height = 260, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 16, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ ...springs.ui, delay: delay / 1000 }}
    whileHover={{ y: -2, transition: springs.snap }}
    className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md ${className}`}
  >
    <div className="mb-2 flex items-center gap-2.5">
      {Icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon size={15} />
        </div>
      )}
      <div>
        <h3 className="text-sm font-bold text-gray-900 leading-none">{title}</h3>
        {subtitle && <p className="mt-1 text-[11px] text-gray-400">{subtitle}</p>}
      </div>
    </div>
    <div style={{ height }}>{children}</div>
  </motion.div>
);

export default ChartCard;
