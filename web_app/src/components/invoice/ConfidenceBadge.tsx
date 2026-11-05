import React from "react";
import { CheckCircle2, AlertTriangle, Edit3 } from "lucide-react";

/**
 * Clean & Minimalist Confidence Badge
 * High contrast, no fancy effects, professional.
 * Now includes MODIFIED state for edited fields
 */
const ConfidenceBadge = ({ confidence = "UNKNOWN", size = "md" }) => {
  const confidenceUpper = confidence.toUpperCase();

  let config;

  if (confidenceUpper === "HIGH") {
    config = {
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      label: "High",
    };
  } else if (confidenceUpper === "MODIFIED") {
    config = {
      icon: Edit3,
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      label: "Modified",
    };
  } else {
    config = {
      icon: AlertTriangle,
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      label: "Low",
    };
  }

  const sizes = {
    sm: {
      icon: "w-3 h-3",
      padding: "px-2 py-0.5",
      text: "text-[10px]",
      gap: "gap-1",
    },
    md: {
      icon: "w-3.5 h-3.5",
      padding: "px-2.5 py-1",
      text: "text-xs",
      gap: "gap-1.5",
    },
  };

  const s = sizes[size] || sizes.md;
  const Icon = config.icon;

  return (
    <div
      className={`
        inline-flex items-center rounded border font-bold uppercase tracking-tight
        ${s.padding} ${s.gap} ${config.bg} ${config.border} ${config.color}
      `}
    >
      <Icon className={s.icon} strokeWidth={2.5} />
      <span className={s.text}>{config.label}</span>
    </div>
  );
};

export default ConfidenceBadge;
