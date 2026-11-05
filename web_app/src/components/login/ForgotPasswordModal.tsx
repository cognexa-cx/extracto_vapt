import React, { useState } from "react";

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // UI Feedback State (Replaces alert())
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    // Allow only numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Send OTP to email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });

    if (!email) {
      setFeedback({ type: "error", message: "Please enter your email" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFeedback({
        type: "error",
        message: "Please enter a valid email address",
      });
      return;
    }

    try {
      setLoading(true);
      console.log("📧 Sending OTP to:", email);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setFeedback({ type: "success", message: "OTP sent to your email!" });
      setStep(2);
    } catch (error) {
      console.error("Error sending OTP:", error);
      setFeedback({
        type: "error",
        message: "Failed to send OTP. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });

    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setFeedback({
        type: "error",
        message: "Please enter the complete 6-digit code",
      });
      return;
    }

    // Demo OTP check
    if (otpValue !== "123456") {
      setFeedback({
        type: "error",
        message: "Invalid OTP. Use 123456 for demo.",
      });
      return;
    }

    try {
      setLoading(true);
      console.log("🔐 Verifying OTP:", otpValue);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setFeedback({ type: "success", message: "OTP verified!" });
      setStep(3);
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setFeedback({
        type: "error",
        message: "Failed to verify OTP. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });

    if (!newPassword || !confirmPassword) {
      setFeedback({ type: "error", message: "Please fill all fields" });
      return;
    }

    if (newPassword.length < 6) {
      setFeedback({
        type: "error",
        message: "Password must be at least 6 characters",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", message: "Passwords do not match" });
      return;
    }

    try {
      setLoading(true);
      console.log("🔑 Resetting password...");

      await new Promise((resolve) => setTimeout(resolve, 1500));

      setFeedback({ type: "success", message: "Password reset successful!" });

      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error) {
      console.error("Error resetting password:", error);
      setFeedback({
        type: "error",
        message: "Failed to reset password. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Close modal and reset
  const handleClose = () => {
    setStep(1);
    setEmail("");
    setOtp(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
    setLoading(false);
    setFeedback({ type: "", message: "" });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[400px] p-6 sm:p-8 relative animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2"
          disabled={loading}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Feedback Message (Replaces alert) */}
        {feedback.message && (
          <div
            className={`mb-6 p-3 rounded-lg text-sm text-center ${
              feedback.type === "error"
                ? "bg-red-50 text-red-600 border border-red-100"
                : "bg-green-50 text-green-600 border border-green-100"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Step 1: Email */}
        {step === 1 && (
          <div className="animate-slideUp">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1E3A46] mb-2">
              Forgot Password?
            </h2>
            <p className="text-[#64748B] mb-6 text-sm sm:text-base">
              Enter your email to receive a reset code.
            </p>

            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#1E3A46] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#1E3A46] placeholder-[#94A3B8] focus:outline-none focus:border-cyan-500 focus:bg-white transition-all disabled:opacity-50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <div className="animate-slideUp">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1E3A46] mb-2">
              Verify OTP
            </h2>
            <p className="text-[#64748B] mb-6 text-sm">
              Enter the code sent to{" "}
              <span className="font-semibold text-[#1E3A46]">{email}</span>
            </p>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-between gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    disabled={loading}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#1E3A46] focus:outline-none focus:border-cyan-500 focus:bg-white transition-all disabled:opacity-50"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="w-full text-cyan-600 hover:text-cyan-700 font-medium transition-colors disabled:opacity-50 text-sm"
              >
                Change Email Address
              </button>
            </form>
          </div>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <div className="animate-slideUp">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1E3A46] mb-2">
              Reset Password
            </h2>
            <p className="text-[#64748B] mb-6 text-sm">
              Create a new secure password
            </p>

            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#1E3A46] mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#1E3A46] placeholder-[#94A3B8] focus:outline-none focus:border-cyan-500 focus:bg-white transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E3A46] mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#1E3A46] placeholder-[#94A3B8] focus:outline-none focus:border-cyan-500 focus:bg-white transition-all disabled:opacity-50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
