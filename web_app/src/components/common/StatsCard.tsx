import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const StatsCard = ({
  label,
  value,
  icon: Icon,
  iconImage,
  color = "slate",
  trend,
  trendValue,
  isActive = false,
  onClick,
}) => {
  const colorConfig = {
    slate: {
      text: "text-slate-900",
      bg: "bg-slate-50",
      border: "border-slate-200",
      icon: "text-slate-600",
      gradient: "from-slate-500 to-slate-600",
      shadow: "shadow-slate-200",
      activeBorder: "border-slate-500",
      activeShadow: "shadow-slate-300",
      gradientColors: ["#334155", "#1e293b", "#0f172a"],
    },
    indigo: {
      text: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      icon: "text-indigo-600",
      gradient: "from-indigo-500 to-indigo-600",
      shadow: "shadow-indigo-200",
      activeBorder: "border-indigo-500",
      activeShadow: "shadow-indigo-300",
      gradientColors: ["#6366f1", "#818cf8", "#a5b4fc"],
    },
    emerald: {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: "text-emerald-600",
      gradient: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-200",
      activeBorder: "border-emerald-500",
      activeShadow: "shadow-emerald-300",
      gradientColors: ["#047857", "#065f46", "#064e3b"],
    },
    rose: {
      text: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-200",
      icon: "text-rose-600",
      gradient: "from-rose-500 to-rose-600",
      shadow: "shadow-rose-200",
      activeBorder: "border-rose-500",
      activeShadow: "shadow-rose-300",
      gradientColors: ["#be123c", "#9f1239", "#881337"],
    },
    amber: {
      text: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: "text-amber-600",
      gradient: "from-amber-500 to-amber-600",
      shadow: "shadow-amber-200",
      activeBorder: "border-amber-500",
      activeShadow: "shadow-amber-300",
      gradientColors: ["#b45309", "#92400e", "#78350f"],
    },
    blue: {
      text: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      gradient: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-200",
      activeBorder: "border-blue-500",
      activeShadow: "shadow-blue-300",
      gradientColors: ["#1d4ed8", "#1e40af", "#1e3a8a"],
    },
    cyan: {
      text: "text-cyan-600",
      bg: "bg-cyan-50",
      border: "border-cyan-200",
      icon: "text-cyan-600",
      gradient: "from-cyan-500 to-cyan-600",
      shadow: "shadow-cyan-200",
      activeBorder: "border-cyan-500",
      activeShadow: "shadow-cyan-300",
      gradientColors: ["#0e7490", "#155e75", "#164e63"],
    },
  };

  const theme = colorConfig[color] || colorConfig.slate;
  const isPositive = trend === "up";

  const renderColoredValue = () => {
    const valueStr = String(value ?? "0");
    const digits = valueStr.split("");

    return (
      <h3 className="text-4xl font-bold tracking-tight flex">
        {digits.map((digit, index) => {
          const colorIndex = index % theme.gradientColors.length;
          return (
            <span
              key={index}
              style={{ color: theme.gradientColors[colorIndex] }}
            >
              {digit}
            </span>
          );
        })}
      </h3>
    );
  };

  return (
    <div
      onClick={onClick}
      title={onClick ? "Click to filter table" : ""}
      className={`group relative bg-white rounded-2xl border-2 p-6 transition-all duration-300 overflow-hidden
        ${onClick ? "cursor-pointer" : ""}
        ${
          isActive
            ? `${theme.activeBorder} shadow-xl ${theme.activeShadow} scale-105 -translate-y-1`
            : `${theme.border} hover:shadow-xl hover:${theme.shadow} hover:border-slate-300 hover:-translate-y-1`
        }
      `}
    >
      {/* Background Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} transition-opacity duration-300 ${
          isActive ? "opacity-[0.08]" : "opacity-0 group-hover:opacity-[0.03]"
        }`}
      ></div>

      {/* Top Accent Line */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient} transition-opacity duration-300 ${
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      ></div>

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wide">
            {label}
          </p>
          <div className="flex items-baseline gap-3">
            {renderColoredValue()}
            {trend && trendValue && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  isPositive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {trendValue}
              </span>
            )}
          </div>
        </div>

        {/* Icon - PNG Image or Lucide Icon */}
        {(iconImage || Icon) && (
          <div>
            {iconImage ? (
              <img
                src={iconImage}
                alt={label}
                className="w-20 h-20 object-contain"
              />
            ) : typeof Icon === "function" ? (
              <div
                className={`${theme.bg} p-4 rounded-xl border ${theme.border} transition-all duration-300 ${
                  isActive
                    ? "scale-110 shadow-lg"
                    : "group-hover:scale-110 group-hover:shadow-lg"
                }`}
              >
                <Icon className={`w-6 h-6 ${theme.icon}`} strokeWidth={2} />
              </div>
            ) : (
              <div
                className={`${theme.bg} p-4 rounded-xl border ${theme.border} transition-all duration-300 ${
                  isActive
                    ? "scale-110 shadow-lg"
                    : "group-hover:scale-110 group-hover:shadow-lg"
                }`}
              >
                <span className={`text-xl font-bold ${theme.icon}`}>
                  {Icon}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
