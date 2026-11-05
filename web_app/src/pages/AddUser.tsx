import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import userService from "../services/userService";
import {
  UserPlus,
  User,
  Mail,
  Phone,
  Lock,
  Briefcase,
  MapPin,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Shield,
  Info,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

// --- REUSABLE COMPONENTS ---

const FormInput = ({
  label,
  icon: Icon,
  type,
  name,
  value,
  onChange,
  placeholder,
  required,
  isPassword,
  showPassword,
  togglePassword,
  error,
  maxLength,
}: any) => {
  const isFilled = value && value.length > 0;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-800">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative group">
        <div
          className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors 
          ${error ? "text-red-500" : isFilled ? "text-teal-600" : "text-gray-400 group-focus-within:text-teal-600"}`}
        >
          <Icon size={16} strokeWidth={2} />
        </div>
        <input
          type={isPassword ? (showPassword ? "text" : "password") : type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          autoComplete="off"
          className={`w-full pl-10 pr-11 py-2.5 text-sm bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all
            ${error
              ? "border-red-300 ring-2 ring-red-100 bg-red-50/30"
              : isFilled
                ? "border-teal-300 ring-2 ring-teal-100"
                : "border-gray-200 focus:border-teal-500 focus:ring-teal-100"
            } 
            [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset]`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={togglePassword}
            className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors 
              ${error ? "text-red-500" : isFilled ? "text-teal-600" : "text-gray-400 hover:text-teal-600"}`}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 px-2.5 py-1.5 rounded-md border border-red-200">
          <AlertCircle size={14} />
          <span className="font-medium">{error}</span>
        </div>
      )}
    </div>
  );
};

