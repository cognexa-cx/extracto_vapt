// ============================================
// FILE: src/components/otp/ChangeNumberLink.jsx
// ============================================
import React from "react";

/**
 * Change Number Link Component
 * Updated with better scaling for the wide layout.
 */
const ChangeNumberLink = ({ onClick, disabled }) => {
  return (
    <div className="text-center mt-4">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        // Increased text size to 'text-base' and added a subtle hover effect
        // to match the clean, professional look of the wide design.
        className="text-[#2B879E] hover:text-[#1E5F74] font-medium text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:underline underline-offset-4"
      >
        Change Phone Number
      </button>
    </div>
  );
};

export default ChangeNumberLink;
