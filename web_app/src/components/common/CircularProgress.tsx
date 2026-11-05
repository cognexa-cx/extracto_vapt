import React from "react";

const CircularProgress = ({
  percentage = 0,
  size = 40,
  strokeWidth = 4,
  color = null,
  hideText = false,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  // Auto color-coding based on percentage
  const getDynamicColor = (percent) => {
    if (percent >= 91) return "#10b981"; // Green (>90%)
    if (percent >= 80) return "#f59e0b"; // Amber (80-90%)
    return "#ef4444"; // Red (<80%)
  };

  const finalColor = color || getDynamicColor(percentage);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={finalColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* Percentage text */}
      {!hideText && (
        <span
          className="absolute font-bold leading-none select-none"
          style={{
            color: finalColor,
            fontSize: `${size * 0.3}px`,
          }}
        >
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};

export default CircularProgress;