const PasswordStrengthIndicator = ({ password }) => {
  const getStrength = () => {
    if (!password) return { level: 0, text: "", color: "" };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2)
      return {
        level: 1,
        text: "Weak",
        color: "bg-red-500",
        textColor: "text-red-600",
      };
    if (strength <= 3)
      return {
        level: 2,
        text: "Fair",
        color: "bg-yellow-500",
        textColor: "text-yellow-600",
      };
    if (strength <= 4)
      return {
        level: 3,
        text: "Good",
        color: "bg-teal-500",
        textColor: "text-teal-600",
      };
    return {
      level: 4,
      text: "Strong",
      color: "bg-green-500",
      textColor: "text-green-600",
    };
  };

  const strength = getStrength();

  if (!password) return null;

  return (
    <div className="mt-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600">
          Password Strength
        </span>
        <span className={`text-xs font-bold ${strength.textColor}`}>
          {strength.text}
        </span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${level <= strength.level ? strength.color : "bg-gray-200"
              }`}
          />
        ))}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const AddUser = () => {
  const navigate = useNavigate();
  const { showNotification } = useAppContext();

  const initialFormState = {
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    designation: "",
    baseLocation: "",
    empId: "",
    status: "Active",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isStatusFocused, setIsStatusFocused] = useState(false);

  // New State for API Result UI
  const [apiStatus, setApiStatus] = useState("idle"); // 'idle', 'success', 'error'
  const [apiError, setApiError] = useState("");

  const handleChange = (e: any) => {
    const { name, value } = e.target;

    if (name === "phone" && value !== "" && !/^\d+$/.test(value)) return;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username =
        "Username can only contain letters, numbers, and underscores";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!userService.validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!userService.validatePhone(formData.phone)) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else {
      const passwordValidation = userService.validatePassword(
        formData.password,
      );
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.message;
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.designation.trim()) {
      newErrors.designation = "Designation is required";
    }

    if (!formData.baseLocation.trim()) {
      newErrors.baseLocation = "Base location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = () => {
    setApiStatus("idle"); // Reset result view
    if (
      Object.values(formData).some(
        (value) => value !== "" && value !== "Active",
      ) &&
      !window.confirm("Are you sure you want to clear all fields?")
    ) {
      return;
    }

    setFormData(initialFormState);
    setErrors({});
    setIsStatusFocused(false);
    showNotification("Form fields cleared", "info");
  };

  const validateAndOpenModal = (e: any) => {
    e.preventDefault();

    if (validateForm()) {
      setShowModal(true);
    } else {
      showNotification("Please fix errors in form", "error");
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.querySelector<HTMLElement>(`[name="${firstErrorField}"]`);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
        element?.focus();
      }
    }
  };

  const handleConfirmCreate = async () => {
    setShowModal(false);
    setLoading(true);
    setApiStatus("idle"); // Reset previous status

    try {
      const userData = userService.formatUserData(formData);
      const response = await userService.registerUser(userData);

      if (response.success) {
        // Show Success State after 2 seconds
        setTimeout(() => {
          showNotification(
            response.message || "User created successfully!",
            "success",
          );
          setApiStatus("success");
          setLoading(false);
          setApiError("");
        }, 2000);
      }
    } catch (error) {
      console.error("User creation error:", error);

      const errorMessage = error.message || "Failed to create user";

      // Show Error State after 2 seconds
      setTimeout(() => {
        showNotification(errorMessage, "error");
        setApiStatus("error");
        setApiError(errorMessage);
        setLoading(false);
      }, 2000);
    }
  };

  const handleRetry = () => {
    setApiStatus("idle");
    setApiError("");
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-5">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
            <UserPlus size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-none">
              Add New User
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Create a new user account with secure credentials
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* LOADING SPINNER VIEW (2 Seconds) */}
        {loading && apiStatus === "idle" && (
          <div className="p-12 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm font-semibold text-gray-500">
                Creating user...
              </p>
            </div>
          </div>
        )}

        {/* SUCCESS STATE CARD */}
        {apiStatus === "success" && (
          <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 animate-bounce-short">
              <CheckCircle size={40} strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              User Created Successfully
            </h3>
            <p className="text-gray-500 mb-8 max-w-sm">
              The account for{" "}
              <span className="font-bold text-gray-900"> {formData.name}</span>{" "}
              has been created and is now active.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md transition-all"
            >
              Go to Dashboard
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ERROR STATE CARD */}
        {apiStatus === "error" && (
          <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-6">
              <AlertCircle size={40} strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Failed to Create User
            </h3>
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-sm mb-8 max-w-sm">
              {apiError}
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-lg shadow-sm transition-all"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
          </div>
        )}

        {/* FORM STATE (Default) */}
        {apiStatus === "idle" && !loading && (
          <form onSubmit={validateAndOpenModal}>
            {/* Personal Information Section */}
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <User className="w-4 h-4" strokeWidth={2} />
                Personal Information
              </h3>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormInput
                  label="Full Name"
                  icon={User}
                  name="name"
                  type="text"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  required
                />

                <FormInput
                  label="Username"
                  icon={User}
                  name="username"
                  type="text"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={handleChange}
                  error={errors.username}
                  required
                />

                <FormInput
                  label="Email Address"
                  icon={Mail}
                  name="email"
                  type="email"
                  placeholder="user@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                />

                <FormInput
                  label="Phone Number"
                  icon={Phone}
                  name="phone"
                  type="text"
                  maxLength="10"
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={handleChange}
                  error={errors.phone}
                  required
                />
              </div>
            </div>

            {/* Security Section */}
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Shield className="w-4 h-4" strokeWidth={2} />
                Security Settings
              </h3>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <FormInput
                    label="Password"
                    icon={Lock}
                    name="password"
                    isPassword
                    showPassword={showPassword}
                    togglePassword={() => setShowPassword(!showPassword)}
                    placeholder="Create strong password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    required
                  />
                  <PasswordStrengthIndicator password={formData.password} />
                </div>

                <FormInput
                  label="Confirm Password"
                  icon={Lock}
                  name="confirmPassword"
                  isPassword
                  showPassword={showConfirmPassword}
                  togglePassword={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  required
                />
              </div>

              <div className="mt-3 p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <span className="font-semibold">
                      Password must contain:
                    </span>{" "}
                    At least 8 characters, uppercase & lowercase letters,
                    numbers, and special characters
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Details Section */}
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Briefcase className="w-4 h-4" strokeWidth={2} />
                Professional Details
              </h3>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormInput
                  label="Designation"
                  icon={Briefcase}
                  name="designation"
                  type="text"
                  placeholder="e.g., Manager, Developer"
                  value={formData.designation}
                  onChange={handleChange}
                  error={errors.designation}
                  required
                />

                <FormInput
                  label="Base Location"
                  icon={MapPin}
                  name="baseLocation"
                  type="text"
                  placeholder="e.g., Mumbai, India"
                  value={formData.baseLocation}
                  onChange={handleChange}
                  error={errors.baseLocation}
                  required
                />

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Account Status
                  </label>
                  <div className="relative">
                    <select
                      name="status"
                      value={formData.status}
                      onFocus={() => setIsStatusFocused(true)}
                      onBlur={() => setIsStatusFocused(false)}
                      onChange={handleChange}
                      className={`w-full appearance-none px-4 py-2.5 text-sm bg-white border rounded-lg text-gray-900 focus:outline-none focus:ring-2 transition-all cursor-pointer
                        ${isStatusFocused
                          ? "border-teal-500 ring-2 ring-teal-100"
                          : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    <div
                      className={`absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none transition-colors ${isStatusFocused ? "text-teal-600" : "text-gray-400"}`}
                    >
                      <ChevronDown size={16} strokeWidth={2} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-2 text-sm text-gray-700 font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={16} />
                  Reset Form
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white text-sm font-bold rounded-lg shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating User...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Create User Account
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div
              className="shrink-0 bg-gradient-to-r from-gray-100 to-gray-200
             px-6 py-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <UserPlus
                    className="text-slate-800"
                    size={24}
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    Confirm User Creation
                  </h3>
                  <p className="text-sm text-slate-800 mt-0.5">
                    Review details before creating
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">
                You are about to create a new user account for:
              </p>

              {/* User Details Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3 border border-gray-200">
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Name
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formData.name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Username
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formData.username}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Email
                  </span>
                  <span className="text-sm font-bold text-gray-900 truncate ml-2">
                    {formData.email}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Phone
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formData.phone}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Designation
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formData.designation}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-600">
                    Location
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formData.baseLocation}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmCreate}
                  className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold py-3 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Confirm & Create Account
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition-all"
                >
                  Go Back to Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddUser;
