// ============================================
// FILE: src/components/otp/VerifyButton.jsx
// ============================================
import React from "react";

/**
 * Verify Button Component
 * Updated with the specific brand gradient and wide-layout proportions.
 */
const VerifyButton = ({ loading }) => {
  return (
    <button
      type="submit"
      disabled={loading}
      // Matching the LoginButton gradient (#2B879E to #1E5F74) and scale
      className="w-full bg-gradient-to-r from-[#2B879E] to-[#1E5F74] hover:from-[#247589] hover:to-[#174d5e] text-white font-medium py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xl flex items-center justify-center"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Verifying...
        </span>
      ) : (
        "Verify OTP"
      )}
    </button>
  );
};

export default VerifyButton;
