// ============================================
// FILE: src/components/otp/OTPInput.jsx
// ============================================
import React, { useRef, useState, useEffect } from "react";

/**
 * OTP Input Component
 * Updated with larger boxes and better spacing for the wide card design.
 */
const OTPInput = ({ value, onChange, disabled }) => {
  const inputRefs = useRef([]);
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(""));

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  useEffect(() => {
    onChange(otpDigits.join(""));
  }, [otpDigits, onChange]);

  const handleChange = (index, digitValue) => {
    if (digitValue && !/^\d$/.test(digitValue)) return;

    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = digitValue;
    setOtpDigits(newOtpDigits);

    if (digitValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtpDigits = pastedData.split("");
    while (newOtpDigits.length < 6) {
      newOtpDigits.push("");
    }
    setOtpDigits(newOtpDigits.slice(0, 6));

    const lastFilledIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  return (
    <div className="w-full">
      {/* Increased gap from 3 to 4 or 6 to fill the wide card better */}
      <div className="flex justify-between sm:justify-center gap-4">
        {otpDigits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            // Increased size to w-16 h-20 and rounded-2xl to match the wide theme
            className="w-16 h-20 text-center text-3xl font-bold bg-[#F9FAFB] border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[#1E293B] shadow-sm"
            placeholder="0"
          />
        ))}
      </div>
    </div>
  );
};

export default OTPInput;
