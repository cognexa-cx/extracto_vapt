import React from "react";
import { motion } from "framer-motion";
import useCountUp from "../../hooks/useCountUp";
import { springs } from "../../utils/motionTheme";

const COLOR_MAP = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-600", ring: "ring-cyan-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-100" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", ring: "ring-rose-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", ring: "ring-purple-100" },
  slate: { bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-200" },
};

/**
 * KPI card with a count-up animation on the number — used across the top
 * of the Analytics page. `delay` (ms) staggers each card's spring entrance
 * so the row animates in left-to-right instead of all at once. Hover uses
 * the "snap" preset (motionTheme.js) for a crisp, physical lift.
 */
const StatCard = ({ icon: Icon, label, value, suffix = "", color = "blue", delay = 0 }) => {
  const animated = useCountUp(value);
  const palette = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...springs.ui, delay: delay / 1000 }}
      whileHover={{ y: -3, transition: springs.snap }}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${palette.bg} ${palette.text} ring-1 ${palette.ring}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900 tabular-nums">
        {animated.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-0.5 text-xs font-medium text-gray-500">{label}</p>
    </motion.div>
  );
};

export default StatCard;
