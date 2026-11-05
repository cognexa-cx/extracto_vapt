// ============================================
// FILE: src/components/signup/SignUpCard.jsx
// ============================================
import React from "react";
import SignUpButton from "./SignUpButton";

const SignUpCard = ({
  formData,
  onChange,
  onSubmit,
  onBackToLogin,
  loading,
}) => {
  console.log("🎨 SignUpCard rendered with formData:", formData);

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl shadow-blue-100 border border-[#CEE7F0] px-12 py-10 animate-slideUp">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#1E3A46] mb-2">Sign Up</h1>
        <p className="text-[#64748B] text-base">Create Your Account</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Row 1: Name and Username */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="w-full">
            <label className="block text-sm font-medium text-[#1E3A46] mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onChange}
              placeholder="Enter full name"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#1E3A46] placeholder-[#94A3B8] focus:outline-none focus:border-cyan-500 focus:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              required
            />
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-[#1E3A46] mb-1.5">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={onChange}
              placeholder="Enter username"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#1E3A46] placeholder-[#94A3B8] focus:outline-none focus:border-cyan-500 focus:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              required
            />
          </div>
        </div>

        {/* Row 2: Email */}
        <div className="w-full">
          <label className="block text-sm font-medium text-[#1E3A46] mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={onChange}
            placeholder="Enter email address"
            disabled={loading}
            className="w-full px-4 py-3 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#1E3A46] placeholder-[#94A3B8] focus:outline-none focus:border-cyan-500 focus:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            required
          />
        </div>

        {/* Row 3: Password and Confirm Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="w-full">
            <label className="block text-sm font-medium text-[#1E3A46] mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={onChange}
              placeholder="Enter password"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#1E3A46] placeholder-[#94A3B8] focus:outline-none focus:border-cyan-500 focus:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              required
            />
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-[#1E3A46] mb-1.5">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={onChange}
              placeholder="Confirm password"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#1E3A46] placeholder-[#94A3B8] focus:outline-none focus:border-cyan-500 focus:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              required
            />
          </div>
        </div>

        {/* Row 4: Designation and Base Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="w-full">
            <label className="block text-sm font-medium text-[#1E3A46] mb-1.5">
              Designation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={onChange}
              placeholder="Enter designation"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#1E3A46] placeholder-[#94A3B8] focus:outline-none focus:border-cyan-500 focus:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              required
            />
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-[#1E3A46] mb-1.5">
              Base Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="baseLocation"
              value={formData.baseLocation}
              onChange={onChange}
              placeholder="Enter base location"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#1E3A46] placeholder-[#94A3B8] focus:outline-none focus:border-cyan-500 focus:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              required
            />
          </div>
        </div>

        {/* Row 5: Status */}
        <div className="w-full">
          <label className="block text-sm font-medium text-[#1E3A46] mb-1.5">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={onChange}
            disabled={loading}
            className="w-full px-4 py-3 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#1E3A46] focus:outline-none focus:border-cyan-500 focus:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Submit Button */}
        <div className="pt-1">
          <SignUpButton loading={loading} />
        </div>

        {/* Back to Login Link */}
        <p className="text-center text-sm text-[#94A3B8] mt-4">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onBackToLogin}
            className="text-cyan-600 hover:text-cyan-700 hover:underline transition-all font-medium"
            disabled={loading}
          >
            Login here
          </button>
        </p>

        <p className="text-center text-sm text-[#94A3B8] mt-3">
          By signing up, you agree to our{" "}
          <a
            href="#"
            className="text-cyan-600 hover:text-cyan-700 transition-colors"
          >
            Terms of Service
          </a>
        </p>
      </form>
    </div>
  );
};

export default SignUpCard;
