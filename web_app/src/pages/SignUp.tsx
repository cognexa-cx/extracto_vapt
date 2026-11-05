// ============================================
// FILE: src/pages/SignUp.jsx
// ============================================
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import SignUpCard from "../components/signup/SignUpCard";
import LoginLogo from "../components/login/LoginLogo";

/**
 * SignUp Page - User Registration
 * After filling form and clicking Sign Up, opens OTP verification
 */
const SignUp = () => {
  const navigate = useNavigate();
  const { showNotification } = useAppContext();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    designation: "",
    baseLocation: "",
    status: "Active",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    console.log("🔍 SignUp attempt:", {
      ...formData,
      password: "***",
      confirmPassword: "***",
    });

    // Validate all fields
    if (
      !formData.name ||
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.designation ||
      !formData.baseLocation
    ) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showNotification("Please enter a valid email address", "error");
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      showNotification("Passwords do not match", "error");
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      showNotification("Password must be at least 6 characters long", "error");
      return;
    }

    try {
      setLoading(true);
      console.log("📤 Processing signup...");

      // Generate unique ID
      const userId = `USER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Prepare signup data
      const signupData = {
        id: userId,
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        designation: formData.designation,
        baseLocation: formData.baseLocation,
        status: formData.status,
        createdAt: new Date().toISOString(),
      };

      console.log("📋 Generated User ID:", userId);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Store user data temporarily (will be saved after OTP verification)
      localStorage.setItem("pendingUser", JSON.stringify(signupData));

      showNotification(
        "OTP sent! Please verify to complete registration",
        "success",
      );
      console.log("✅ Navigating to OTP verification");

      // Navigate to OTP verification with signup data
      navigate("/otp-verification", {
        state: {
          mobile: formData.email,
          fromSignup: true,
          userData: signupData,
        },
      });
    } catch (error) {
      console.error("❌ SignUp error:", error);
      showNotification(error.message || "SignUp failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    console.log("🔄 Navigating back to login");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl transition-all duration-500 ease-in-out">
        <LoginLogo />

        <SignUpCard
          formData={formData}
          onChange={handleChange}
          onSubmit={handleSignUp}
          onBackToLogin={handleBackToLogin}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default SignUp;
