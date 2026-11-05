import React from "react";
import StatsCard from "../common/StatsCard";

// Icon mapping based on stat label
const getIconForStat = (label) => {
  const labelUpper = label?.toUpperCase() || "";

  if (labelUpper.includes("TOTAL")) {
    return "/TotalEmployee.png";
  } else if (labelUpper.includes("INACTIVE")) {
    // ✅ Check INACTIVE first!
    return "/Inactiveuser.png";
  } else if (labelUpper.includes("ACTIVE")) {
    // ✅ Then check ACTIVE
    return "/Activeuser.png";
  } else if (labelUpper.includes("ADMIN")) {
    return "/Adminuser.png";
  } else if (labelUpper.includes("REGULAR") || labelUpper.includes("USER")) {
    return "/Regularuser.png";
  } else if (labelUpper.includes("LOCATION")) {
    return "/Location.png";
  }

  return "/TotalInvoice1.png"; // Default fallback
};

const UserManagementStats = ({ stats, loading = false }) => {
  if (!stats || stats.length === 0) {
    if (loading) {
      return (
        <div
          className="relative rounded-2xl overflow-hidden p-6"
          style={{
            backgroundImage: "url('/bg1.png')",
            backgroundSize: "100% 100%",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse overflow-hidden"
              >
                <div className="h-1 bg-slate-200"></div>
                <div className="p-6">
                  <div className="h-4 bg-slate-100 rounded w-20 mb-4"></div>
                  <div className="h-10 bg-slate-100 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden p-6"
      style={{
        backgroundImage: "url('/bg1.png')",
        backgroundSize: "100% 100%",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            {...stat}
            iconImage={getIconForStat(stat.label)}
          />
        ))}
      </div>
    </div>
  );
};

export default UserManagementStats;
