// ============================================
// FILE: src/components/otp/OTPCard.jsx
// ============================================
import React from "react";
import OTPInput from "./OTPInput";
import VerifyButton from "./VerifyButton";
import ChangeNumberLink from "./ChangeNumberLink";

/**
 * OTP Card Component - Updated for Wide Design
 * Matches the layout and scale of the Login card.
 */
const OTPCard = ({
  otp,
  setOtp,
  onSubmit,
  onChangeNumber,
  loading,
  mobileNumber,
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl shadow-blue-100 border border-[#CEE7F0] px-16 py-14 animate-slideUp">
      {/* Title and Subtitle consistent with Login style */}
      <div className="mb-10">
        <h1 className="text-4xl font-semibold text-[#1E3A46] mb-3">OTP</h1>
        <p className="text-[#64748B] text-lg">
          Enter OTP{" "}
          {mobileNumber && (
            <span className="text-cyan-600">sent to {mobileNumber}</span>
          )}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* OTP Input Field - Ensuring wide spacing inside */}
        <div className="w-full flex justify-center">
          <OTPInput value={otp} onChange={setOtp} disabled={loading} />
        </div>

        {/* Verify Button - Styled like the Proceed button */}
        <VerifyButton loading={loading} />

        {/* Change Number Link */}
        <div className="pt-2">
          <ChangeNumberLink onClick={onChangeNumber} disabled={loading} />
        </div>
      </form>
    </div>
  );
};

export default OTPCard;
