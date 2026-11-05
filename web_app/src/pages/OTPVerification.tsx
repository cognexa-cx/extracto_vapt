// ============================================
// FILE: src/pages/OTPVerification.jsx
// ============================================
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import OTPCard from "../components/otp/OTPCard";
import LoginLogo from "../components/login/LoginLogo";

/**
 * OTP Verification Page - Updated for Wide Design
 * Matches the aspect ratio and container of the Login page.
 * Now supports both login and signup flows
 */
const OTPVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useAppContext();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Get data from previous page (login or signup)
  const mobileNumber = location.state?.mobile || "";
  const fromSignup = location.state?.fromSignup || false;
  const userData = location.state?.userData || null;

  console.log("📱 OTP page loaded:", {
    mobile: mobileNumber,
    fromSignup,
    hasUserData: !!userData,
  });

  // Redirect to login if no mobile number
  useEffect(() => {
    if (!mobileNumber) {
      console.log("❌ No mobile number, redirecting to login");
      navigate("/login", { replace: true });
    }
  }, [mobileNumber, navigate]);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    console.log("🔍 Verifying OTP:", otp);

    // Check if OTP is exactly "123456"
    if (otp !== "123456") {
      showNotification("Please enter 123456 as OTP", "error");
      return;
    }

    try {
      setLoading(true);
      console.log("✅ OTP is correct...");

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (fromSignup) {
        // SignUp Flow - Save user and redirect to login
        console.log("📝 Completing signup registration...");

        if (userData) {
          // Here you would normally send userData to your backend
          // For now, we'll just log it
          console.log("💾 User registered:", { ...userData, password: "***" });

          // Remove pending user data
          localStorage.removeItem("pendingUser");
        }

        showNotification(
          "Account created successfully! Please login",
          "success",
        );
        console.log("🎉 Navigating to login page");

        // Navigate to login page after successful signup
        navigate("/login");
      } else {
        // Login Flow - Navigate to dashboard
        showNotification("Login successful!", "success");

        // Store auth token
        localStorage.setItem("authToken", "logged-in-123");
        console.log("🎉 Navigating to dashboard");

        // Navigate to dashboard
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("❌ Verification error:", error);
      showNotification(error.message || "Invalid OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    console.log("🔄 Changing phone number");

    if (fromSignup) {
      // If from signup, go back to signup page
      navigate("/signup");
    } else {
      // If from login, go back to login page
      navigate("/login");
    }
  };

  return (
    // Updated background to match Login.jsx (#F0F7FF)
    <div className="min-h-screen bg-[#F0F7FF] flex flex-col items-center justify-center p-6">
      {/* Increased max-width to 4xl to match the Login container exactly */}
      <div className="w-full max-w-4xl transition-all duration-500 ease-in-out">
        <LoginLogo />

        <OTPCard
          otp={otp}
          setOtp={setOtp}
          onSubmit={handleVerifyOTP}
          onChangeNumber={handleChangeNumber}
          loading={loading}
          mobileNumber={mobileNumber}
        />
      </div>
    </div>
  );
};

export default OTPVerification;
